import { getDb, ENABLE_REMOTE_SYNC, type SqlValue } from './local/db';
import type { AcademicYear, Period } from '../types/database';

export class AcademicService {
  // Utility for queuing mutation
  private static async queueMutation(tableName: string, operation: string, payload: any) {
    if (!ENABLE_REMOTE_SYNC) return; // Skip when sync is disabled
    const db = await getDb();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.execute(
      `INSERT INTO mutations_queue (id, table_name, operation, payload, created_at, status) VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, tableName, operation, JSON.stringify(payload), now, 'pending']
    );
  }

  // === ACADEMIC YEARS ===

  static async listAcademicYears(schoolId: string): Promise<AcademicYear[]> {
    const db = await getDb();
    // SQLite doesn't have true booleans, they are stored as integers (1/0)
    const data = await db.select<AcademicYear[]>(
      `SELECT * FROM academic_years WHERE school_id = $1 AND deleted_at IS NULL ORDER BY start_date DESC`,
      [schoolId]
    );
    // Map integer to boolean
    return data.map(d => ({ ...d, is_active: Boolean(d.is_active) }));
  }

  static async getAcademicYear(id: string): Promise<AcademicYear> {
    const db = await getDb();
    const data = await db.select<AcademicYear[]>(`SELECT * FROM academic_years WHERE id = $1`, [id]);
    if (!data.length) throw new Error("Not found");
    const d = data[0];
    return { ...d, is_active: Boolean(d.is_active) };
  }

  static async createAcademicYear(payload: Partial<AcademicYear>): Promise<AcademicYear> {
    const db = await getDb();
    const id = payload.id || crypto.randomUUID();
    const now = new Date().toISOString();
    const fullPayload = {
      id,
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      is_active: false,
      ...payload
    } as AcademicYear;

    await db.execute(
      `INSERT INTO academic_years (id, school_id, name, start_date, end_date, is_active, version, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        fullPayload.id, fullPayload.school_id, fullPayload.name, fullPayload.start_date, fullPayload.end_date,
        fullPayload.is_active ? 1 : 0, fullPayload.version, fullPayload.created_at, fullPayload.updated_at
      ]
    );

    await this.queueMutation('academic_years', 'INSERT', fullPayload);

    // Auto-generate standard 3 trimesters for this new academic year if start_date is set
    if (fullPayload.start_date && fullPayload.school_id) {
      const startYear = parseInt(fullPayload.start_date.split('-')[0]) || new Date().getFullYear();
      const nextYear = startYear + 1;

      await this.createPeriod({
        school_id: fullPayload.school_id,
        academic_year_id: fullPayload.id,
        name: 'Trimestre 1',
        start_date: `${startYear}-09-01`,
        end_date: `${startYear}-11-30`
      });

      await this.createPeriod({
        school_id: fullPayload.school_id,
        academic_year_id: fullPayload.id,
        name: 'Trimestre 2',
        start_date: `${startYear}-12-01`,
        end_date: `${nextYear}-02-28`
      });

      await this.createPeriod({
        school_id: fullPayload.school_id,
        academic_year_id: fullPayload.id,
        name: 'Trimestre 3',
        start_date: `${nextYear}-03-01`,
        end_date: `${nextYear}-06-30`
      });
    }

    return fullPayload;
  }

  static async updateAcademicYear(id: string, payload: Partial<AcademicYear>): Promise<AcademicYear> {
    const db = await getDb();
    const now = new Date().toISOString();
    
    // SQLite doesn't support dynamic updates easily without building string
    let query = 'UPDATE academic_years SET updated_at = $1';
    const values: SqlValue[] = [now];
    let idx = 2;

    if (payload.name !== undefined) { query += `, name = $${idx++}`; values.push(payload.name); }
    if (payload.start_date !== undefined) { query += `, start_date = $${idx++}`; values.push(payload.start_date); }
    if (payload.end_date !== undefined) { query += `, end_date = $${idx++}`; values.push(payload.end_date); }
    if (payload.is_active !== undefined) { query += `, is_active = $${idx++}`; values.push(payload.is_active ? 1 : 0); }

    query += ` WHERE id = $${idx}`;
    values.push(id);

    await db.execute(query, values);
    await this.queueMutation('academic_years', 'UPDATE', { id, ...payload });

    return this.getAcademicYear(id);
  }

