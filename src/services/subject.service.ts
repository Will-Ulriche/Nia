import { getDb, queueMutation } from './local/db';
import type { Subject, ClassSubject, SubjectTemplate, SubjectTemplateItem } from '../types/database';

const now = () => new Date().toISOString();
const makeId = () => crypto.randomUUID();

export class SubjectService {
  // === GLOBAL SUBJECTS (Library) ===

  static async listLibrarySubjects(schoolId: string, showArchived = false): Promise<Subject[]> {
    const db = await getDb();
    const query = showArchived
      ? `SELECT * FROM subjects WHERE school_id = $1 ORDER BY name ASC`
      : `SELECT * FROM subjects WHERE school_id = $1 AND deleted_at IS NULL ORDER BY name ASC`;
    return db.select<Subject[]>(query, [schoolId]);
  }

  static async createLibrarySubject(payload: Partial<Subject>): Promise<Subject> {
    const db = await getDb();
    const record: Subject = {
      id: makeId(), version: 1, created_at: now(), updated_at: now(),
      updated_by: null, device_id: null, deleted_at: null,
      code: null, description: null,
      ...payload
    } as Subject;
    await db.execute(
      `INSERT INTO subjects (id, school_id, name, code, description, version, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [record.id, record.school_id, record.name, record.code, record.description, record.version, record.created_at, record.updated_at]
    );
    await queueMutation('subjects', 'INSERT', record);
    return record;
  }

  static async deleteLibrarySubject(id: string): Promise<void> {
    const db = await getDb();
    await db.execute(`UPDATE subjects SET deleted_at = $1 WHERE id = $2`, [now(), id]);
    await queueMutation('subjects', 'DELETE', { id });
  }

  static async updateLibrarySubject(id: string, payload: Partial<Subject>): Promise<Subject> {
    const db = await getDb();
    const updatedAt = now();
    const sets: string[] = [`updated_at = $1`];
    const vals: any[] = [updatedAt];
    let idx = 2;
    
    const fields = ['name', 'code', 'description'];
    for (const field of fields) {
      if (payload[field as keyof Subject] !== undefined) {
        sets.push(`${field} = $${idx++}`);
        vals.push(payload[field as keyof Subject]);
      }
    }
    vals.push(id);
    
    await db.execute(`UPDATE subjects SET ${sets.join(', ')} WHERE id = $${idx}`, vals);
    await queueMutation('subjects', 'UPDATE', { id, ...payload });
    
    const rows = await db.select<Subject[]>(`SELECT * FROM subjects WHERE id = $1`, [id]);
    return rows[0];
  }

  static async reactivateLibrarySubject(id: string): Promise<void> {
    const db = await getDb();
    await db.execute(`UPDATE subjects SET deleted_at = NULL, updated_at = $1 WHERE id = $2`, [now(), id]);
    await queueMutation('subjects', 'UPDATE', { id, deleted_at: null });
  }

  // === CLASS SUBJECTS (Assigned subjects) ===

  static async listClassSubjects(schoolId: string, classId: string, academicYearId: string): Promise<(ClassSubject & { subject_name?: string, subject_code?: string })[]> {
    const db = await getDb();
    
    // JS JOIN for WebSqlMock compatibility
    const [allClassSubjects, allSubjects] = await Promise.all([
      db.select<any[]>(`SELECT * FROM class_subjects WHERE school_id = $1 AND class_id = $2 AND deleted_at IS NULL`, [schoolId, classId]),
      db.select<any[]>(`SELECT * FROM subjects WHERE school_id = $1 AND deleted_at IS NULL`, [schoolId])
    ]);

    const filtered = allClassSubjects.filter(cs => cs.academic_year_id === academicYearId);

    const enriched = filtered.map(cs => {
      const subject = allSubjects.find(s => s.id === cs.subject_id);
      return {
        ...cs,
        subject_name: subject?.name,
        subject_code: subject?.code,
      };
    });

    enriched.sort((a, b) => {
      if (a.order_index !== b.order_index) return (a.order_index || 0) - (b.order_index || 0);
      return (a.subject_name || '').localeCompare(b.subject_name || '');
    });

    return enriched;
  }

  static async assignSubjectToClass(payload: Partial<ClassSubject>): Promise<ClassSubject> {
    const db = await getDb();
    const record: ClassSubject = {
      id: makeId(), version: 1, created_at: now(), updated_at: now(),
      updated_by: null, device_id: null, deleted_at: null,
      coefficient: 1, weekly_hours: 1, subject_type: 'principal',
      is_mandatory: 1, is_active: 1, teacher_id: null, color_icon: null, order_index: 0,
      ...payload
    } as ClassSubject;
    await db.execute(
      `INSERT INTO class_subjects (id, school_id, academic_year_id, class_id, subject_id, coefficient, weekly_hours, subject_type, is_mandatory, is_active, teacher_id, color_icon, order_index, version, created_at, updated_at) 
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
      [record.id, record.school_id, record.academic_year_id, record.class_id, record.subject_id, record.coefficient, record.weekly_hours, record.subject_type, record.is_mandatory, record.is_active, record.teacher_id, record.color_icon, record.order_index, record.version, record.created_at, record.updated_at]
    );
    await queueMutation('class_subjects', 'INSERT', record);
    return record;
  }

