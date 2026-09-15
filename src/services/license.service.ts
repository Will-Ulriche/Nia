import { supabase } from './supabase';
import { getDb } from './local/db';
import { DeviceService } from './device.service';
import { AuditService } from './audit.service';
import type { License } from '../types/database';

export type LicenseStatus = 'active' | 'expired' | 'cancelled' | 'pending' | 'none';

export interface LicenseState {
  status: LicenseStatus;
  valid: boolean;
  expiresAt: string | null;
  licenseKey: string | null;
  lastCheckedAt: string | null;
  offline: boolean;
  message: string;
}

export interface LicenseAdminRow extends License {
  school_name?: string;
}

interface LicenseCacheRow {
  school_id: string;
  license_key: string | null;
  status: string;
  activated_at: string | null;
  expires_at: string | null;
  max_devices: number | null;
  last_checked_at: string | null;
}

export interface CreateLicensePayload {
  schoolId: string;
  months: number;
  maxDevices: number;
  notes?: string;
}

/**
 * Service de licence (Phase 28 - Activation & licence).
 *
 * - La validation se fait côté serveur (table Supabase `licenses`).
 * - Le résultat est mis en cache localement (`license_cache`) pour permettre
 *   un fonctionnement hors ligne entre deux validations.
 * - Les méthodes Admin permettent au super_admin de créer, étendre ou révoquer
 *   les licences des établissements.
 */
export class LicenseService {
  // ---------------------------------------------------------------------------
  // Clés de licence
  // ---------------------------------------------------------------------------

  /**
   * Génère une clé de licence lisible : KEM-XXXX-XXXX-XXXX-XXXX.
   */
  static generateKey(): string {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // pas de I/O/0/1, lisible
    const groups: string[] = [];
    for (let g = 0; g < 4; g++) {
      let chunk = '';
      const bytes = new Uint8Array(4);
      crypto.getRandomValues(bytes);
      for (let i = 0; i < 4; i++) chunk += alphabet[bytes[i] % alphabet.length];
      groups.push(chunk);
    }
    return `KEM-${groups.join('-')}`;
  }

  // ---------------------------------------------------------------------------
  // Cache local
  // ---------------------------------------------------------------------------

  /**
   * Lit le cache local de licence pour l'établissement.
   */
  static async getLocal(schoolId: string): Promise<LicenseState | null> {
    try {
      const db = await getDb();
      const rows = await db.select<LicenseCacheRow[]>(
        `SELECT school_id, license_key, status, activated_at, expires_at, max_devices, last_checked_at
         FROM license_cache WHERE school_id = $1`,
        [schoolId]
      );
      if (rows.length === 0) return null;

      const row = rows[0];
      const isDateExpired = row.expires_at ? new Date(row.expires_at).getTime() < Date.now() : false;
      return {
        status: (row.status as LicenseStatus) || 'none',
        valid: row.status === 'active' && !isDateExpired,
        expiresAt: row.expires_at ?? null,
        licenseKey: row.license_key ?? null,
        lastCheckedAt: row.last_checked_at ?? null,
        offline: true,
        message: isDateExpired ? 'La licence est expirée.' : 'Licence validée hors ligne (cache local).',
      };
    } catch (e) {
      console.error('[License] Failed to read local cache:', e);
      return null;
    }
  }

