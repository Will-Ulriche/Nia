import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { WebSqlMock } from './websql-mock';

type Row = Record<string, any>;

let mock: WebSqlMock;
let warnSpy: ReturnType<typeof vi.spyOn>;

beforeAll(() => {
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  mock = new WebSqlMock();
  mock.execute(`CREATE TABLE IF NOT EXISTS students (id TEXT PRIMARY KEY, school_id TEXT NOT NULL, class_id TEXT)`, []);
  mock.execute(`CREATE TABLE IF NOT EXISTS school_devices (id TEXT PRIMARY KEY, school_id TEXT NOT NULL)`, []);
});

afterAll(() => {
  warnSpy.mockRestore();
});

async function seed() {
  await mock.execute(
    `INSERT INTO students (id, school_id, class_id) VALUES ($1, $2, $3)`,
    ['stu-a1', 'sch_A', 'cls-1']
  );
  await mock.execute(
    `INSERT INTO students (id, school_id, class_id) VALUES ($1, $2, $3)`,
    ['stu-b1', 'sch_B', 'cls-2']
  );
  // Ligne sans school_id : héritage de la régression P0-04.
  await mock.execute(
    `INSERT INTO students (id, school_id, class_id) VALUES ($1, $2, $3)`,
    ['stu-orphan', null, 'cls-orphan']
  );
}

describe('WebSqlMock — isolation multi-établissements (P0-04)', () => {
  it('ne renvoie que les élèves de l’école demandée', async () => {
    await seed();
    const rows = await mock.select<Row[]>(
      `SELECT * FROM students WHERE school_id = $1`,
      ['sch_A']
    );
    expect(rows.map(r => r.id)).toEqual(['stu-a1']);
  });

  it('n’inclut PAS une ligne sans school_id dans un filtre tenant (régression P0-04)', async () => {
    const rows = await mock.select<Row[]>(
      `SELECT * FROM students WHERE school_id = $1`,
      ['sch_B']
    );
    expect(rows.map(r => r.id)).not.toContain('stu-orphan');
  });

  it('filtre combiné school_id + enfant (class_id)', async () => {
    const rows = await mock.select<Row[]>(
      `SELECT * FROM students WHERE school_id = $1 AND class_id = $2`,
      ['sch_A', 'cls-1']
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('stu-a1');
  });

  it('isole totalement les écoles (aucune fuite entre sch_A et sch_B)', async () => {
    const a = await mock.select<Row[]>(`SELECT * FROM students WHERE school_id = $1`, ['sch_A']);
    const b = await mock.select<Row[]>(`SELECT * FROM students WHERE school_id = $1`, ['sch_B']);
    expect(a.every(r => r.school_id === 'sch_A')).toBe(true);
    expect(b.every(r => r.school_id === 'sch_B')).toBe(true);
  });
});

describe('WebSqlMock — contrat de base', () => {
  it('upsert par id : un second INSERT du même id remplace la ligne', async () => {
    await mock.execute(
      `INSERT INTO school_devices (id, school_id) VALUES ($1, $2)`,
      ['dev-1', 'sch_A']
    );
    await mock.execute(
      `INSERT INTO school_devices (id, school_id) VALUES ($1, $2)`,
      ['dev-1', 'sch_B']
    );
    const rows = await mock.select<Row[]>(`SELECT * FROM school_devices WHERE id = $1`, ['dev-1']);
    expect(rows).toHaveLength(1);
    expect(rows[0].school_id).toBe('sch_B');
  });

  it('filtre deleted_at IS NULL (suppression logique)', async () => {
    await mock.execute(
      `INSERT INTO students (id, school_id, class_id, deleted_at) VALUES ($1, $2, $3, $4)`,
      ['stu-del', 'sch_A', 'cls-1', new Date().toISOString()]
    );
    const active = await mock.select<Row[]>(
      `SELECT * FROM students WHERE school_id = $1 AND deleted_at IS NULL`,
      ['sch_A']
    );
    expect(active.map(r => r.id)).not.toContain('stu-del');
  });
});