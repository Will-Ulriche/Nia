import { getDb, queueMutation } from './local/db';
import type { Teacher, TeacherAssignment } from '../types/database';

const now = () => new Date().toISOString();
const makeId = () => crypto.randomUUID();

export class TeacherService {
  // === TEACHERS ===

  static async listTeachers(schoolId: string): Promise<Teacher[]> {
    const db = await getDb();
    return db.select<Teacher[]>(`SELECT * FROM teachers WHERE school_id = $1 AND deleted_at IS NULL ORDER BY last_name ASC`, [schoolId]);
  }

  static async getTeacher(id: string): Promise<Teacher> {
    const db = await getDb();
    const rows = await db.select<Teacher[]>(`SELECT * FROM teachers WHERE id = $1`, [id]);
    if (!rows.length) throw new Error('Teacher not found');
    return rows[0];
  }

  static async createTeacher(payload: Partial<Teacher>): Promise<Teacher> {
    const db = await getDb();
    const record: Teacher = { id: makeId(), version: 1, created_at: now(), updated_at: now(), updated_by: null, device_id: null, deleted_at: null, profile_id: null, ...payload } as Teacher;
    await db.execute(
      `INSERT INTO teachers (id, school_id, profile_id, first_name, last_name, contact_phone, contact_email, version, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [record.id, record.school_id, record.profile_id, record.first_name, record.last_name, record.contact_phone, record.contact_email, record.version, record.created_at, record.updated_at]
    );
    await queueMutation('teachers', 'INSERT', record);
    return record;
  }

  static async updateTeacher(id: string, payload: Partial<Teacher>): Promise<Teacher> {
    const db = await getDb();
    const updatedAt = now();
    const sets: string[] = [`updated_at = $1`];
    const vals: any[] = [updatedAt];
    let idx = 2;
    const fields = ['first_name','last_name','contact_phone','contact_email'] as const;
    for (const f of fields) {
      if ((payload as any)[f] !== undefined) { sets.push(`${f} = $${idx++}`); vals.push((payload as any)[f]); }
    }
    vals.push(id);
    await db.execute(`UPDATE teachers SET ${sets.join(', ')} WHERE id = $${idx}`, vals);
    await queueMutation('teachers', 'UPDATE', { id, ...payload });
    return TeacherService.getTeacher(id);
  }

  static async deleteTeacher(id: string): Promise<void> {
    const db = await getDb();
    await db.execute(`UPDATE teachers SET deleted_at = $1 WHERE id = $2`, [now(), id]);
    await queueMutation('teachers', 'DELETE', { id });
  }

  // === TEACHER ASSIGNMENTS ===

  static async listAssignments(schoolId: string, academicYearId?: string, teacherId?: string): Promise<TeacherAssignment[]> {
    const db = await getDb();
    let sql = `SELECT ta.*, t.first_name as teacher_first_name, t.last_name as teacher_last_name,
               s.name as subject_name, s.code as subject_code, c.name as class_name
               FROM teacher_assignments ta
               LEFT JOIN teachers t ON ta.teacher_id = t.id
               LEFT JOIN subjects s ON ta.subject_id = s.id
               LEFT JOIN classes c ON ta.class_id = c.id
               WHERE ta.school_id = $1 AND ta.deleted_at IS NULL`;
    const params: any[] = [schoolId];
    let idx = 2;
    if (academicYearId) { sql += ` AND ta.academic_year_id = $${idx++}`; params.push(academicYearId); }
    if (teacherId)      { sql += ` AND ta.teacher_id = $${idx++}`; params.push(teacherId); }
    return db.select<TeacherAssignment[]>(sql, params);
  }

  static async createAssignment(payload: Partial<TeacherAssignment>): Promise<TeacherAssignment> {
    const db = await getDb();
    const record: TeacherAssignment = { id: makeId(), version: 1, created_at: now(), updated_at: now(), updated_by: null, device_id: null, deleted_at: null, ...payload } as TeacherAssignment;
    await db.execute(
      `INSERT INTO teacher_assignments (id, school_id, teacher_id, subject_id, class_id, academic_year_id, version, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [record.id, record.school_id, record.teacher_id, record.subject_id, record.class_id, record.academic_year_id, record.version, record.created_at, record.updated_at]
    );
    await queueMutation('teacher_assignments', 'INSERT', record);
    return record;
  }

  static async deleteAssignment(id: string): Promise<void> {
    const db = await getDb();
    await db.execute(`UPDATE teacher_assignments SET deleted_at = $1 WHERE id = $2`, [now(), id]);
    await queueMutation('teacher_assignments', 'DELETE', { id });
  }
}
