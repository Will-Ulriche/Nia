import { getDb, queueMutation, type SqlValue } from './local/db';
import type { FeeDefinition, Payment, Receipt, Expense } from '../types/database';

const now = () => new Date().toISOString();
const makeId = () => crypto.randomUUID();

export class FinanceService {
  // === DÉFINITIONS DE FRAIS ===

  static async listFeeDefinitions(schoolId: string, academicYearId: string): Promise<FeeDefinition[]> {
    const db = await getDb();
    const rows = await db.select<FeeDefinition[]>(
      `SELECT * FROM fee_definitions WHERE school_id = $1 AND academic_year_id = $2 AND deleted_at IS NULL ORDER BY name ASC`,
      [schoolId, academicYearId]
    );
    return rows.map(r => ({ ...r, is_mandatory: Boolean(r.is_mandatory) }));
  }

  static async upsertFeeDefinition(payload: Partial<FeeDefinition>): Promise<FeeDefinition> {
    const db = await getDb();
    if (payload.id) {
      const updatedAt = now();
      const sets: string[] = [`updated_at = $1`];
      const vals: SqlValue[] = [updatedAt];
      let idx = 2;
      if (payload.name !== undefined) { sets.push(`name = $${idx++}`); vals.push(payload.name); }
      if (payload.amount !== undefined) { sets.push(`amount = $${idx++}`); vals.push(payload.amount); }
      if (payload.description !== undefined) { sets.push(`description = $${idx++}`); vals.push(payload.description); }
      if (payload.is_mandatory !== undefined) { sets.push(`is_mandatory = $${idx++}`); vals.push(payload.is_mandatory ? 1 : 0); }
      vals.push(payload.id);
      await db.execute(`UPDATE fee_definitions SET ${sets.join(', ')} WHERE id = $${idx}`, vals);
      await queueMutation('fee_definitions', 'UPDATE', payload);
      const rows = await db.select<FeeDefinition[]>(`SELECT * FROM fee_definitions WHERE id = $1`, [payload.id]);
      return { ...rows[0], is_mandatory: Boolean(rows[0].is_mandatory) };
    } else {
      const record: FeeDefinition = { id: makeId(), version: 1, created_at: now(), updated_at: now(), updated_by: null, device_id: null, deleted_at: null, is_mandatory: true, description: null, ...payload } as FeeDefinition;
      await db.execute(
        `INSERT INTO fee_definitions (id, school_id, academic_year_id, name, amount, description, is_mandatory, version, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [record.id, record.school_id, record.academic_year_id, record.name, record.amount, record.description, record.is_mandatory ? 1 : 0, record.version, record.created_at, record.updated_at]
      );
      await queueMutation('fee_definitions', 'INSERT', record);
      return { ...record, is_mandatory: Boolean(record.is_mandatory) };
    }
  }

  static async deleteFeeDefinition(id: string): Promise<void> {
    const db = await getDb();
    await db.execute(`UPDATE fee_definitions SET deleted_at = $1 WHERE id = $2`, [now(), id]);
    await queueMutation('fee_definitions', 'DELETE', { id });
  }

  // === PAIEMENTS & REÇUS ===

  static async listPaymentsByStudent(schoolId: string, studentId: string, academicYearId: string): Promise<Payment[]> {
    const db = await getDb();
    return db.select<Payment[]>(
      `SELECT p.*, f.name as fee_name, r.receipt_number, r.issue_date as receipt_date
       FROM payments p
       LEFT JOIN fee_definitions f ON p.fee_definition_id = f.id
       LEFT JOIN receipts r ON r.payment_id = p.id
       WHERE p.school_id = $1 AND p.student_id = $2 AND p.academic_year_id = $3 AND p.deleted_at IS NULL
       ORDER BY p.payment_date DESC`,
      [schoolId, studentId, academicYearId]
    );
  }

  static async addPaymentWithReceipt(payload: Partial<Payment>, issuedByProfileId?: string): Promise<{ payment: Payment; receipt: Receipt }> {
    const db = await getDb();
    
    // 1. Create payment
    const payment: Payment = { id: makeId(), version: 1, created_at: now(), updated_at: now(), updated_by: null, device_id: null, deleted_at: null, ...payload } as Payment;
    await db.execute(
      `INSERT INTO payments (id, school_id, student_id, academic_year_id, fee_definition_id, amount, payment_date, payment_method, reference_number, version, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [payment.id, payment.school_id, payment.student_id, payment.academic_year_id, payment.fee_definition_id, payment.amount, payment.payment_date, payment.payment_method, payment.reference_number, payment.version, payment.created_at, payment.updated_at]
    );
    await queueMutation('payments', 'INSERT', payment);

    // 2. Generate receipt
    const year = new Date().getFullYear();
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const receiptNumber = `REC-${year}-${randomCode}-${payment.id.split('-')[0].toUpperCase()}`;
    const receipt: Receipt = {
      id: makeId(), school_id: payment.school_id!, payment_id: payment.id, receipt_number: receiptNumber,
      issued_by: issuedByProfileId || null, issue_date: now().substring(0, 10),
      version: 1, created_at: now(), updated_at: now(), updated_by: null, device_id: null, deleted_at: null
    };
    await db.execute(
      `INSERT INTO receipts (id, school_id, payment_id, receipt_number, issued_by, issue_date, version, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [receipt.id, receipt.school_id, receipt.payment_id, receipt.receipt_number, receipt.issued_by, receipt.issue_date, receipt.version, receipt.created_at, receipt.updated_at]
    );
    await queueMutation('receipts', 'INSERT', receipt);

    const { AuditService } = await import('./audit.service');
    await AuditService.logAction({
      schoolId: payment.school_id!,
      userId: issuedByProfileId, // profile.id = auth.user.id
      action: 'CREATE_PAYMENT',
      entityType: 'payment',
      entityId: payment.id,
      details: { amount: payment.amount, receipt_number: receiptNumber }
    });

    return { payment, receipt };
  }

  static async deletePayment(id: string, schoolId: string, userId: string): Promise<void> {
    const db = await getDb();
    await db.execute(`UPDATE payments SET deleted_at = $1 WHERE id = $2`, [now(), id]);
    await queueMutation('payments', 'DELETE', { id });
    
    const { AuditService } = await import('./audit.service');
    await AuditService.logAction({
      schoolId,
      userId,
      action: 'DELETE_PAYMENT',
      entityType: 'payment',
      entityId: id,
    });
  }

  // === BILAN FINANCIER (ÉLÈVE) ===

  static async getStudentFinancialSummary(schoolId: string, studentId: string, academicYearId: string): Promise<{ totalDue: number; totalPaid: number; balance: number }> {
    const db = await getDb();
    const fees = await db.select<{ amount: number }[]>(
      `SELECT amount FROM fee_definitions WHERE school_id = $1 AND academic_year_id = $2 AND is_mandatory = 1 AND deleted_at IS NULL`,
      [schoolId, academicYearId]
    );
    const totalDue = fees.reduce((acc, f) => acc + Number(f.amount), 0);

    const payments = await db.select<{ amount: number }[]>(
      `SELECT amount FROM payments WHERE school_id = $1 AND student_id = $2 AND academic_year_id = $3 AND deleted_at IS NULL`,
      [schoolId, studentId, academicYearId]
    );
    const totalPaid = payments.reduce((acc, p) => acc + Number(p.amount), 0);

    return { totalDue, totalPaid, balance: totalDue - totalPaid };
  }

  // === DÉPENSES (SORTIES) ===

  static async listExpenses(schoolId: string, academicYearId: string): Promise<Expense[]> {
    const db = await getDb();
    return db.select<Expense[]>(
      `SELECT * FROM expenses WHERE school_id = $1 AND academic_year_id = $2 AND deleted_at IS NULL ORDER BY expense_date DESC`,
      [schoolId, academicYearId]
    );
  }

  static async addExpense(payload: Partial<Expense>): Promise<Expense> {
    const db = await getDb();
    const record: Expense = { id: makeId(), version: 1, created_at: now(), updated_at: now(), updated_by: null, device_id: null, deleted_at: null, description: null, recorded_by: null, ...payload } as Expense;
    await db.execute(
      `INSERT INTO expenses (id, school_id, academic_year_id, category, amount, expense_date, description, recorded_by, version, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [record.id, record.school_id, record.academic_year_id, record.category, record.amount, record.expense_date, record.description, record.recorded_by, record.version, record.created_at, record.updated_at]
    );
    await queueMutation('expenses', 'INSERT', record);
    return record;
  }

  static async deleteExpense(id: string): Promise<void> {
    const db = await getDb();
    await db.execute(`UPDATE expenses SET deleted_at = $1 WHERE id = $2`, [now(), id]);
    await queueMutation('expenses', 'DELETE', { id });
  }

  // === BILAN GLOBAL CAISSE ===

  static async getCashRegisterSummary(schoolId: string, academicYearId: string): Promise<{ totalIncomes: number; totalExpenses: number; balance: number }> {
    const db = await getDb();
    const payments = await db.select<{ amount: number }[]>(
      `SELECT amount FROM payments WHERE school_id = $1 AND academic_year_id = $2 AND deleted_at IS NULL`,
      [schoolId, academicYearId]
    );
    const totalIncomes = payments.reduce((acc, p) => acc + Number(p.amount), 0);

    const expenses = await db.select<{ amount: number }[]>(
      `SELECT amount FROM expenses WHERE school_id = $1 AND academic_year_id = $2 AND deleted_at IS NULL`,
      [schoolId, academicYearId]
    );
    const totalExpenses = expenses.reduce((acc, e) => acc + Number(e.amount), 0);

    return { totalIncomes, totalExpenses, balance: totalIncomes - totalExpenses };
  }
}
