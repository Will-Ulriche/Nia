import type { Profile } from '../../types/database';

/**
 * Cache local du profil utilisateur connecté (localStorage).
 *
 * Pourquoi : `supabase.auth.getUser()` et `supabase.from('profiles')...`
 * font tous les deux un aller-retour réseau vers Supabase. Sans ce cache,
 * rouvrir l'app hors ligne (ou avec un réseau lent/instable) fait échouer
 * la résolution du profil → school_id introuvable → l'app bascule sur
 * l'école de démonstration ('sch_demo_01') → les données réelles, pourtant
 * toujours présentes dans SQLite, semblent "avoir disparu".
 */
const KEY = 'nia_cached_profile';

export function getCachedProfile(): Profile | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch (e) {
    console.warn('[ProfileCache] Lecture impossible:', e);
    return null;
  }
}

export function setCachedProfile(profile: Profile): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(KEY, JSON.stringify(profile));
  } catch (e) {
    console.warn('[ProfileCache] Écriture impossible:', e);
  }
}

export function clearCachedProfile(): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(KEY);
  } catch {}
}