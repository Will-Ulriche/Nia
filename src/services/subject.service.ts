import { getDb, queueMutation } from './local/db';
import type { Subject } from '../types/database';

const now = () => new Date().toISOString();
const makeId = () => crypto.randomUUID();

export class SubjectService {
  static async listSubjects(schoolId: string, includeArchived = false): Promise<Subject[]> {
    const db = await getDb();
    if (includeArchived) {
      return db.select<Subject[]>(`SELECT * FROM subjects WHERE school_id = $1 ORDER BY name ASC`, [schoolId]);
    }
    return db.select<Subject[]>(`SELECT * FROM subjects WHERE school_id = $1 AND deleted_at IS NULL ORDER BY name ASC`, [schoolId]);
  }

  static async getSubject(id: string): Promise<Subject> {
    const db = await getDb();
    const rows = await db.select<Subject[]>(`SELECT * FROM subjects WHERE id = $1`, [id]);
    if (!rows.length) throw new Error('Subject not found');
    return rows[0];
  }

  static async createSubject(payload: Partial<Subject>): Promise<Subject> {
    const db = await getDb();
    const record: Subject = { id: makeId(), version: 1, created_at: now(), updated_at: now(), updated_by: null, device_id: null, deleted_at: null, code: null, description: null, ...payload } as Subject;
    await db.execute(
      `INSERT INTO subjects (id, school_id, name, code, description, version, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [record.id, record.school_id, record.name, record.code, record.description, record.version, record.created_at, record.updated_at]
    );
    await queueMutation('subjects', 'INSERT', record);
    return record;
  }

  static async updateSubject(id: string, payload: Partial<Subject>): Promise<Subject> {
    const db = await getDb();
    const updatedAt = now();
    const sets: string[] = [`updated_at = $1`];
    const vals: any[] = [updatedAt];
    let idx = 2;
    if (payload.name !== undefined) { sets.push(`name = $${idx++}`); vals.push(payload.name); }
    if (payload.code !== undefined) { sets.push(`code = $${idx++}`); vals.push(payload.code); }
    if (payload.description !== undefined) { sets.push(`description = $${idx++}`); vals.push(payload.description); }
    vals.push(id);
    await db.execute(`UPDATE subjects SET ${sets.join(', ')} WHERE id = $${idx}`, vals);
    await queueMutation('subjects', 'UPDATE', { id, ...payload });
    return SubjectService.getSubject(id);
  }

  static async deactivateSubject(id: string): Promise<void> {
    const db = await getDb();
    await db.execute(`UPDATE subjects SET deleted_at = $1 WHERE id = $2`, [now(), id]);
    await queueMutation('subjects', 'DELETE', { id });
  }

  static async reactivateSubject(id: string): Promise<void> {
    const db = await getDb();
    await db.execute(`UPDATE subjects SET deleted_at = NULL WHERE id = $1`, [id]);
    await queueMutation('subjects', 'UPDATE', { id, deleted_at: null });
  }
}
