import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { ModuleService } from '../services/module.service';
import { SchoolService } from '../services/school.service';
import type { School, SchoolModule } from '../types/database';
import type { ModuleName } from '../types/app';

// ---------------------------------------------------------------------------
// Types du contexte
// ---------------------------------------------------------------------------

interface SchoolContextValue {
  /** L'établissement courant (null si pas encore chargé ou non connecté) */
  school: School | null;
  /** Liste des modules actifs pour cet établissement */
  activeModules: SchoolModule[];
  /** Noms des modules actifs (tableau simple pour comparaisons rapides) */
  activeModuleNames: ModuleName[];
  /** Vérifie si un module donné est actif */
  hasModule: (name: ModuleName) => boolean;
  /** En cours de chargement */
  isLoading: boolean;
  /** Erreur éventuelle */
  error: string | null;
  /** Recharger les données de l'établissement */
  refresh: () => void;
}

// ---------------------------------------------------------------------------
// Création du contexte
// ---------------------------------------------------------------------------

const SchoolContext = createContext<SchoolContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function SchoolProvider({ children }: { children: React.ReactNode }) {
  const [school, setSchool] = useState<School | null>(null);
  const [activeModules, setActiveModules] = useState<SchoolModule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = () => setRefreshKey((k) => k + 1);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        // 1. Récupérer l'utilisateur connecté depuis Supabase
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;

        // 2. Récupérer le profil pour trouver le school_id
        const { data: profile } = await supabase
          .from('profiles')
          .select('school_id')
          .eq('id', user.id)
          .maybeSingle();

        if (!profile?.school_id || cancelled) return;
        const schoolId = profile.school_id;

        // 3a. FALLBACK OFFLINE-FIRST : charger l'école depuis SQLite local
        //     immédiatement, pour que l'UI ne reste pas bloquée sur "Chargement..."
        //     si Supabase est lent ou injoignable.
        try {
          const { getDb } = await import('../services/local/db');
          const db = await getDb();
          const localRows = await db.select<School[]>(
            `SELECT * FROM schools WHERE id = $1 LIMIT 1`,
            [schoolId]
          );
          if (localRows.length > 0 && !cancelled) {
            setSchool(localRows[0]);
            setIsLoading(false); // libère l'UI immédiatement
          }
        } catch (localErr) {
          console.warn('[SchoolContext] Lecture locale impossible:', localErr);
        }

        // 3b. Source de vérité : charger depuis Supabase et mettre à jour
        const { data: schoolData, error: schoolError } = await supabase
          .from('schools')
          .select('*')
          .eq('id', schoolId)
          .maybeSingle();

        if (schoolError) throw schoolError;
        if (cancelled) return;

        if (schoolData) {
          setSchool(schoolData as School);
          // Miroir local : maintient la FK SQLite à jour
          SchoolService.mirrorLocal(schoolData as School).catch(err =>
            console.warn('[SchoolContext] mirrorLocal failed:', err)
          );
        }

        // 4. Récupérer les modules actifs
        const modules = await ModuleService.getActiveModules(schoolId);
        if (!cancelled) {
          setActiveModules(modules);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Erreur de chargement');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();

    // Écouter les changements de session (connexion / déconnexion)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      if (!cancelled) load();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [refreshKey]);

  const activeModuleNames = activeModules.map((m) => m.module_name as ModuleName);
  const hasModule = (name: ModuleName) => activeModuleNames.includes(name);

  return (
    <SchoolContext.Provider
      value={{ school, activeModules, activeModuleNames, hasModule, isLoading, error, refresh }}
    >
      {children}
    </SchoolContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook interne pour lire le contexte (utilisé par useModules)
// ---------------------------------------------------------------------------

export function useSchoolContext(): SchoolContextValue {
  const ctx = useContext(SchoolContext);
  if (!ctx) {
    throw new Error('useSchoolContext doit être utilisé dans un <SchoolProvider>');
  }
  return ctx;
}
