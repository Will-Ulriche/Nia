import type { SqlValue } from './sql-types';

/**
 * WebSqlMock : FAUSSE BASE DE DONNÉES POUR LE DÉVELOPPEMENT WEB
 * ⚠️ ATTENTION ⚠️
 * L'application est 100% Desktop (Tauri). Ce mock n'est présent QUE pour
 * permettre de travailler sur l'UI dans le navigateur avec `npm run dev`.
 * Il ne supporte qu'un sous-ensemble très basique du SQL et ne doit JAMAIS
 * être utilisé comme référence pour le fonctionnement réel de l'app.
 *
 * ── CONTRAT DE SOUS-ENSEMBLE SUPPORTÉ ──────────────────────────────────────
 * execute() :
 *   - CREATE TABLE (IF NOT EXISTS) {table}          → crée un store vide
 *   - INSERT INTO {table} (cols) VALUES ($1..$n)    → upsert par `id`
 *   - UPDATE {table} SET ... WHERE school_id = $n / id = $n
 *      (heuristique : matche school_id si présent, id, is_active littéral ou
 *      paramétré $n, deleted_at =, name =)
 *   - DELETE FROM {table} [WHERE status = 'error'|'pending' | id = $1] sinon purge
 * select() :
 *   - FROM {une seule table} — AUCUNE jointure (JOIN non supporté)
 *   - WHERE : deleted_at IS NULL ; school_id (+ academic_year_id/section_id/
 *     level_id/class_id) ; academic_year_id seul ; class_id ; subject_id ;
 *     template_id ; id = $1
 *   - ORDER BY : start_date DESC/ASC, level_order ASC, name ASC
 * NON SUPPORTÉ : JOIN, GROUP BY, agrégats (COUNT/SUM...), sous-requêtes.
 *   Les agrégats (ex. SELECT COUNT(*)) renvoient les lignes brutes : les
 *   appelants doivent tolérer `rows[0]?.count ?? 0`.
 *
 * ── INTERDITS ──────────────────────────────────────────────────────────────
 * - Ne PAS utiliser ce mock pour valider la logique métier critique ou la
 *   synchronisation (les requêtes réelles SQLite sont exécutées telles quelles
 *   en dépit des heuristiques ici).
 * - Ne PAS étendre ce mock pour imiter SQL/RLS : s'il devient insuffisant,
 *   limiter le dev navigateur aux écrans UI et aux données de démo.
 * - Toute logique ne dépendant du SQL se valide en Tauri (SQLite) ou sur la
 *   base Supabase.
 */
export class WebSqlMock {
  private store: Map<string, any[]> = new Map();

  constructor() {
    console.warn(
      '%c[WebSqlMock] MODE DÉVELOPPEMENT WEB ACTIF\n' +
      'L\'application utilise une fausse base de données (LocalStorage).\n' +
      'Les requêtes SQL complexes ne fonctionneront pas. Utilisez l\'application Tauri pour tester la logique métier.',
      'color: orange; font-weight: bold; font-size: 14px;'
    );
    this.initFromLocalStorage();
  }

  private initFromLocalStorage() {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem('nia_local_db');
        if (raw) {
          const parsed = JSON.parse(raw);
          for (const [key, val] of Object.entries(parsed)) {
            this.store.set(key, val as any[]);
          }
        }
      }
    } catch (e) {
      console.warn('[WebSqlMock] Error loading from localStorage:', e);
    }
  }

  private persist() {
    try {
      if (typeof localStorage === 'undefined') return;
      const obj: Record<string, any[]> = {};
      this.store.forEach((val, key) => {
        obj[key] = val;
      });
      localStorage.setItem('nia_local_db', JSON.stringify(obj));
    } catch (e) {
      console.warn('[WebSqlMock] Error saving to localStorage:', e);
    }
  }

  async execute(query: string, bindParams: SqlValue[] = []): Promise<{ rowsAffected: number }> {
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
          if (q.includes("status = 'error'") && q.includes("retry_count >=")) {
            // Delete only dead mutations for UI dev
            filtered = rows.filter(r => !(r.status === 'error' && (r.retry_count || 0) >= 3));
          } else if (q.includes("status = 'error'") || q.includes("status = 'pending'")) {
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

  async select<T>(query: string, bindParams: SqlValue[] = []): Promise<T> {
    const q = query.trim();

    const match = q.match(/FROM ([a-zA-Z0-9_]+)/i);
    if (!match) return [] as unknown as T;

    const tableName = match[1];
    let rows = [...(this.store.get(tableName) || [])];

    if (q.includes('deleted_at IS NULL')) {
      rows = rows.filter(r => !r.deleted_at);
    }

    // WHERE combiné school_id + enfant
    if (q.includes('school_id = $1') && q.includes('academic_year_id = $2') && bindParams[0] && bindParams[1]) {
      rows = rows.filter(r => r.school_id === bindParams[0] && r.academic_year_id === bindParams[1]);
    } else if (q.includes('school_id = $1') && q.includes('section_id = $2') && bindParams[0] && bindParams[1]) {
      rows = rows.filter(r => r.school_id === bindParams[0] && r.section_id === bindParams[1]);
    } else if (q.includes('school_id = $1') && q.includes('level_id = $2') && bindParams[0] && bindParams[1]) {
      rows = rows.filter(r => r.school_id === bindParams[0] && r.level_id === bindParams[1]);
    } else if (q.includes('academic_year_id = $1') && bindParams[0]) {
      rows = rows.filter(r => r.academic_year_id === bindParams[0]);
    } else if (q.includes('school_id = $1') && q.includes('class_id = $2') && bindParams[0] && bindParams[1]) {
      rows = rows.filter(r => r.school_id === bindParams[0] && r.class_id === bindParams[1]);
    } else if (q.includes('school_id = $1') && bindParams[0]) {
      rows = rows.filter(r => r.school_id === bindParams[0]);
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