import { supabase } from './supabase';
import type { School, SchoolModule } from '../types/database';

export const SchoolService = {
  /**
   * Créer un nouvel établissement (nécessite les droits Super Admin via RLS)
   */
  async createSchool(name: string, address?: string, email?: string, phone?: string): Promise<School> {
    const { data, error } = await supabase
      .from('schools')
      .insert({
        name,
        address,
        contact_email: email,
        contact_phone: phone,
      })
      .select()
      .single();

    if (error) throw error;
    return data as School;
  },

  /**
   * Récupérer la liste des établissements. 
   * Avec la RLS :
   * - Un Super Admin récupérera tout.
   * - Un utilisateur normal ne récupérera que le sien.
   */
  async getSchools(): Promise<School[]> {
    const { data, error } = await supabase
      .from('schools')
      .select('*');

    if (error) throw error;
    return data as School[];
  },

  /**
   * Activer un module pour un établissement spécifique
   */
  async activateModule(schoolId: string, moduleName: SchoolModule['module_name']): Promise<SchoolModule> {
    const { data, error } = await supabase
      .from('school_modules')
      .upsert({
        school_id: schoolId,
        module_name: moduleName,
        is_active: true
      }, { onConflict: 'school_id, module_name' })
      .select()
      .single();

    if (error) throw error;
    return data as SchoolModule;
  }
};
