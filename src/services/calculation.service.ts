import { getDb, queueMutation } from './local/db';
import type { LocalDatabase } from './local/db';
import type { Average } from '../types/database';

// -------------------------------------------------------
// Types internes au moteur de calcul
// -------------------------------------------------------
interface GradeRow {
  score: number | null;
  is_absent: boolean | number;
  assessments: {
    id: string;
    subject_id: string;
    total_score: number;
    weight: number;
  };
}

interface SubjectAverage {
  subject_id: string;
  average: number; // note sur 20
}

// -------------------------------------------------------
// Logique de calcul pure (pas de side effects)
// -------------------------------------------------------
export function computeSubjectAverage(
  grades: GradeRow[],
  subjectId: string
): number | null {
  const subjectGrades = grades.filter(
    (g) => g.assessments.subject_id === subjectId && !g.is_absent && g.score !== null
  );
  if (subjectGrades.length === 0) return null;

  let weightedSum = 0;
  let totalWeight = 0;

  for (const g of subjectGrades) {
    const normalised = ((g.score as number) / g.assessments.total_score) * 20;
    weightedSum += normalised * g.assessments.weight;
    totalWeight += g.assessments.weight;
  }

  return totalWeight === 0 ? null : parseFloat((weightedSum / totalWeight).toFixed(2));
}

export function computeGeneralAverage(subjectAverages: SubjectAverage[]): number | null {
  if (subjectAverages.length === 0) return null;
  const sum = subjectAverages.reduce((acc, sa) => acc + sa.average, 0);
  return parseFloat((sum / subjectAverages.length).toFixed(2));
}

export function getAppreciation(avg: number): string {
  if (avg >= 18) return 'Excellent';
  if (avg >= 16) return 'Très bien';
  if (avg >= 14) return 'Bien';
  if (avg >= 12) return 'Assez bien';
  if (avg >= 10) return 'Passable';
  if (avg >= 8)  return 'Insuffisant';
  return 'Très insuffisant';
}

const now = () => new Date().toISOString();
const makeId = () => crypto.randomUUID();

// -------------------------------------------------------
// Service local (SQLite)
// -------------------------------------------------------
export class CalculationService {
  /**
   * Calcule et stocke AUTOMATIQUEMENT les moyennes
   * pour tous les élèves d'une classe sur une période donnée.
   * À appeler après chaque upsert de note (depuis GradeService).
   * Toutes les lectures/écritures se font sur la base SQLite locale.
   */
  static async recalculateForClass(
    schoolId: string,
    classId: string,
    periodId: string,
    academicYearId: string
  ): Promise<void> {
    const db = await getDb();

    // 1. Charger tous les élèves inscrits dans cette classe/année
    const enrollments = await db.select<{ student_id: string }[]>(
      `SELECT student_id FROM enrollments WHERE school_id = $1 AND class_id = $2 AND academic_year_id = $3 AND deleted_at IS NULL`,
      [schoolId, classId, academicYearId]
    );
    if (enrollments.length === 0) return;

    // 2. Charger toutes les évaluations de cette classe/période
    const assessments = await db.select<{ id: string; subject_id: string; total_score: number; weight: number }[]>(
      `SELECT id, subject_id, total_score, weight FROM assessments WHERE school_id = $1 AND class_id = $2 AND period_id = $3 AND deleted_at IS NULL`,
      [schoolId, classId, periodId]
    );
    if (assessments.length === 0) return;

    const assessmentIds = assessments.map((a) => a.id);
    const subjectIds = [...new Set(assessments.map((a) => a.subject_id))];

    // 3. Charger toutes les notes pour ces évaluations
    // SQLite doesn't support IN with dynamic array natively in all drivers,
    // so we build a parameterized query.
    const placeholders = assessmentIds.map((_, i) => `$${i + 1}`).join(', ');
    const grades = await db.select<{ student_id: string; score: number | null; is_absent: number; assessment_id: string }[]>(
      `SELECT student_id, score, is_absent, assessment_id FROM grades WHERE assessment_id IN (${placeholders}) AND deleted_at IS NULL`,
      assessmentIds
    );

    // 4. Calculer pour chaque élève
    const studentAveragesList: Array<{ student_id: string; general: number | null; subjects: SubjectAverage[] }> = [];

    for (const enr of enrollments) {
      const studentId = enr.student_id;

      const studentGrades: GradeRow[] = grades
        .filter((g) => g.student_id === studentId)
        .map((g) => ({
          score: g.score,
          is_absent: g.is_absent,
          assessments: assessments.find((a) => a.id === g.assessment_id)!,
        }))
        .filter((g) => g.assessments);

      // Moyenne par matière
      const subjectAverages: SubjectAverage[] = [];
      for (const subId of subjectIds) {
        const avg = computeSubjectAverage(studentGrades, subId);
        if (avg !== null) {
          subjectAverages.push({ subject_id: subId, average: avg });
        }
      }

      const general = computeGeneralAverage(subjectAverages);
      studentAveragesList.push({ student_id: studentId, general, subjects: subjectAverages });
    }

    // 5. Calculer les classements (par moyenne générale)
    const ranked = [...studentAveragesList]
      .filter((s) => s.general !== null)
      .sort((a, b) => (b.general as number) - (a.general as number));

    const rankMap: Record<string, number> = {};
    ranked.forEach((s, idx) => { rankMap[s.student_id] = idx + 1; });

    // 6. Upsert des moyennes dans SQLite et dans la file de mutations
    for (const s of studentAveragesList) {
      // Moyennes par matière
      for (const sa of s.subjects) {
        await CalculationService._upsertAverage(db, {
          school_id: schoolId,
          student_id: s.student_id,
          period_id: periodId,
          class_id: classId,
          subject_id: sa.subject_id,
          average: sa.average,
          rank: null,
          appreciation: getAppreciation(sa.average),
        });
      }

      // Moyenne générale (subject_id = null)
      if (s.general !== null) {
        await CalculationService._upsertAverage(db, {
          school_id: schoolId,
          student_id: s.student_id,
          period_id: periodId,
          class_id: classId,
          subject_id: null,
          average: s.general,
          rank: rankMap[s.student_id] || null,
          appreciation: getAppreciation(s.general),
        });
      }
    }
  }

