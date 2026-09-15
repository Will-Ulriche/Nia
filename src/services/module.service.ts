import { supabase } from './supabase';
import type { SchoolModule } from '../types/database';
import type { ModuleName } from '../types/app';

/**
 * Service de gestion des modules scolaires (Supabase/cloud).
 * Utilisé pour lire et modifier les modules actifs d'un établissement.
 */
export const ModuleService = {

  /**
   * Récupérer tous les modules d'un établissement (actifs et inactifs).
   */
  async getModules(schoolId: string): Promise<SchoolModule[]> {
    const { data, error } = await supabase
      .from('school_modules')
      .select('*')
      .eq('school_id', schoolId)
      .is('deleted_at', null);
    if (error) throw error;
    return data as SchoolModule[];
  },

  /**
   * Récupérer uniquement les modules actifs d'un établissement.
   */
  async getActiveModules(schoolId: string): Promise<SchoolModule[]> {
    const { data, error } = await supabase
      .from('school_modules')
      .select('*')
      .eq('school_id', schoolId)
      .eq('is_active', true)
      .is('deleted_at', null);
    if (error) throw error;
    return data as SchoolModule[];
  },

  /**
   * Vérifier si un module spécifique est actif pour un établissement.
   */
  async isModuleActive(schoolId: string, moduleName: ModuleName): Promise<boolean> {
    const { data, error } = await supabase
      .from('school_modules')
      .select('id, is_active')
      .eq('school_id', schoolId)
      .eq('module_name', moduleName)
      .eq('is_active', true)
      .maybeSingle();
    if (error) throw error;
    return data !== null;
  },

  /**
   * Activer un module pour un établissement (upsert).
   */
  async activateModule(schoolId: string, moduleName: ModuleName): Promise<SchoolModule> {
    const { data, error } = await supabase
      .from('school_modules')
      .upsert(
        {
          school_id: schoolId,
          module_name: moduleName,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
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

  /**
   * Obtenir la liste de tous les noms de modules disponibles sur la plateforme.
   */
  getAllModuleNames(): ModuleName[] {
    return ['college', 'lycee', 'primaire', 'universite', 'formation'];
  },
};
