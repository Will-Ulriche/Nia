import { useSchoolContext } from '../context/SchoolContext';
import type { ModuleName } from '../types/app';

/**
 * Hook principal pour accéder aux modules de l'établissement courant.
 * À utiliser dans n'importe quel composant enfant de <SchoolProvider>.
 *
 * @example
 * const { hasModule, activeModuleNames, isLoading } = useModules();
 * if (hasModule('college')) { ... }
 */
export function useModules() {
  const { activeModules, activeModuleNames, hasModule, isLoading, error, refresh } =
    useSchoolContext();

  return {
    /** Liste complète des modules actifs (avec métadonnées) */
    activeModules,
    /** Noms des modules actifs : ['college', 'lycee'] */
    activeModuleNames,
    /** Vérifie si un module spécifique est actif */
    hasModule,
    /** En cours de chargement */
    isLoading,
    /** Erreur éventuelle */
    error,
    /** Recharger les modules */
    refresh,
  };
}

/**
 * Hook pour accéder aux informations de l'établissement courant.
 *
 * @example
 * const { school } = useSchool();
 */
export function useSchool() {
  const { school, isLoading, error, refresh } = useSchoolContext();
  return { school, isLoading, error, refresh };
}

/**
 * Hook pour vérifier l'accès à une fonctionnalité selon le module.
 * Retourne false si le module n'est pas actif (permet de masquer des sections de l'UI).
 *
 * @example
 * const canAccessCollege = useRequiresModule('college');
 */
export function useRequiresModule(moduleName: ModuleName): boolean {
  const { hasModule } = useSchoolContext();
  return hasModule(moduleName);
}

/**
 * Filtre une liste par module actif.
 * Utile pour filtrer des menus de navigation selon les modules activés.
 *
 * @example
 * const filteredItems = useFilteredByModules(menuItems, (item) => item.requiredModule);
 */
export function useFilteredByModules<T>(
  items: T[],
  getModule: (item: T) => ModuleName | undefined
): T[] {
  const { hasModule } = useSchoolContext();
  return items.filter((item) => {
    const mod = getModule(item);
    return mod === undefined || hasModule(mod);
  });
}
