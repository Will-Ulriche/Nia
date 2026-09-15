import Database from '@tauri-apps/plugin-sql';
import schemaSql from './schema.sql?raw';

let dbInstance: Database | null = null;

export async function getDb(): Promise<Database> {
  if (!dbInstance) {
    dbInstance = await Database.load('sqlite:kemitia.db');
    await initDb(dbInstance);
  }
  return dbInstance;
}

async function initDb(db: Database) {
  try {
    const queries = schemaSql.split(';').filter((q: string) => q.trim().length > 0);
    for (const query of queries) {
      await db.execute(query);
    }
    console.log('[Local DB] Schema initialized');
  } catch (error) {
    console.error('[Local DB] Failed to initialize schema', error);
  }
}

/**
 * Utilitaire centralisé pour enregistrer une mutation dans la file d'attente.
 * Appelé par tous les services après chaque écriture locale.
 */
export async function queueMutation(tableName: string, operation: 'INSERT' | 'UPDATE' | 'DELETE', payload: Record<string, any>) {
  const db = await getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db.execute(
    `INSERT INTO mutations_queue (id, table_name, operation, payload, created_at, status) VALUES ($1, $2, $3, $4, $5, 'pending')`,
    [id, tableName, operation, JSON.stringify(payload), now]
  );
}