  private static async _upsertAverage(db: LocalDatabase, payload: Partial<Average>) {
    // Two separate queries to avoid dynamic param count, which can be fragile
    // with some SQLite drivers (including Tauri's plugin-sql).
    let existing: { id: string }[];

    if (payload.subject_id === null || payload.subject_id === undefined) {
      existing = await db.select<{ id: string }[]>(
        `SELECT id FROM averages WHERE student_id = $1 AND period_id = $2 AND subject_id IS NULL`,
        [payload.student_id, payload.period_id]
      );
    } else {
      existing = await db.select<{ id: string }[]>(
        `SELECT id FROM averages WHERE student_id = $1 AND period_id = $2 AND subject_id = $3`,
        [payload.student_id, payload.period_id, payload.subject_id]
      );
    }

    if (existing.length) {
      const id = existing[0].id;
      const updatedAt = now();
      await db.execute(
        `UPDATE averages SET average = $1, rank = $2, appreciation = $3, updated_at = $4 WHERE id = $5`,
        [payload.average, payload.rank ?? null, payload.appreciation, updatedAt, id]
      );
      await queueMutation('averages', 'UPDATE', { id, average: payload.average, rank: payload.rank, appreciation: payload.appreciation });
    } else {
      const record: Average = {
        id: makeId(), version: 1, created_at: now(), updated_at: now(), updated_by: null, device_id: null, deleted_at: null,
        ...payload
      } as Average;
      await db.execute(
        `INSERT INTO averages (id, school_id, student_id, period_id, class_id, subject_id, average, rank, appreciation, version, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [record.id, record.school_id, record.student_id, record.period_id, record.class_id, record.subject_id, record.average, record.rank, record.appreciation, record.version, record.created_at, record.updated_at]
      );
      await queueMutation('averages', 'INSERT', record);
    }
  }

  // Lire les moyennes générales d'une classe / période
  static async getClassAverages(
    schoolId: string,
    classId: string,
    periodId: string
  ): Promise<Average[]> {
    const db = await getDb();
    return db.select<Average[]>(
      `SELECT a.*, s.first_name, s.last_name, s.matricule, sub.name as subject_name, sub.code as subject_code
       FROM averages a
       LEFT JOIN students s ON a.student_id = s.id
       LEFT JOIN subjects sub ON a.subject_id = sub.id
       WHERE a.school_id = $1 AND a.class_id = $2 AND a.period_id = $3
       ORDER BY a.rank ASC`,
      [schoolId, classId, periodId]
    );
  }
}
