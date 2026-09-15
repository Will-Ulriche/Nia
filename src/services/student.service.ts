import { getDb, queueMutation } from './local/db';
import type { Student, Enrollment } from '../types/database';

const now = () => new Date().toISOString();
const makeId = () => crypto.randomUUID();

export class StudentService {
  // === STUDENTS ===

  static async listStudents(schoolId: string): Promise<Student[]> {
    const db = await getDb();
    return db.select<Student[]>(`SELECT * FROM students WHERE school_id = $1 AND deleted_at IS NULL ORDER BY last_name ASC`, [schoolId]);
  }

  static async getStudent(id: string): Promise<Student> {
    const db = await getDb();
    const rows = await db.select<Student[]>(`SELECT * FROM students WHERE id = $1`, [id]);
    if (!rows.length) throw new Error('Student not found');
    return rows[0];
  }

  static async createStudent(payload: Partial<Student>): Promise<Student> {
    const db = await getDb();
    const record: Student = { id: makeId(), version: 1, created_at: now(), updated_at: now(), updated_by: null, device_id: null, deleted_at: null, ...payload } as Student;
    await db.execute(
      `INSERT INTO students (id, school_id, matricule, first_name, last_name, gender, birth_date, birth_place, address, contact_phone, contact_email, parent_name, parent_contact, version, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
      [record.id, record.school_id, record.matricule, record.first_name, record.last_name, record.gender, record.birth_date, record.birth_place, record.address, record.contact_phone, record.contact_email, record.parent_name, record.parent_contact, record.version, record.created_at, record.updated_at]
    );
    await queueMutation('students', 'INSERT', record);
    return record;
  }

  static async updateStudent(id: string, payload: Partial<Student>): Promise<Student> {
    const db = await getDb();
    const updatedAt = now();
    const sets: string[] = [`updated_at = $1`];
    const vals: any[] = [updatedAt];
    let idx = 2;
    const fields = ['matricule','first_name','last_name','gender','birth_date','birth_place','address','contact_phone','contact_email','parent_name','parent_contact'] as const;
    for (const f of fields) {
      if ((payload as any)[f] !== undefined) { sets.push(`${f} = $${idx++}`); vals.push((payload as any)[f]); }
    }
    vals.push(id);
    await db.execute(`UPDATE students SET ${sets.join(', ')} WHERE id = $${idx}`, vals);
    await queueMutation('students', 'UPDATE', { id, ...payload });
    return StudentService.getStudent(id);
  }

  static async deleteStudent(id: string): Promise<void> {
    const db = await getDb();
    await db.execute(`UPDATE students SET deleted_at = $1 WHERE id = $2`, [now(), id]);
    await queueMutation('students', 'DELETE', { id });
  }

  // === ENROLLMENTS ===

  static async getStudentEnrollments(studentId: string): Promise<Enrollment[]> {
    const db = await getDb();
    // Join with classes and academic_years for display names
    return db.select<Enrollment[]>(
      `SELECT e.*, c.name as class_name, ay.name as academic_year_name 
       FROM enrollments e
       LEFT JOIN classes c ON e.class_id = c.id
       LEFT JOIN academic_years ay ON e.academic_year_id = ay.id
       WHERE e.student_id = $1 AND e.deleted_at IS NULL ORDER BY e.created_at DESC`,
      [studentId]
    );
  }

  static async listEnrollmentsByClass(classId: string, academicYearId: string): Promise<Enrollment[]> {
    const db = await getDb();
    return db.select<Enrollment[]>(
      `SELECT e.*, s.id as student_id, s.first_name, s.last_name, s.matricule, s.gender, s.parent_contact
       FROM enrollments e
       LEFT JOIN students s ON e.student_id = s.id
       WHERE e.class_id = $1 AND e.academic_year_id = $2 AND e.deleted_at IS NULL`,
      [classId, academicYearId]
    );
  }

  static async createEnrollment(payload: Partial<Enrollment>): Promise<Enrollment> {
    const db = await getDb();
    const record: Enrollment = { id: makeId(), version: 1, created_at: now(), updated_at: now(), updated_by: null, device_id: null, deleted_at: null, status: 'active', enrollment_date: now().substring(0, 10), ...payload } as Enrollment;
    await db.execute(
      `INSERT INTO enrollments (id, school_id, student_id, class_id, academic_year_id, status, enrollment_date, version, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [record.id, record.school_id, record.student_id, record.class_id, record.academic_year_id, record.status, record.enrollment_date, record.version, record.created_at, record.updated_at]
    );
    await queueMutation('enrollments', 'INSERT', record);
    return record;
  }

  static async updateEnrollment(id: string, payload: Partial<Enrollment>): Promise<Enrollment> {
    const db = await getDb();
    const updatedAt = now();
    const sets: string[] = [`updated_at = $1`];
    const vals: any[] = [updatedAt];
    let idx = 2;
    if (payload.status !== undefined) { sets.push(`status = $${idx++}`); vals.push(payload.status); }
    if (payload.class_id !== undefined) { sets.push(`class_id = $${idx++}`); vals.push(payload.class_id); }
    vals.push(id);
    await db.execute(`UPDATE enrollments SET ${sets.join(', ')} WHERE id = $${idx}`, vals);
    await queueMutation('enrollments', 'UPDATE', { id, ...payload });
    const rows = await db.select<Enrollment[]>(`SELECT * FROM enrollments WHERE id = $1`, [id]);
    return rows[0];
  }

  static async deleteEnrollment(id: string): Promise<void> {
    const db = await getDb();
    await db.execute(`UPDATE enrollments SET deleted_at = $1 WHERE id = $2`, [now(), id]);
    await queueMutation('enrollments', 'DELETE', { id });
  }
}
