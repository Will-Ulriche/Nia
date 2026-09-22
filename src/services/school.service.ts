import { supabase } from './supabase';
import { getDb } from './local/db';
import type { School, SchoolModule } from '../types/database';

export const SchoolService = {
  /**
   * Miroir local de l'établissement (connexion active) pour satisfaire les
   * contraintes de clé étrangère de la base SQLite locale (academic_years,
   * periods, classes, ...). La synchro ne tire pas la table `schools` : c'est
   * le seul moyen de garantir que l'id de l'établissement existe localement
   * avant toute écriture.
   */
  async mirrorLocal(school: School): Promise<void> {
    const db = await getDb();
    const now = new Date().toISOString();
    await db.execute(
      `INSERT OR REPLACE INTO schools (id, name, address, contact_email, contact_phone, version, created_at, updated_at, updated_by, device_id, deleted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        school.id,
        school.name,
        school.address ?? null,
        school.contact_email ?? null,
        school.contact_phone ?? null,
        school.version ?? 1,
        school.created_at ?? now,
        school.updated_at ?? now,
        school.updated_by ?? null,
        school.device_id ?? null,
        school.deleted_at ?? null,
      ]
    );
  },

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
