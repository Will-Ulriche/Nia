import type { SchoolModule } from '../types/database';
import type { ModuleName } from '../types/app';

/**
 * Accès aux modules scolaires depuis la base SQLite locale (offline-first).
 * Ces fonctions s'exécutent via tauri-plugin-sql et ne nécessitent pas de connexion Internet.
 */

/**
 * Récupérer les modules actifs pour un établissement depuis SQLite.
 * Utilise l'API tauri-plugin-sql (Database).
 */
export async function getActiveModulesLocal(
  db: import('@tauri-apps/plugin-sql').default,
  schoolId: string
): Promise<SchoolModule[]> {
  const rows = await db.select<SchoolModule[]>(
    `SELECT * FROM school_modules 
     WHERE school_id = $1 AND is_active = 1 AND deleted_at IS NULL`,
    [schoolId]
  );
  return rows;
}

/**
 * Vérifier si un module est actif localement.
 */
export async function isModuleActiveLocal(
  db: import('@tauri-apps/plugin-sql').default,
  schoolId: string,
  moduleName: ModuleName
): Promise<boolean> {
  const rows = await db.select<{ id: string }[]>(
    `SELECT id FROM school_modules 
     WHERE school_id = $1 AND module_name = $2 AND is_active = 1 AND deleted_at IS NULL
     LIMIT 1`,
    [schoolId, moduleName]
  );
  return rows.length > 0;
}

/**
 * Mettre à jour l'état actif d'un module dans SQLite (après sync ou action locale).
 */
export async function upsertModuleLocal(
  db: import('@tauri-apps/plugin-sql').default,
  module: SchoolModule
): Promise<void> {
  await db.execute(
    `INSERT INTO school_modules (id, school_id, module_name, is_active, version, created_at, updated_at, updated_by, device_id, deleted_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT(id) DO UPDATE SET
       is_active = excluded.is_active,
       version = excluded.version,
       updated_at = excluded.updated_at,
       updated_by = excluded.updated_by,
       device_id = excluded.device_id,
       deleted_at = excluded.deleted_at`,
    [
      module.id,
      module.school_id,
      module.module_name,
      module.is_active ? 1 : 0,
      module.version,
      module.created_at,
      module.updated_at,
      module.updated_by,
      module.device_id,
      module.deleted_at,
    ]
  );
}
