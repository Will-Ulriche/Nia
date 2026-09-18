import { getDb, queueMutation } from './local/db';
import type { Section, Level, Class, Series } from '../types/database';

const now = () => new Date().toISOString();
const makeId = () => crypto.randomUUID();

export class StructureService {
  // === SECTIONS ===

  static async listSections(schoolId: string): Promise<Section[]> {
    const db = await getDb();
    return db.select<Section[]>(`SELECT * FROM sections WHERE school_id = $1 AND deleted_at IS NULL ORDER BY name ASC`, [schoolId]);
  }

  static async initializeDefaultStructure(schoolId: string): Promise<void> {
    const db = await getDb();
    const existingSections = await this.listSections(schoolId);
    
    // Create Sections if they don't exist
    let collegeSection = existingSections.find(s => s.name === 'COLLÈGE');
    if (!collegeSection) {
      collegeSection = await this.createSection({ school_id: schoolId, name: 'COLLÈGE' });
    }
    
    let lyceeSection = existingSections.find(s => s.name === 'LYCÉE');
    if (!lyceeSection) {
      lyceeSection = await this.createSection({ school_id: schoolId, name: 'LYCÉE' });
    }

    const existingLevels = await this.listLevels(schoolId);

    // Create default College levels
    const collegeLevels = [
      { name: '6e', order: 1 }, { name: '5e', order: 2 }, 
      { name: '4e', order: 3 }, { name: '3e', order: 4 }
    ];
    for (const lvl of collegeLevels) {
      if (!existingLevels.find(l => l.name === lvl.name && l.section_id === collegeSection!.id)) {
        await this.createLevel({ school_id: schoolId, section_id: collegeSection.id, name: lvl.name, level_order: lvl.order });
      }
    }

    // Create default Lycée levels
    const lyceeLevels = [
      { name: '2nde', order: 5 }, { name: '1ère', order: 6 }, { name: 'Terminale', order: 7 }
    ];
    for (const lvl of lyceeLevels) {
      if (!existingLevels.find(l => l.name === lvl.name && l.section_id === lyceeSection!.id)) {
        await this.createLevel({ school_id: schoolId, section_id: lyceeSection.id, name: lvl.name, level_order: lvl.order });
      }
    }
  }

  static async createSection(payload: Partial<Section>): Promise<Section> {
    const db = await getDb();
    const record: Section = { id: makeId(), version: 1, created_at: now(), updated_at: now(), updated_by: null, device_id: null, deleted_at: null, ...payload } as Section;
    await db.execute(
      `INSERT INTO sections (id, school_id, name, version, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)`,
      [record.id, record.school_id, record.name, record.version, record.created_at, record.updated_at]
    );
    await queueMutation('sections', 'INSERT', record);
    return record;
  }

  static async updateSection(id: string, payload: Partial<Section>): Promise<Section> {
    const db = await getDb();
    const updatedAt = now();
    if (payload.name) await db.execute(`UPDATE sections SET name = $1, updated_at = $2 WHERE id = $3`, [payload.name, updatedAt, id]);
    await queueMutation('sections', 'UPDATE', { id, ...payload });
    const rows = await db.select<Section[]>(`SELECT * FROM sections WHERE id = $1`, [id]);
    return rows[0];
  }

  static async deleteSection(id: string): Promise<void> {
    const db = await getDb();
    await db.execute(`UPDATE sections SET deleted_at = $1 WHERE id = $2`, [now(), id]);
    await queueMutation('sections', 'DELETE', { id });
  }

  // === LEVELS ===

  static async listLevels(schoolId: string, sectionId?: string): Promise<Level[]> {
    const db = await getDb();
    if (sectionId) {
      return db.select<Level[]>(`SELECT * FROM levels WHERE school_id = $1 AND section_id = $2 AND deleted_at IS NULL ORDER BY level_order ASC`, [schoolId, sectionId]);
    }
    return db.select<Level[]>(`SELECT * FROM levels WHERE school_id = $1 AND deleted_at IS NULL ORDER BY level_order ASC`, [schoolId]);
  }

