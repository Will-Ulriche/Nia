import { getDb, queueMutation } from './local/db';
import type { Attendance } from '../types/database';

const now = () => new Date().toISOString();
const makeId = () => crypto.randomUUID();

export class AttendanceService {
  static async listByClassAndDate(schoolId: string, classId: string, date: string): Promise<Attendance[]> {
    const db = await getDb();
    return db.select<Attendance[]>(
      `SELECT a.*, s.first_name, s.last_name, s.matricule
       FROM attendance a
       LEFT JOIN students s ON a.student_id = s.id
       WHERE a.school_id = $1 AND a.class_id = $2 AND a.date = $3 AND a.deleted_at IS NULL`,
      [schoolId, classId, date]
    );
  }

  static async listByStudent(studentId: string, classId: string, periodId?: string): Promise<Attendance[]> {
    const db = await getDb();
    if (periodId) {
      return db.select<Attendance[]>(
        `SELECT * FROM attendance WHERE student_id = $1 AND class_id = $2 AND period_id = $3 AND deleted_at IS NULL ORDER BY date DESC`,
        [studentId, classId, periodId]
      );
    }
    return db.select<Attendance[]>(
      `SELECT * FROM attendance WHERE student_id = $1 AND class_id = $2 AND deleted_at IS NULL ORDER BY date DESC`,
      [studentId, classId]
    );
  }

  static async upsertAttendance(payload: Partial<Attendance>): Promise<Attendance> {
    const db = await getDb();
    const existing = await db.select<{ id: string }[]>(
      `SELECT id FROM attendance WHERE student_id = $1 AND class_id = $2 AND date = $3 AND deleted_at IS NULL`,
      [payload.student_id, payload.class_id, payload.date]
    );

    if (existing.length) {
      const id = existing[0].id;
      await db.execute(
        `UPDATE attendance SET status = $1, justification = $2, period_id = $3, updated_at = $4 WHERE id = $5`,
        [payload.status, payload.justification ?? null, payload.period_id ?? null, now(), id]
      );
      await queueMutation('attendance', 'UPDATE', { id, status: payload.status, justification: payload.justification, period_id: payload.period_id });
      const rows = await db.select<Attendance[]>(`SELECT * FROM attendance WHERE id = $1`, [id]);
      return rows[0];
    } else {
      const record: Attendance = { id: makeId(), version: 1, created_at: now(), updated_at: now(), updated_by: null, device_id: null, deleted_at: null, justification: null, period_id: null, ...payload } as Attendance;
      await db.execute(
        `INSERT INTO attendance (id, school_id, student_id, class_id, period_id, date, status, justification, version, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [record.id, record.school_id, record.student_id, record.class_id, record.period_id, record.date, record.status, record.justification, record.version, record.created_at, record.updated_at]
      );
      await queueMutation('attendance', 'INSERT', record);
      return record;
    }
  }

  static async deleteAttendance(id: string): Promise<void> {
    const db = await getDb();
    await db.execute(`UPDATE attendance SET deleted_at = $1 WHERE id = $2`, [now(), id]);
    await queueMutation('attendance', 'DELETE', { id });
  }

  static async getStudentStats(studentId: string, classId: string, periodId?: string): Promise<{ total: number; present: number; absent: number; late: number; excused: number }> {
    const records = await AttendanceService.listByStudent(studentId, classId, periodId);
    return {
      total: records.length,
      present: records.filter(r => r.status === 'present').length,
      absent: records.filter(r => r.status === 'absent').length,
      late: records.filter(r => r.status === 'late').length,
      excused: records.filter(r => r.status === 'excused').length,
    };
  }
}