  static async updateClassSubject(id: string, payload: Partial<ClassSubject>): Promise<ClassSubject> {
    const db = await getDb();
    const updatedAt = now();
    const sets: string[] = [`updated_at = $1`];
    const vals: any[] = [updatedAt];
    let idx = 2;
    
    const fields = ['coefficient', 'weekly_hours', 'subject_type', 'is_mandatory', 'is_active', 'teacher_id', 'order_index'];
    for (const field of fields) {
      if (payload[field as keyof ClassSubject] !== undefined) {
        sets.push(`${field} = $${idx++}`);
        vals.push(payload[field as keyof ClassSubject]);
      }
    }
    vals.push(id);
    
    await db.execute(`UPDATE class_subjects SET ${sets.join(', ')} WHERE id = $${idx}`, vals);
    await queueMutation('class_subjects', 'UPDATE', { id, ...payload });
    
    const rows = await db.select<ClassSubject[]>(`SELECT * FROM class_subjects WHERE id = $1`, [id]);
    return rows[0];
  }

  static async deleteClassSubject(id: string): Promise<void> {
    const db = await getDb();
    await db.execute(`UPDATE class_subjects SET deleted_at = $1 WHERE id = $2`, [now(), id]);
    await queueMutation('class_subjects', 'DELETE', { id });
  }

  // === TEMPLATES ===

  static async listTemplates(schoolId: string): Promise<SubjectTemplate[]> {
    const db = await getDb();
    return db.select<SubjectTemplate[]>(`SELECT * FROM subject_templates WHERE school_id = $1 AND deleted_at IS NULL ORDER BY name ASC`, [schoolId]);
  }

  static async saveAsTemplate(schoolId: string, templateName: string, classSubjects: ClassSubject[]): Promise<SubjectTemplate> {
    const db = await getDb();
    const template: SubjectTemplate = {
      id: makeId(), school_id: schoolId, name: templateName,
      version: 1, created_at: now(), updated_at: now(),
      updated_by: null, device_id: null, deleted_at: null
    };

    await db.execute(
      `INSERT INTO subject_templates (id, school_id, name, version, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6)`,
      [template.id, template.school_id, template.name, template.version, template.created_at, template.updated_at]
    );
    await queueMutation('subject_templates', 'INSERT', template);

    for (const cs of classSubjects) {
      const item: SubjectTemplateItem = {
        id: makeId(), template_id: template.id, subject_id: cs.subject_id,
        coefficient: cs.coefficient, weekly_hours: cs.weekly_hours,
        subject_type: cs.subject_type, is_mandatory: cs.is_mandatory, order_index: cs.order_index,
        version: 1, created_at: now(), updated_at: now(),
        updated_by: null, device_id: null, deleted_at: null
      };
      await db.execute(
        `INSERT INTO subject_template_items (id, template_id, subject_id, coefficient, weekly_hours, subject_type, is_mandatory, order_index, version, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [item.id, item.template_id, item.subject_id, item.coefficient, item.weekly_hours, item.subject_type, item.is_mandatory, item.order_index, item.version, item.created_at, item.updated_at]
      );
      await queueMutation('subject_template_items', 'INSERT', item);
    }

    return template;
  }

  static async applyTemplateToClass(schoolId: string, academicYearId: string, classId: string, templateId: string): Promise<void> {
    const db = await getDb();
    const items = await db.select<SubjectTemplateItem[]>(`SELECT * FROM subject_template_items WHERE template_id = $1 AND deleted_at IS NULL`, [templateId]);
    
    // Check existing
    const existing = await this.listClassSubjects(schoolId, classId, academicYearId);
    const existingSubjectIds = new Set(existing.map(e => e.subject_id));

    for (const item of items) {
      if (!existingSubjectIds.has(item.subject_id)) {
        await this.assignSubjectToClass({
          school_id: schoolId,
          academic_year_id: academicYearId,
          class_id: classId,
          subject_id: item.subject_id,
          coefficient: item.coefficient,
          weekly_hours: item.weekly_hours,
          subject_type: item.subject_type,
          is_mandatory: item.is_mandatory,
          order_index: item.order_index
        });
      }
    }
  }

  static async deleteTemplate(id: string): Promise<void> {
    const db = await getDb();
    await db.execute(`UPDATE subject_templates SET deleted_at = $1 WHERE id = $2`, [now(), id]);
    await queueMutation('subject_templates', 'DELETE', { id });
  }
}