  static async createLevel(payload: Partial<Level>): Promise<Level> {
    const db = await getDb();
    const record: Level = { id: makeId(), version: 1, created_at: now(), updated_at: now(), updated_by: null, device_id: null, deleted_at: null, level_order: 0, ...payload } as Level;
    await db.execute(
      `INSERT INTO levels (id, school_id, section_id, name, level_order, version, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [record.id, record.school_id, record.section_id, record.name, record.level_order, record.version, record.created_at, record.updated_at]
    );
    await queueMutation('levels', 'INSERT', record);
    return record;
  }

  static async updateLevel(id: string, payload: Partial<Level>): Promise<Level> {
    const db = await getDb();
    const updatedAt = now();
    const sets: string[] = [`updated_at = $1`];
    const vals: any[] = [updatedAt];
    let idx = 2;
    if (payload.name !== undefined) { sets.push(`name = $${idx++}`); vals.push(payload.name); }
    if (payload.level_order !== undefined) { sets.push(`level_order = $${idx++}`); vals.push(payload.level_order); }
    vals.push(id);
    await db.execute(`UPDATE levels SET ${sets.join(', ')} WHERE id = $${idx}`, vals);
    await queueMutation('levels', 'UPDATE', { id, ...payload });
    const rows = await db.select<Level[]>(`SELECT * FROM levels WHERE id = $1`, [id]);
    return rows[0];
  }

  static async deleteLevel(id: string): Promise<void> {
    const db = await getDb();
    await db.execute(`UPDATE levels SET deleted_at = $1 WHERE id = $2`, [now(), id]);
    await queueMutation('levels', 'DELETE', { id });
  }

  // === CLASSES ===

  static async listClasses(schoolId: string, academicYearId?: string, levelId?: string): Promise<Class[]> {
    const db = await getDb();
    // SQLite doesn't support JOIN shorthand like Supabase; we fetch classes and join manually or return flat
    let sql = `SELECT c.*, l.name as level_name FROM classes c LEFT JOIN levels l ON c.level_id = l.id WHERE c.school_id = $1 AND c.deleted_at IS NULL`;
    const params: any[] = [schoolId];
    let idx = 2;
    if (academicYearId) { sql += ` AND c.academic_year_id = $${idx++}`; params.push(academicYearId); }
    if (levelId) { sql += ` AND c.level_id = $${idx++}`; params.push(levelId); }
    sql += ' ORDER BY c.name ASC';
    return db.select<Class[]>(sql, params);
  }

  static async listClassesWithEnrollmentCount(schoolId: string, academicYearId: string): Promise<(Class & { level_name?: string, series_name?: string, section_id?: string, effectif?: number })[]> {
    const db = await getDb();

    // Fetch all needed tables separately (compatible with WebSqlMock)
    const [allClasses, allLevels, allSeries, allEnrollments] = await Promise.all([
      db.select<any[]>(`SELECT * FROM classes WHERE school_id = $1 AND academic_year_id = $2 AND deleted_at IS NULL`, [schoolId, academicYearId]),
      db.select<any[]>(`SELECT * FROM levels WHERE school_id = $1 AND deleted_at IS NULL`, [schoolId]),
      db.select<any[]>(`SELECT * FROM series WHERE school_id = $1 AND deleted_at IS NULL`, [schoolId]),
      db.select<any[]>(`SELECT * FROM enrollments WHERE school_id = $1 AND academic_year_id = $2 AND deleted_at IS NULL`, [schoolId, academicYearId]),
    ]);

    // Manual join in JavaScript
    const enriched = allClasses.map((c: any) => {
      const level = allLevels.find((l: any) => l.id === c.level_id);
      const series = allSeries.find((s: any) => s.id === c.series_id);
      const effectif = allEnrollments.filter((e: any) => e.class_id === c.id && e.status === 'active').length;
      return {
        ...c,
        level_name: level?.name,
        section_id: level?.section_id,
        level_order: level?.level_order ?? 0,
        series_name: series?.name,
        effectif,
      };
    });

    // Sort by level_order then class name
    enriched.sort((a: any, b: any) => {
      if (a.level_order !== b.level_order) return a.level_order - b.level_order;
      return a.name.localeCompare(b.name);
    });

    return enriched;
  }

  static async createClass(payload: Partial<Class>): Promise<Class> {
    const db = await getDb();
    const record: Class = { id: makeId(), version: 1, created_at: now(), updated_at: now(), updated_by: null, device_id: null, deleted_at: null, series_id: null, ...payload } as Class;
    await db.execute(
      `INSERT INTO classes (id, school_id, level_id, academic_year_id, series_id, name, version, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [record.id, record.school_id, record.level_id, record.academic_year_id, record.series_id, record.name, record.version, record.created_at, record.updated_at]
    );
    await queueMutation('classes', 'INSERT', record);
    return record;
  }

  static async updateClass(id: string, payload: Partial<Class>): Promise<Class> {
    const db = await getDb();
    const updatedAt = now();
    const sets: string[] = [`updated_at = $1`];
    const vals: any[] = [updatedAt];
    let idx = 2;
    if (payload.name !== undefined) { sets.push(`name = $${idx++}`); vals.push(payload.name); }
    if (payload.level_id !== undefined) { sets.push(`level_id = $${idx++}`); vals.push(payload.level_id); }
    if (payload.series_id !== undefined) { sets.push(`series_id = $${idx++}`); vals.push(payload.series_id); }
    vals.push(id);
    await db.execute(`UPDATE classes SET ${sets.join(', ')} WHERE id = $${idx}`, vals);
    await queueMutation('classes', 'UPDATE', { id, ...payload });
    const rows = await db.select<Class[]>(`SELECT * FROM classes WHERE id = $1`, [id]);
    return rows[0];
  }

  static async deleteClass(id: string): Promise<void> {
    const db = await getDb();
    await db.execute(`UPDATE classes SET deleted_at = $1 WHERE id = $2`, [now(), id]);
    await queueMutation('classes', 'DELETE', { id });
  }

  // === SERIES (Lycée) ===

  static async listSeries(schoolId: string, levelId?: string): Promise<Series[]> {
    const db = await getDb();
    if (levelId) {
      return db.select<Series[]>(`SELECT * FROM series WHERE school_id = $1 AND level_id = $2 AND deleted_at IS NULL ORDER BY name ASC`, [schoolId, levelId]);
    }
    return db.select<Series[]>(`SELECT * FROM series WHERE school_id = $1 AND deleted_at IS NULL ORDER BY name ASC`, [schoolId]);
  }

  static async createSeries(payload: Partial<Series>): Promise<Series> {
    const db = await getDb();
    const record: Series = { id: makeId(), version: 1, created_at: now(), updated_at: now(), updated_by: null, device_id: null, deleted_at: null, ...payload } as Series;
    await db.execute(
      `INSERT INTO series (id, school_id, level_id, name, version, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [record.id, record.school_id, record.level_id, record.name, record.version, record.created_at, record.updated_at]
    );
    await queueMutation('series', 'INSERT', record);
    return record;
  }

  static async updateSeries(id: string, payload: Partial<Series>): Promise<Series> {
    const db = await getDb();
    const updatedAt = now();
    if (payload.name) await db.execute(`UPDATE series SET name = $1, updated_at = $2 WHERE id = $3`, [payload.name, updatedAt, id]);
    await queueMutation('series', 'UPDATE', { id, ...payload });
    const rows = await db.select<Series[]>(`SELECT * FROM series WHERE id = $1`, [id]);
    return rows[0];
  }

  static async deleteSeries(id: string): Promise<void> {
    const db = await getDb();
    await db.execute(`UPDATE series SET deleted_at = $1 WHERE id = $2`, [now(), id]);
    await queueMutation('series', 'DELETE', { id });
  }
}
