import Database from '@tauri-apps/plugin-sql';
import schemaSql from './schema.sql?raw';
import { WebSqlMock } from './websql-mock';
import type { SqlValue } from './sql-types';
export type { SqlValue };

let dbInstance: any = null;

export interface LocalDatabase {
  execute(query: string, bindValues?: SqlValue[]): Promise<{ rowsAffected: number }>;
  select<T>(query: string, bindValues?: SqlValue[]): Promise<T>;
  close?: () => Promise<void>;
}

export type StorageEngine = 'sqlite' | 'websql-mock' | 'none';

let currentEngine: StorageEngine = 'none';

/**
 * Indicateur du moteur de stockage réellement utilisé.
 * - 'sqlite' : base locale Tauri (production).
 * - 'websql-mock' : fausse base LocalStorage, uniquement en développement navigateur.
 * - 'none' : aucun moteur disponible (erreur bloquante Tauri).
 */
export function getStorageEngine(): StorageEngine {
  return currentEngine;
}

function isTauriEnvironment(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export async function getDb(): Promise<LocalDatabase> {
  if (dbInstance) return dbInstance as LocalDatabase;

  // Mode navigateur de développement : WebSqlMock est la SEULE base utilisée,
  // explicitement séparé de l'environnement Tauri.
  if (!isTauriEnvironment()) {
    currentEngine = 'websql-mock';
    dbInstance = new WebSqlMock();
    await initDb(dbInstance);
    console.warn('[Local DB] Engine: websql-mock (mode navigateur de développement).');
    return dbInstance as LocalDatabase;
  }

  // Environnement Tauri : SQLite uniquement. Toute erreur (chargement OU schéma)
  // est bloquante et explicite — aucun basculement silencieux vers LocalStorage.
  try {
    dbInstance = await Database.load('sqlite:nia.db');
    await initDb(dbInstance);
    currentEngine = 'sqlite';
    return dbInstance as LocalDatabase;
  } catch (e) {
    currentEngine = 'none';
    console.error('[Local DB] CRITIQUE : échec de chargement SQLite en environnement Tauri.', e);
    const detail = e instanceof Error ? e.message : String(e);
    throw new Error(
      'Base de données locale inaccessible (SQLite). Aucune écriture n\'a été effectuée. ' +
      `Vérifiez le fichier nia.db et les migrations. Détail : ${detail}`
    );
  }
}

export async function closeDb(): Promise<void> {
  if (dbInstance) {
    try {
      if (typeof dbInstance.close === 'function') {
        await dbInstance.close();
      }
    } catch (e) {
      console.warn('[Local DB] Error closing DB:', e);
    } finally {
      dbInstance = null;
      currentEngine = 'none';
    }
  }
}

async function initDb(db: any) {
  const queries = schemaSql.split(';').filter((q: string) => q.trim().length > 0);
  for (const query of queries) {
    try {
      await db.execute(query);
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      // Message exploitable : nomme l'énoncé en échec pour identifier la migration.
      throw new Error(
        `Initialisation du schéma local impossible sur l'énoncé « ${query.trim().slice(0, 80)}… » — ${detail}`
      );
    }
  }
  if (!ENABLE_REMOTE_SYNC) {
    await db.execute(`DELETE FROM mutations_queue`);
    if (currentEngine === 'websql-mock') {
      try {
        if (typeof localStorage !== 'undefined') {
          const raw = localStorage.getItem('nia_local_db');
          if (raw) {
            const parsed = JSON.parse(raw);
            parsed.mutations_queue = [];
            localStorage.setItem('nia_local_db', JSON.stringify(parsed));
          }
        }
      } catch {}
    }
  }
  console.log('[Local DB] Schema initialized successfully');
}

// TOGGLE SYNCHRONISATION SUPABASE (mettez à true pour réactiver la synchro Supabase à la fin)
export const ENABLE_REMOTE_SYNC = true;

export type QueueMutationResult =
  | { ok: true }
  | { ok: false; errorType: 'blocking' | 'temporary'; message: string };

export interface QueueFailure {
  at: string;
  table: string;
  operation: string;
  errorType: 'blocking' | 'temporary';
  message: string;
}

let lastQueueFailure: QueueFailure | null = null;

/**
 * Retourne la dernière mutation qui n'a PAS pu être enregistrée dans la file
 * (affichée à l'utilisateur). null si aucune échec depuis le dernier
 * clearLastQueueFailure().
 */
export function getLastQueueFailure(): QueueFailure | null {
  return lastQueueFailure;
}

export function clearLastQueueFailure(): void {
  lastQueueFailure = null;
}

export async function queueMutation(tableName: string, operation: 'INSERT' | 'UPDATE' | 'DELETE', payload: Record<string, any>): Promise<QueueMutationResult> {
  if (!ENABLE_REMOTE_SYNC) return { ok: true };

  try {
    const db = await getDb();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.execute(
      `INSERT INTO mutations_queue (id, table_name, operation, payload, created_at, status) VALUES ($1, $2, $3, $4, $5, 'pending')`,
      [id, tableName, operation, JSON.stringify(payload), now]
    );
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    // 'blocking' = base locale inaccessible (SQLite en échec) ; sinon 'temporary'.
    const errorType: 'blocking' | 'temporary' = getStorageEngine() === 'none' ? 'blocking' : 'temporary';
    lastQueueFailure = { at: new Date().toISOString(), table: tableName, operation, errorType, message };
    // Log structuré sans le payload (pas d'exposition de données sensibles).
    console.error(`[queueMutation] FAILED table=${tableName} operation=${operation} type=${errorType} message=${message}`);
    return { ok: false, errorType, message };
  }
}