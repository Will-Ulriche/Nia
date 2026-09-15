import { getDb } from './local/db';
import { DeviceService } from './device.service';

export interface AuditLog {
  id: string;
  school_id: string;
  user_id: string;
  device_id: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  details?: Record<string, any>;
  created_at: string;
}

export class AuditService {
  /**
   * Enregistre une action sensible dans le journal d'audit local,
   * et l'ajoute à la file d'attente des mutations pour l'envoyer à Supabase.
   */
  static async logAction(params: {
    schoolId: string | null;
    userId: string | undefined;
    action: string;
    entityType?: string;
    entityId?: string;
    details?: Record<string, any>;
  }) {
    if (!params.schoolId || !params.userId) return; // Impossible d'auditer sans contexte

    try {
      const db = await getDb();
      const deviceId = await DeviceService.getDeviceId();
      const id = crypto.randomUUID();
      const createdAt = new Date().toISOString();
      const detailsStr = params.details ? JSON.stringify(params.details) : null;

      // 1. Insérer dans la table d'audit locale (pour le buffering hors-ligne)
      await db.execute(
        `INSERT INTO audit_logs (id, school_id, user_id, device_id, action, entity_type, entity_id, details, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          id,
          params.schoolId,
          params.userId,
          deviceId,
          params.action,
          params.entityType ?? null,
          params.entityId ?? null,
          detailsStr,
          createdAt,
        ]
      );

      // 2. Ajouter la mutation pour l'envoi vers Supabase
      const payload: Record<string, any> = {
        id,
        school_id: params.schoolId,
        user_id: params.userId,
        device_id: deviceId,
        action: params.action,
        entity_type: params.entityType ?? null,
        entity_id: params.entityId ?? null,
        details: params.details ?? null,
        created_at: createdAt,
      };

      const mutationId = crypto.randomUUID();
      await db.execute(
        `INSERT INTO mutations_queue (id, table_name, operation, payload, created_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          mutationId,
          'audit_logs',
          'INSERT',
          JSON.stringify(payload),
          createdAt,
        ]
      );

      console.debug(`[Audit] Logged action: ${params.action}`);
    } catch (e) {
      console.error('[Audit] Failed to log action:', e);
    }
  }

  /**
   * (Optionnel) Purge les logs locaux qui ont déjà été synchronisés,
   * pour éviter que la base locale ne grossisse indéfiniment, puisque
   * ces logs ne sont consultés qu'en ligne depuis le Supabase.
   */
  static async purgeLocalLogs() {
    try {
      const db = await getDb();
      // On supprime les logs d'audit qui n'ont pas de mutation en attente (ie. ils ont été synchronisés avec succès)
      await db.execute(`
        DELETE FROM audit_logs 
        WHERE id NOT IN (
          SELECT json_extract(payload, '$.id') FROM mutations_queue WHERE table_name = 'audit_logs'
        )
      `);
    } catch (e) {
      console.error('[Audit] Failed to purge local logs:', e);
    }
  }
}