  private static async _writeCache(params: {
    schoolId: string;
    licenseKey: string | null;
    status: LicenseStatus;
    activatedAt: string | null;
    expiresAt: string | null;
    maxDevices: number | null;
    lastCheckedAt: string;
  }): Promise<void> {
    try {
      const db = await getDb();
      await db.execute(
        `INSERT OR REPLACE INTO license_cache
           (school_id, license_key, status, activated_at, expires_at, max_devices, last_checked_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          params.schoolId,
          params.licenseKey,
          params.status,
          params.activatedAt,
          params.expiresAt,
          params.maxDevices,
          params.lastCheckedAt,
        ]
      );
    } catch (e) {
      console.error('[License] Failed to update local cache:', e);
    }
  }

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------

  /**
   * Valide la licence d'un établissement.
   * - En ligne : interroge le serveur, met à jour le cache local et retourne l'état.
   * - Hors ligne : utilise le cache local (avec contrôle d'expiration).
   */
  static async validate(schoolId: string): Promise<LicenseState> {
    if (!navigator.onLine) {
      const cached = await this.getLocal(schoolId);
      if (!cached) {
        return {
          status: 'none',
          valid: false,
          expiresAt: null,
          licenseKey: null,
          lastCheckedAt: null,
          offline: true,
          message: 'Hors ligne : aucune licence en cache. Connectez-vous pour activer l\'application.',
        };
      }
      return cached;
    }

    try {
      const { data, error } = await supabase
        .from('licenses')
        .select('*')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      const now = Date.now();
      const license = data && data.length > 0 ? data[0] : null;
      let state: LicenseState;

      if (!license) {
        state = {
          status: 'none',
          valid: false,
          expiresAt: null,
          licenseKey: null,
          lastCheckedAt: new Date().toISOString(),
          offline: false,
          message: 'Aucune licence associée à cet établissement. Contactez le super administrateur.',
        };
      } else {
        const base: LicenseState = {
          status: 'active',
          valid: true,
          expiresAt: license.valid_until ?? null,
          licenseKey: license.license_key,
          lastCheckedAt: new Date().toISOString(),
          offline: false,
          message: 'Licence active.',
        };

        if (license.status === 'cancelled') {
          state = { ...base, status: 'cancelled', valid: false, message: 'La licence a été révoquée par l\'administrateur.' };
        } else if (license.status === 'pending') {
          state = { ...base, status: 'pending', valid: false, message: 'La licence est en attente d\'activation.' };
        } else {
          const validFrom = license.valid_from ? new Date(license.valid_from).getTime() : -Infinity;
          const validUntil = license.valid_until ? new Date(license.valid_until).getTime() : Infinity;
          if (now < validFrom) {
            state = { ...base, status: 'pending', valid: false, message: 'La licence n\'est pas encore active.' };
          } else if (now > validUntil) {
            state = { ...base, status: 'expired', valid: false, message: 'La licence a expiré. Contactez le super administrateur.' };
          } else {
            state = { ...base, status: 'active', valid: true, message: 'Licence active.' };
          }
        }
      }

      // Met à jour le cache local (l'état reflète l'ancien cache sinon)
      await this._writeCache({
        schoolId,
        licenseKey: license?.license_key ?? null,
        status: state.status,
        activatedAt: license?.valid_from ?? null,
        expiresAt: state.expiresAt,
        maxDevices: license?.max_devices ?? null,
        lastCheckedAt: state.lastCheckedAt ?? new Date().toISOString(),
      });

      return state;
    } catch (e) {
      console.error('[License] Server validation failed, falling back to cache:', e);
      const cached = await this.getLocal(schoolId);
      if (cached) {
        return { ...cached, message: `${cached.message} (validation serveur impossible)` };
      }
      return {
        status: 'none',
        valid: false,
        expiresAt: null,
        licenseKey: null,
        lastCheckedAt: null,
        offline: true,
        message: 'Impossible de contacter le serveur. Réessayez plus tard.',
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Activation
  // ---------------------------------------------------------------------------

  /**
   * Active l'application pour un établissement en validant la clé de licence
   * saisie par l'utilisateur (validation serveur uniquement).
   */
  static async activate(
    schoolId: string,
    licenseKey: string,
    userId?: string
  ): Promise<{ ok: boolean; error?: string; state?: LicenseState }> {
    if (!navigator.onLine) {
      return { ok: false, error: 'Hors ligne : l\'activation nécessite une connexion internet.' };
    }

    const key = licenseKey.trim().toUpperCase();
    if (!key) return { ok: false, error: 'Veuillez saisir la clé de licence.' };

    try {
      if (await DeviceService.isRevoked()) {
        return { ok: false, error: 'Cet appareil a été révoqué. L\'activation est impossible.' };
      }

      const { data, error } = await supabase
        .from('licenses')
        .select('*')
        .eq('license_key', key)
        .eq('school_id', schoolId)
        .eq('status', 'active')
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        return { ok: false, error: 'Clé de licence invalide pour cet établissement.' };
      }

      const now = Date.now();
      const validFrom = data.valid_from ? new Date(data.valid_from).getTime() : -Infinity;
      const validUntil = data.valid_until ? new Date(data.valid_until).getTime() : Infinity;

      if (now < validFrom) {
        return { ok: false, error: `La licence n'est pas encore active (débute le ${new Date(data.valid_from).toLocaleDateString('fr-FR')}).` };
      }
      if (now > validUntil) {
        return { ok: false, error: 'Cette licence a expiré. Contactez le super administrateur.' };
      }

      // Activation réussie : écrit le cache local + journal d'audit
      const nowIso = new Date().toISOString();
      await this._writeCache({
        schoolId,
        licenseKey: data.license_key,
        status: 'active',
        activatedAt: data.valid_from ?? nowIso,
        expiresAt: data.valid_until,
        maxDevices: data.max_devices,
        lastCheckedAt: nowIso,
      });

      const state: LicenseState = {
        status: 'active',
        valid: true,
        expiresAt: data.valid_until,
        licenseKey: data.license_key,
        lastCheckedAt: nowIso,
        offline: false,
        message: 'Licence activée avec succès.',
      };

      if (userId) {
        await AuditService.logAction({
          schoolId,
          userId,
          action: 'LICENSE_ACTIVATE',
          entityType: 'license',
          entityId: data.id,
          details: { license_key: data.license_key, valid_until: data.valid_until },
        });
      }

      return { ok: true, state };
    } catch (err: any) {
      console.error('[License] Activation failed:', err);
      return { ok: false, error: err.message || 'Erreur lors de l\'activation de la licence.' };
    }
  }