  static async activateAcademicYear(schoolId: string, yearId: string): Promise<void> {
    const db = await getDb();
    const now = new Date().toISOString();
    
    // 1. Désactiver localement
    await db.execute(`UPDATE academic_years SET is_active = 0, updated_at = $1 WHERE school_id = $2`, [now, schoolId]);
    // Nous mettons en file d'attente l'update (ceci peut être compliqué à synchroniser sans envoyer tous les IDs, on simplifie pour le PoC)
    // Dans un vrai système, on pourrait envoyer une action RPC plutôt qu'une update table directe.
    
    // 2. Activer la bonne
    await db.execute(`UPDATE academic_years SET is_active = 1, updated_at = $1 WHERE id = $2`, [now, yearId]);
    await this.queueMutation('academic_years', 'UPDATE', { id: yearId, is_active: true });
  }

  static async deleteAcademicYear(id: string): Promise<void> {
    const db = await getDb();
    const now = new Date().toISOString();
    await db.execute(`UPDATE academic_years SET deleted_at = $1 WHERE id = $2`, [now, id]);
    await this.queueMutation('academic_years', 'DELETE', { id });
  }

  // === PERIODS ===

  static async listPeriods(academicYearId: string): Promise<Period[]> {
    const db = await getDb();
    const data = await db.select<Period[]>(
      `SELECT * FROM periods WHERE academic_year_id = $1 AND deleted_at IS NULL ORDER BY start_date ASC`,
      [academicYearId]
    );
    return data;
  }

  static async createPeriod(payload: Partial<Period>): Promise<Period> {
    const db = await getDb();
    const id = payload.id || crypto.randomUUID();
    const now = new Date().toISOString();
    const fullPayload = {
      id,
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      ...payload
    } as Period;

    await db.execute(
      `INSERT INTO periods (id, school_id, academic_year_id, name, start_date, end_date, version, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        fullPayload.id, fullPayload.school_id, fullPayload.academic_year_id, fullPayload.name, 
        fullPayload.start_date, fullPayload.end_date, fullPayload.version, fullPayload.created_at, fullPayload.updated_at
      ]
    );

    await this.queueMutation('periods', 'INSERT', fullPayload);
    return fullPayload;
  }

  static async updatePeriod(id: string, payload: Partial<Period>): Promise<Period> {
    const db = await getDb();
    const now = new Date().toISOString();
    
    let query = 'UPDATE periods SET updated_at = $1';
    const values: SqlValue[] = [now];
    let idx = 2;

    if (payload.name !== undefined) { query += `, name = $${idx++}`; values.push(payload.name); }
    if (payload.start_date !== undefined) { query += `, start_date = $${idx++}`; values.push(payload.start_date); }
    if (payload.end_date !== undefined) { query += `, end_date = $${idx++}`; values.push(payload.end_date); }

    query += ` WHERE id = $${idx}`;
    values.push(id);

    await db.execute(query, values);
    await this.queueMutation('periods', 'UPDATE', { id, ...payload });

    const data = await db.select<Period[]>(`SELECT * FROM periods WHERE id = $1`, [id]);
    return data[0];
  }

  static async deletePeriod(id: string): Promise<void> {
    const db = await getDb();
    const now = new Date().toISOString();
    await db.execute(`UPDATE periods SET deleted_at = $1 WHERE id = $2`, [now, id]);
    await this.queueMutation('periods', 'DELETE', { id });
  }

  // === SEED ===
  static async seedAcademicData(schoolId: string): Promise<void> {
    const existingYears = await this.listAcademicYears(schoolId);
    if (existingYears.length > 0) {
      return; // Already seeded
    }

    const yearsToSeed = [
      { name: '2022-2023', start: '2022-09-01', end: '2023-06-30', active: false },
      { name: '2023-2024', start: '2023-09-01', end: '2024-06-30', active: false },
      { name: '2024-2025', start: '2024-09-01', end: '2025-06-30', active: true },
    ];

    for (const y of yearsToSeed) {
      const year = await this.createAcademicYear({
        school_id: schoolId,
        name: y.name,
        start_date: y.start,
        end_date: y.end,
        is_active: y.active
      });

      // Seed Trimesters
      const startYear = parseInt(y.start.split('-')[0]);
      const nextYear = startYear + 1;
      
      await this.createPeriod({
        school_id: schoolId,
        academic_year_id: year.id,
        name: 'Trimestre 1',
        start_date: `${startYear}-09-01`,
        end_date: `${startYear}-11-30`
      });

      await this.createPeriod({
        school_id: schoolId,
        academic_year_id: year.id,
        name: 'Trimestre 2',
        start_date: `${startYear}-12-01`,
        end_date: `${nextYear}-02-28`
      });

      await this.createPeriod({
        school_id: schoolId,
        academic_year_id: year.id,
        name: 'Trimestre 3',
        start_date: `${nextYear}-03-01`,
        end_date: `${nextYear}-06-30`
      });
    }
  }
}
