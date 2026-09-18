import Database from '@tauri-apps/plugin-sql';
import schemaSql from './schema.sql?raw';

let dbInstance: any = null;

// Web Browser LocalStorage / In-Memory SQL Mock for dev & web mode
class WebSqlMock {
  private store: Map<string, any[]> = new Map();

  constructor() {
    this.initFromLocalStorage();
  }

  private initFromLocalStorage() {
    try {
      const raw = localStorage.getItem('kemitia_local_db');
      if (raw) {
        const parsed = JSON.parse(raw);
        for (const [key, val] of Object.entries(parsed)) {
          this.store.set(key, val as any[]);
        }
      }
    } catch (e) {
      console.warn('[WebSqlMock] Error loading from localStorage:', e);
    }
  }

  private persist() {
    try {
      const obj: Record<string, any[]> = {};
      this.store.forEach((val, key) => {
        obj[key] = val;
      });
      localStorage.setItem('kemitia_local_db', JSON.stringify(obj));
    } catch (e) {
      console.warn('[WebSqlMock] Error saving to localStorage:', e);
    }
  }

  async execute(query: string, bindParams: any[] = []): Promise<any> {
    const q = query.trim();

    // CREATE TABLE
    if (q.toUpperCase().startsWith('CREATE TABLE')) {
      const match = q.match(/CREATE TABLE (?:IF NOT EXISTS )?([a-zA-Z0-9_]+)/i);
      if (match) {
        const tableName = match[1];
        if (!this.store.has(tableName)) {
          this.store.set(tableName, []);
        }
      }
      return { rowsAffected: 0 };
    }

    // INSERT INTO
    if (q.toUpperCase().startsWith('INSERT INTO')) {
      const match = q.match(/INSERT INTO ([a-zA-Z0-9_]+)\s*\(([^)]+)\)/i);
      if (match) {
        const tableName = match[1];
        const cols = match[2].split(',').map(c => c.trim());
        const rows = this.store.get(tableName) || [];

        const rowObj: Record<string, any> = {};
        cols.forEach((col, idx) => {
          rowObj[col] = bindParams[idx] !== undefined ? bindParams[idx] : null;
        });

        // Replace if exists by id
        const idx = rowObj.id ? rows.findIndex(r => r.id === rowObj.id) : -1;
        if (idx >= 0) {
          rows[idx] = rowObj;
        } else {
          rows.push(rowObj);
        }

        this.store.set(tableName, rows);
        this.persist();
        return { rowsAffected: 1 };
      }
    }

    // UPDATE
    if (q.toUpperCase().startsWith('UPDATE')) {
      const match = q.match(/UPDATE ([a-zA-Z0-9_]+)/i);
      if (match) {
        const tableName = match[1];
        const rows = this.store.get(tableName) || [];

        let affected = 0;
        rows.forEach(r => {
          let matchRow = true;
          if (q.includes('school_id =') && bindParams.length > 0) {
            const schoolIdVal = bindParams.find(p => typeof p === 'string' && (p.startsWith('sch_') || p.includes('-')));
            if (schoolIdVal && r.school_id && r.school_id !== schoolIdVal) matchRow = false;
          }
          if (q.includes('id =') && bindParams.length > 0) {
            const idVal = bindParams[bindParams.length - 1];
            if (idVal && r.id && r.id !== idVal) matchRow = false;
          }

          if (matchRow) {
            // Handle literal values (from activateAcademicYear)
            if (q.includes('is_active = 0')) r.is_active = 0;
            if (q.includes('is_active = 1')) r.is_active = 1;
            
            // Handle parameterized values (from updateAcademicYear)
            const isActiveMatch = q.match(/is_active\s*=\s*\$(\d+)/);
            if (isActiveMatch) {
              const paramIdx = parseInt(isActiveMatch[1], 10) - 1;
              if (paramIdx >= 0 && paramIdx < bindParams.length) {
                r.is_active = bindParams[paramIdx];
              }
            }

            if (q.includes('deleted_at =')) r.deleted_at = bindParams[0] || new Date().toISOString();
            if (q.includes('name =')) {
              const nameIdx = q.indexOf('name =');
              if (nameIdx !== -1 && bindParams[1]) r.name = bindParams[1];
            }
            affected++;
          }
        });

        this.persist();
        return { rowsAffected: affected };
      }
    }

    // DELETE FROM
    if (q.toUpperCase().startsWith('DELETE FROM')) {
      const match = q.match(/DELETE FROM ([a-zA-Z0-9_]+)/i);
      if (match) {
        const tableName = match[1];
        const rows = this.store.get(tableName) || [];

        if (q.includes('WHERE')) {
          let filtered = rows;
          if (q.includes("status = 'error'") || q.includes("status = 'pending'")) {
            filtered = rows.filter(r => r.status !== 'error' && r.status !== 'pending');
          } else if (q.includes('id =') && bindParams.length > 0) {
            const idVal = bindParams[0];
            filtered = rows.filter(r => r.id !== idVal);
          } else {
            filtered = [];
          }
          this.store.set(tableName, filtered);
        } else {
          // DELETE FROM table without WHERE clears entire table
          this.store.set(tableName, []);
        }

        this.persist();
        return { rowsAffected: 1 };
      }
    }

