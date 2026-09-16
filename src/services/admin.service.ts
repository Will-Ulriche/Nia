import { supabase } from './supabase';
import type { School, SchoolModule, SchoolDevice, AuditLog, SchoolSetting } from '../types/database';
import type {
  CreateSchoolPayload,
  UpdateSchoolPayload,
  SchoolWithModules,
  AdminStats,
  ModuleName,
} from '../types/app';

/**
 * Service réservé au Super Admin.
 * Toutes les opérations ici nécessitent le rôle 'super_admin' (enforced par RLS côté Supabase).
 */
export const AdminService = {

  // ---------------------------------------------------------------------------
  // Établissements
  // ---------------------------------------------------------------------------

  /**
   * Créer un nouvel établissement.
   */
  async createSchool(payload: CreateSchoolPayload): Promise<School> {
    const { data, error } = await supabase
      .from('schools')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data as School;
  },

  /**
   * Lister tous les établissements (Super Admin uniquement via RLS).
   */
  async listSchools(): Promise<School[]> {
    const { data, error } = await supabase
      .from('schools')
      .select('*')
      .is('deleted_at', null)
      .order('name');
    if (error) throw error;
    return data as School[];
  },

  /**
   * Récupérer un établissement avec ses modules actifs.
   */
  async getSchoolWithModules(schoolId: string): Promise<SchoolWithModules> {
    const { data: school, error: schoolError } = await supabase
      .from('schools')
      .select('*')
      .eq('id', schoolId)
      .single();
    if (schoolError) throw schoolError;

    const { data: modules, error: modulesError } = await supabase
      .from('school_modules')
      .select('*')
      .eq('school_id', schoolId)
      .is('deleted_at', null);
    if (modulesError) throw modulesError;

    return { ...(school as School), modules: modules as SchoolModule[] };
  },

  /**
   * Modifier un établissement.
   */
  async updateSchool(schoolId: string, payload: UpdateSchoolPayload): Promise<School> {
    const { data, error } = await supabase
      .from('schools')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', schoolId)
      .select()
      .single();
    if (error) throw error;
    return data as School;
  },

  /**
   * Supprimer un établissement (Soft delete).
   */
  async deleteSchool(schoolId: string): Promise<void> {
    const { error } = await supabase
      .from('schools')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', schoolId);
    if (error) throw error;
  },

  /**
   * Activer ou désactiver un établissement.
   */
  async toggleSchoolStatus(schoolId: string, isActive: boolean): Promise<School> {
    const { data, error } = await supabase
      .from('schools')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', schoolId)
      .select()
      .single();
    if (error) throw error;
    return data as School;
  },

  // ---------------------------------------------------------------------------
  // Modules
  // ---------------------------------------------------------------------------

  /**
   * Activer un module pour un établissement.
   */
  async activateModule(schoolId: string, moduleName: ModuleName): Promise<SchoolModule> {
    const { data, error } = await supabase
      .from('school_modules')
      .upsert(
        { school_id: schoolId, module_name: moduleName, is_active: true },
        { onConflict: 'school_id, module_name' }
      )
      .select()
      .single();
    if (error) throw error;
    return data as SchoolModule;
  },

  /**
   * Désactiver un module pour un établissement.
   */
  async deactivateModule(schoolId: string, moduleName: ModuleName): Promise<SchoolModule> {
    const { data, error } = await supabase
      .from('school_modules')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('school_id', schoolId)
      .eq('module_name', moduleName)
      .select()
      .single();
    if (error) throw error;
    return data as SchoolModule;
  },

  // ---------------------------------------------------------------------------
  // Appareils
  // ---------------------------------------------------------------------------

  /**
   * Lister les appareils d'un ou tous les établissements.
   */
  async listDevices(schoolId?: string): Promise<SchoolDevice[]> {
    let query = supabase
      .from('school_devices')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (schoolId) {
      query = query.eq('school_id', schoolId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as SchoolDevice[];
  },

  /**
   * Révoquer un appareil (lui interdire la synchronisation).
   */
  async revokeDevice(deviceId: string): Promise<SchoolDevice> {
    const { data, error } = await supabase
      .from('school_devices')
      .update({ is_revoked: true, updated_at: new Date().toISOString() })
      .eq('id', deviceId)
      .select()
      .single();
    if (error) throw error;
    return data as SchoolDevice;
  },

  /**
   * Réactiver un appareil révoqué.
   */
  async reactivateDevice(deviceId: string): Promise<SchoolDevice> {
    const { data, error } = await supabase
      .from('school_devices')
      .update({ is_revoked: false, updated_at: new Date().toISOString() })
      .eq('id', deviceId)
      .select()
      .single();
    if (error) throw error;
    return data as SchoolDevice;
  },

  // ---------------------------------------------------------------------------
  // Journaux d'audit
  // ---------------------------------------------------------------------------

  /**
   * Consulter les journaux d'audit. Peut être filtré par établissement.
   */
  async listAuditLogs(schoolId?: string, limit = 100): Promise<AuditLog[]> {
    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (schoolId) {
      query = query.eq('school_id', schoolId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as AuditLog[];
  },

  // ---------------------------------------------------------------------------
  // Paramètres globaux
  // ---------------------------------------------------------------------------

  /**
   * Mettre à jour un paramètre global d'un établissement.
   */
  async updateSetting(schoolId: string, key: string, value: unknown): Promise<SchoolSetting> {
    const { data, error } = await supabase
      .from('school_settings')
      .upsert(
        { school_id: schoolId, key, value },
        { onConflict: 'school_id, key' }
      )
      .select()
      .single();
    if (error) throw error;
    return data as SchoolSetting;
  },

  /**
   * Récupérer les statistiques globales de la plateforme.
   */
  async getStats(): Promise<AdminStats> {
    const [schoolsRes, usersRes, devicesRes] = await Promise.all([
      supabase.from('schools').select('id', { count: 'exact', head: true }).is('deleted_at', null),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).is('deleted_at', null),
      supabase.from('school_devices').select('id', { count: 'exact', head: true }).is('deleted_at', null).eq('is_revoked', false),
    ]);

    return {
      total_schools: schoolsRes.count ?? 0,
      total_users: usersRes.count ?? 0,
      total_devices: devicesRes.count ?? 0,
      pending_sync_count: 0, // À implémenter lors de la Phase 24 (sync)
    };
  },
};
