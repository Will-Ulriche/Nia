import { getDb, queueMutation, type SqlValue } from './local/db';
import type { Assessment, Grade } from '../types/database';
import { CalculationService } from './calculation.service';

const now = () => new Date().toISOString();
const makeId = () => crypto.randomUUID();

export class GradeService {
  // === ASSESSMENTS (Évaluations) ===

  static async listAssessments(schoolId: string, classId?: string, periodId?: string, subjectId?: string): Promise<Assessment[]> {
    const db = await getDb();
    let sql = `SELECT a.*, c.name as class_name, s.name as subject_name, s.code as subject_code,
               p.name as period_name, t.first_name as teacher_first_name, t.last_name as teacher_last_name
               FROM assessments a
               LEFT JOIN classes c ON a.class_id = c.id
               LEFT JOIN subjects s ON a.subject_id = s.id
               LEFT JOIN periods p ON a.period_id = p.id
               LEFT JOIN teachers t ON a.teacher_id = t.id
               WHERE a.school_id = $1 AND a.deleted_at IS NULL`;
    const params: SqlValue[] = [schoolId];
    let idx = 2;
    if (classId) { sql += ` AND a.class_id = $${idx++}`; params.push(classId); }
    if (periodId) { sql += ` AND a.period_id = $${idx++}`; params.push(periodId); }
    if (subjectId) { sql += ` AND a.subject_id = $${idx++}`; params.push(subjectId); }
    sql += ' ORDER BY a.assessment_date DESC';
    return db.select<Assessment[]>(sql, params);
  }

  static async getAssessment(id: string): Promise<Assessment> {
    const db = await getDb();
    const rows = await db.select<Assessment[]>(
      `SELECT a.*, c.name as class_name, s.name as subject_name, s.code as subject_code,
              p.id as period_id, p.name as period_name, p.academic_year_id
       FROM assessments a
       LEFT JOIN classes c ON a.class_id = c.id
       LEFT JOIN subjects s ON a.subject_id = s.id
       LEFT JOIN periods p ON a.period_id = p.id
       WHERE a.id = $1`, [id]
    );
    if (!rows.length) throw new Error('Assessment not found');
    return rows[0];
  }

  static async createAssessment(payload: Partial<Assessment>): Promise<Assessment> {
    const db = await getDb();
    const record: Assessment = { id: makeId(), version: 1, created_at: now(), updated_at: now(), updated_by: null, device_id: null, deleted_at: null, teacher_id: null, total_score: 20, weight: 1, ...payload } as Assessment;
    await db.execute(
      `INSERT INTO assessments (id, school_id, class_id, subject_id, period_id, teacher_id, title, assessment_date, total_score, weight, version, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [record.id, record.school_id, record.class_id, record.subject_id, record.period_id, record.teacher_id, record.title, record.assessment_date, record.total_score, record.weight, record.version, record.created_at, record.updated_at]
    );
    await queueMutation('assessments', 'INSERT', record);
    return record;
  }

  static async updateAssessment(id: string, payload: Partial<Assessment>): Promise<Assessment> {
    const db = await getDb();
    const updatedAt = now();
    const sets: string[] = [`updated_at = $1`];
    const vals: (string | number | boolean | null)[] = [updatedAt];
    let idx = 2;
    const fields = ['title','assessment_date','total_score','weight','teacher_id'] as const;
    for (const f of fields) {
      const value = payload[f];
      if (value !== undefined) { sets.push(`${f} = $${idx++}`); vals.push(value); }
    }
    vals.push(id);
    await db.execute(`UPDATE assessments SET ${sets.join(', ')} WHERE id = $${idx}`, vals);
    await queueMutation('assessments', 'UPDATE', { id, ...payload });
    return GradeService.getAssessment(id);
  }

  static async deleteAssessment(id: string): Promise<void> {
    const db = await getDb();
    await db.execute(`UPDATE assessments SET deleted_at = $1 WHERE id = $2`, [now(), id]);
    await queueMutation('assessments', 'DELETE', { id });
  }

  // === GRADES (Notes) ===

  static async getGradesForAssessment(assessmentId: string): Promise<Grade[]> {
    const db = await getDb();
    return db.select<Grade[]>(
      `SELECT g.*, s.first_name, s.last_name, s.matricule
       FROM grades g
       LEFT JOIN students s ON g.student_id = s.id
       WHERE g.assessment_id = $1 AND g.deleted_at IS NULL`,
      [assessmentId]
    );
  }

  static async upsertGrade(payload: Partial<Grade>, userId?: string): Promise<Grade> {
    const db = await getDb();
    const existing = await db.select<{ id: string }[]>(
      `SELECT id FROM grades WHERE assessment_id = $1 AND student_id = $2 AND deleted_at IS NULL`,
      [payload.assessment_id, payload.student_id]
    );

    let result: Grade;
    if (existing.length) {
      const id = existing[0].id;
      const updatedAt = now();
      await db.execute(
        `UPDATE grades SET score = $1, is_absent = $2, comments = $3, updated_at = $4 WHERE id = $5`,
        [payload.score ?? null, payload.is_absent ? 1 : 0, payload.comments ?? null, updatedAt, id]
      );
      await queueMutation('grades', 'UPDATE', { id, score: payload.score, is_absent: payload.is_absent, comments: payload.comments });
      const rows = await db.select<Grade[]>(`SELECT * FROM grades WHERE id = $1`, [id]);
      result = { ...rows[0], is_absent: Boolean(rows[0].is_absent) };
    } else {
      const record: Grade = { id: makeId(), version: 1, created_at: now(), updated_at: now(), updated_by: null, device_id: null, deleted_at: null, score: null, is_absent: false, comments: null, ...payload } as Grade;
      await db.execute(
        `INSERT INTO grades (id, school_id, assessment_id, student_id, score, is_absent, comments, version, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [record.id, record.school_id, record.assessment_id, record.student_id, record.score, record.is_absent ? 1 : 0, record.comments, record.version, record.created_at, record.updated_at]
      );
      await queueMutation('grades', 'INSERT', record);
      result = { ...record, is_absent: Boolean(record.is_absent) };
    }
    
    // LOG AUDIT
    if (userId && payload.school_id) {
        const { AuditService } = await import('./audit.service');
        await AuditService.logAction({
            schoolId: payload.school_id,
            userId,
            action: existing.length ? 'UPDATE_GRADE' : 'CREATE_GRADE',
            entityType: 'grade',
            entityId: result.id,
            details: { score: payload.score, is_absent: payload.is_absent }
        });
    }

    // Recalcul automatique des moyennes (fire-and-forget)
    try {
      const assessmentRows = await db.select<any[]>(
        `SELECT a.school_id, a.class_id, a.period_id, p.academic_year_id
         FROM assessments a LEFT JOIN periods p ON a.period_id = p.id
         WHERE a.id = $1`, [payload.assessment_id]
      );
      if (assessmentRows.length) {
        const ass = assessmentRows[0];
        if (ass.academic_year_id) {
          CalculationService.recalculateForClass(ass.school_id, ass.class_id, ass.period_id, ass.academic_year_id).catch(console.error);
        }
      }
    } catch { /* Recalcul optionnel */ }

    return result;
  }
}