    return { rowsAffected: 0 };
  }

  async select<T>(query: string, bindParams: any[] = []): Promise<T> {
    const q = query.trim();

    const match = q.match(/FROM ([a-zA-Z0-9_]+)/i);
    if (!match) return [] as unknown as T;

    const tableName = match[1];
    let rows = [...(this.store.get(tableName) || [])];

    if (q.includes('deleted_at IS NULL')) {
      rows = rows.filter(r => !r.deleted_at);
    }

    // Handle school_id = $1 AND academic_year_id = $2
    if (q.includes('school_id = $1') && q.includes('academic_year_id = $2') && bindParams[0] && bindParams[1]) {
      rows = rows.filter(r => (r.school_id === bindParams[0] || !r.school_id) && r.academic_year_id === bindParams[1]);
    } else if (q.includes('school_id = $1') && q.includes('section_id = $2') && bindParams[0] && bindParams[1]) {
      rows = rows.filter(r => (r.school_id === bindParams[0] || !r.school_id) && r.section_id === bindParams[1]);
    } else if (q.includes('school_id = $1') && q.includes('level_id = $2') && bindParams[0] && bindParams[1]) {
      rows = rows.filter(r => (r.school_id === bindParams[0] || !r.school_id) && r.level_id === bindParams[1]);
    } else if (q.includes('academic_year_id = $1') && bindParams[0]) {
      rows = rows.filter(r => r.academic_year_id === bindParams[0]);
    } else if (q.includes('school_id = $1') && q.includes('class_id = $2') && bindParams[0] && bindParams[1]) {
      rows = rows.filter(r => (r.school_id === bindParams[0] || !r.school_id) && r.class_id === bindParams[1]);
    } else if (q.includes('school_id = $1') && bindParams[0]) {
      rows = rows.filter(r => r.school_id === bindParams[0] || !r.school_id);
    } else if (q.includes('class_id = $1') && bindParams[0]) {
      rows = rows.filter(r => r.class_id === bindParams[0]);
    } else if (q.includes('subject_id = $1') && bindParams[0]) {
      rows = rows.filter(r => r.subject_id === bindParams[0]);
    } else if (q.includes('template_id = $1') && bindParams[0]) {
      rows = rows.filter(r => r.template_id === bindParams[0]);
    } else if (/\bid = \$1/.test(q) && bindParams[0]) {
      rows = rows.filter(r => r.id === bindParams[0]);
    }

    if (q.includes('ORDER BY start_date DESC')) {
      rows.sort((a, b) => (b.start_date || '').localeCompare(a.start_date || ''));
    } else if (q.includes('ORDER BY start_date ASC')) {
      rows.sort((a, b) => (a.start_date || '').localeCompare(b.start_date || ''));
    } else if (q.includes('ORDER BY level_order ASC')) {
      rows.sort((a, b) => (a.level_order || 0) - (b.level_order || 0));
    } else if (q.includes('ORDER BY name ASC')) {
      rows.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    return rows as unknown as T;
  }
}

export async function getDb(): Promise<any> {
  if (!dbInstance) {
    try {
      dbInstance = await Database.load('sqlite:kemitia.db');
      await initDb(dbInstance);
    } catch (e) {
      console.warn('[Local DB] Tauri SQL plugin not available. Switching to Web LocalStorage DB fallback.', e);
      dbInstance = new WebSqlMock();
      await initDb(dbInstance);
    }
  }
  return dbInstance;
}

async function initDb(db: any) {
  try {
    const queries = schemaSql.split(';').filter((q: string) => q.trim().length > 0);
    for (const query of queries) {
      await db.execute(query);
    }
    if (!ENABLE_REMOTE_SYNC) {
      await db.execute(`DELETE FROM mutations_queue`);
      try {
        const raw = localStorage.getItem('kemitia_local_db');
        if (raw) {
          const parsed = JSON.parse(raw);
          parsed.mutations_queue = [];
          localStorage.setItem('kemitia_local_db', JSON.stringify(parsed));
        }
      } catch (e) {}
    }
    console.log('[Local DB] Schema initialized successfully');
  } catch (error) {
    console.error('[Local DB] Failed to initialize schema', error);
  }
}

// TOGGLE SYNCHRONISATION SUPABASE (mettez à true pour réactiver la synchro Supabase à la fin)
export const ENABLE_REMOTE_SYNC = true;

export async function queueMutation(tableName: string, operation: 'INSERT' | 'UPDATE' | 'DELETE', payload: Record<string, any>) {
  if (!ENABLE_REMOTE_SYNC) return;

  try {
    const db = await getDb();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.execute(
      `INSERT INTO mutations_queue (id, table_name, operation, payload, created_at, status) VALUES ($1, $2, $3, $4, $5, 'pending')`,
      [id, tableName, operation, JSON.stringify(payload), now]
    );
  } catch (e) {
    console.warn('[queueMutation] Error:', e);
  }
}
