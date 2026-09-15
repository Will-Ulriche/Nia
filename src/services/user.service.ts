import { supabase } from './supabase';
import type { Profile } from '../types/database';
import type { CreateUserPayload, UpdateUserPayload } from '../types/app';

/**
 * Service de gestion des utilisateurs.
 * La création d'utilisateurs nécessite le rôle 'super_admin' (enforced par RLS).
 * Les mises à jour de profil sont disponibles selon les rôles.
 */
export const UserService = {

  /**
   * Créer un nouvel utilisateur et son profil associé.
   * Utilise la fonction Admin de Supabase (nécessite une Edge Function ou la clé service_role côté serveur).
   * Pour l'instant, cela invite l'utilisateur par email via l'API Supabase Auth.
   */
  async inviteUser(payload: CreateUserPayload): Promise<{ message: string }> {
    // Note: Pour créer un utilisateur avec un mot de passe en production,
    // il faut utiliser la clé service_role côté backend (Edge Function Supabase).
    // Cette implémentation utilise signUp pour les tests locaux.
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: payload.email,
      password: payload.password,
    });
    if (authError) throw authError;

    const userId = authData.user?.id;
    if (!userId) throw new Error('La création de compte a échoué.');

    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        school_id: payload.school_id,
        role: payload.role,
        first_name: payload.first_name,
        last_name: payload.last_name,
      });
    if (profileError) throw profileError;

    return { message: `Utilisateur ${payload.email} créé avec succès.` };
  },

  /**
   * Lister les utilisateurs d'un établissement.
   */
  async listUsers(schoolId: string): Promise<Profile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('school_id', schoolId)
      .is('deleted_at', null)
      .order('last_name');
    if (error) throw error;
    return data as Profile[];
  },

  /**
   * Récupérer un profil utilisateur par son ID.
   */
  async getUser(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) throw error;
    return data as Profile | null;
  },

  /**
   * Mettre à jour le rôle ou les informations d'un utilisateur.
   */
  async updateUser(userId: string, payload: UpdateUserPayload): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();
    if (error) throw error;
    return data as Profile;
  },

  /**
   * Désactiver un compte utilisateur (soft delete).
   */
  async deactivateUser(userId: string): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', userId);
    if (error) throw error;
  },
};
