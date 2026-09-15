import { getDb } from './local/db';

export class ReportService {
  // === EFFECTIFS (Élèves par classe) ===
  static async getStudentsByClassReport(schoolId: string, academicYearId: string): Promise<Record<string, any[]>> {
    const db = await getDb();
    const rows = await db.select<any[]>(
      `SELECT e.status, e.enrollment_date,
              s.matricule, s.first_name, s.last_name, s.gender, s.birth_date, s.parent_contact,
              c.name as class_name
       FROM enrollments e
       LEFT JOIN students s ON e.student_id = s.id
       LEFT JOIN classes c ON e.class_id = c.id
       WHERE e.school_id = $1 AND e.academic_year_id = $2 AND e.deleted_at IS NULL`,
      [schoolId, academicYearId]
    );

    const grouped: Record<string, any[]> = {};
    rows.forEach((row: any) => {
      const className = row.class_name || 'Inconnue';
      if (!grouped[className]) grouped[className] = [];
      grouped[className].push({
        matricule: row.matricule,
        first_name: row.first_name,
        last_name: row.last_name,
        gender: row.gender,
        birth_date: row.birth_date,
        parent_contact: row.parent_contact,
        status: row.status
      });
    });
    return grouped;
  }

  // === ENSEIGNANTS ===
  static async getTeachersReport(schoolId: string): Promise<any[]> {
    const db = await getDb();
    return db.select<any[]>(
      `SELECT * FROM teachers WHERE school_id = $1 AND deleted_at IS NULL ORDER BY last_name ASC`,
      [schoolId]
    );
  }

  // === ABSENCES ===
  static async getAbsencesReport(schoolId: string, _academicYearId: string): Promise<any[]> {
    const db = await getDb();
    return db.select<any[]>(
      `SELECT a.date, a.status, a.justification,
              s.first_name, s.last_name, s.matricule,
              c.name as class_name
       FROM attendance a
       LEFT JOIN students s ON a.student_id = s.id
       LEFT JOIN classes c ON a.class_id = c.id
       WHERE a.school_id = $1 AND a.status IN ('absent','late') AND a.deleted_at IS NULL
       ORDER BY a.date DESC`,
      [schoolId]
    );
  }

  // === IMPAYÉS (Unpaid Fees) ===
  static async getUnpaidFeesReport(schoolId: string, academicYearId: string): Promise<any[]> {
    const db = await getDb();

    // 1. Total des frais obligatoires
    const fees = await db.select<{ amount: number }[]>(
      `SELECT amount FROM fee_definitions WHERE school_id = $1 AND academic_year_id = $2 AND is_mandatory = 1 AND deleted_at IS NULL`,
      [schoolId, academicYearId]
    );
    const totalDuePerStudent = fees.reduce((acc, f) => acc + Number(f.amount), 0);

    // 2. Élèves inscrits cette année
    const enrollments = await db.select<any[]>(
      `SELECT e.student_id, s.first_name, s.last_name, s.matricule, c.name as class_name
       FROM enrollments e
       LEFT JOIN students s ON e.student_id = s.id
       LEFT JOIN classes c ON e.class_id = c.id
       WHERE e.school_id = $1 AND e.academic_year_id = $2 AND e.deleted_at IS NULL`,
      [schoolId, academicYearId]
    );

    // 3. Paiements
    const payments = await db.select<{ student_id: string; amount: number }[]>(
      `SELECT student_id, amount FROM payments WHERE school_id = $1 AND academic_year_id = $2 AND deleted_at IS NULL`,
      [schoolId, academicYearId]
    );
    const paidByStudent: Record<string, number> = {};
    payments.forEach(p => { paidByStudent[p.student_id] = (paidByStudent[p.student_id] || 0) + Number(p.amount); });

    // 4. Calcul des impayés
    const unpaidList: any[] = [];
    enrollments.forEach(enr => {
      const paid = paidByStudent[enr.student_id] || 0;
      const balance = totalDuePerStudent - paid;
      if (balance > 0) {
        unpaidList.push({
          matricule: enr.matricule,
          first_name: enr.first_name,
          last_name: enr.last_name,
          class_name: enr.class_name,
          total_due: totalDuePerStudent,
          total_paid: paid,
          balance
        });
      }
    });

    return unpaidList.sort((a, b) => b.balance - a.balance);
  }
}
