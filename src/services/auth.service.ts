import { supabase } from './supabase';
import { getCachedProfile, setCachedProfile } from './local/profileCache';
import type { Profile } from '../types/database';

export const AuthService = {
  /**
   * Récupère la session actuelle
   */
  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  /**
   * Récupère le profil de l'utilisateur connecté.
   *
   * Utilise getSession() (lecture locale, aucun réseau requis) plutôt que
   * getUser() (qui revalide toujours auprès du serveur) pour identifier
   * l'utilisateur. La table `profiles` reste interrogée sur Supabase, mais
   * le résultat est mis en cache localement : si ce réseau échoue (hors
   * ligne, connexion lente), on retombe sur le dernier profil connu au lieu
   * de retourner null et de faire perdre l'accès aux données locales.
   */
  async getCurrentProfile(): Promise<Profile | null> {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) return getCachedProfile();

    const userId = session.user.id;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setCachedProfile(data as Profile);
        return data as Profile;
      }
      return null;
    } catch (e) {
      console.warn('[Auth] Profil injoignable (réseau ?), utilisation du cache local:', e);
      const cached = getCachedProfile();
      // On ne retourne le cache que s'il correspond au même utilisateur.
      return cached && cached.id === userId ? cached : null;
    }
  }
};