  // ---------------------------------------------------------------------------
  // Gestion admin (Super Admin)
  // ---------------------------------------------------------------------------

  /**
   * Liste toutes les licences avec le nom de l'établissement.
   */
  static async listLicenses(): Promise<LicenseAdminRow[]> {
    const { data, error } = await supabase
      .from('licenses')
      .select('*, schools(name)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map((row: any) => ({
      ...row,
      school_name: row.schools?.name ?? null,
      schools: undefined,
    }));
  }

  /**
   * Crée une licence active pour un établissement.
   */
  static async createLicense(payload: CreateLicensePayload): Promise<License> {
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setMonth(expiresAt.getMonth() + payload.months);

    const { data, error } = await supabase
      .from('licenses')
      .insert({
        school_id: payload.schoolId,
        license_key: this.generateKey(),
        status: 'active',
        valid_from: now.toISOString(),
        valid_until: expiresAt.toISOString(),
        max_devices: payload.maxDevices,
        notes: payload.notes || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data as License;
  }

  /**
   * Prolonge la validité d'une licence de X mois (à partir de sa fin actuelle,
   * ou de maintenant si elle est déjà expirée).
   */
  static async extendLicense(id: string, months: number): Promise<License> {
    const { data: current } = await supabase.from('licenses').select('*').eq('id', id).single();
    if (!current) throw new Error('Licence introuvable.');

    const base = current.valid_until && new Date(current.valid_until).getTime() > Date.now()
      ? new Date(current.valid_until)
      : new Date();
    base.setMonth(base.getMonth() + months);

    const { data, error } = await supabase
      .from('licenses')
      .update({ valid_until: base.toISOString(), status: 'active', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as License;
  }

  /**
   * Révoque une licence (status → cancelled).
   */
  static async revokeLicense(id: string): Promise<License> {
    const { data, error } = await supabase
      .from('licenses')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as License;
  }

  /**
   * Réactive une licence suspendue.
   */
  static async reactivateLicense(id: string): Promise<License> {
    const { data, error } = await supabase
      .from('licenses')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as License;
  }
}