import { getDb } from './local/db';
import { StructureService } from './structure.service';
import { StudentService } from './student.service';

// ---------------------------------------------------------------------------
// Données réalistes (noms, lieux, contacts camerounais/francophones) pour
// générer des élèves de démonstration remplissant les fiches.
// ---------------------------------------------------------------------------

const FIRST_NAMES_M = ['Jean', 'Paul', 'Pierre', 'Marc', 'Étienne', 'Blaise', 'Samuel', 'Emmanuel', 'Chris', 'Serge', 'Patrick', 'Landry', 'Franck', 'Olivier', 'Hervé', 'Joël', 'Rodrigue', 'Steeve', 'Wilfried', 'Brice', 'Arnaud', 'Cédric', 'Didier', 'Éric', 'Firmin', 'Guy'];
const FIRST_NAMES_F = ['Marie', 'Claire', 'Anne', 'Louise', 'Sarah', 'Esther', 'Naomi', 'Chantal', 'Sylvie', 'Nadia', 'Aïcha', 'Flore', 'Cécile', 'Brigitte', 'Mireille', 'Sandrine', 'Carine', 'Lucie', 'Corine', 'Delphine', 'Émilie', 'Fatou', 'Hélène', 'Isabelle', 'Josiane', 'Marthe'];
const LAST_NAMES = ['Nkoulou', 'Etoa', 'Mbarga', 'Fotso', 'Kamga', 'Ndiaye', 'Tchango', 'Essomba', 'Biyong', 'Ngassa', 'Wamba', 'Atangana', 'Sanga', 'Mvondo', 'Talla', 'Djoumessi', 'Njoya', 'Owona', 'Zang', 'Njankouo', 'Onana', 'Meka', 'Ngo Bassa', 'Bella', 'Essame', 'Kouam', 'Lewa', 'Mbida', 'Nana', 'Penda', 'Tsala', 'Yemga', 'Engo', 'Kameni', 'Moussé', 'Akoa'];
const CITIES = ['Yaoundé', 'Douala', 'Bafoussam', 'Bamenda', 'Garoua', 'Maroua', 'Bertoua', 'Ngaoundéré', 'Kribi', 'Limbé'];
const NEIGHBORHOODS = ['Mokolo', 'Bastos', 'Bonapriso', 'Akwa', 'Elig-Effa', 'Hippodrome', 'Tsinga', 'Ndogbong', 'New-Bell', 'Bonamoussadi', 'Mfandena', 'Obili'];
const BIRTH_PLACES = ['Yaoundé', 'Douala', 'Bafoussam', 'Bamenda', 'Garoua', 'Maroua', 'Bertoua', 'Limbé', 'Kribi', 'Ebolowa', 'Ngaoundéré', 'Buea', 'Edéa'];
const PROFESSIONS = ['Commerçant', 'Enseignant', 'Fonctionnaire', 'Infirmier', 'Agriculteur', 'Mécanicien', 'Couturier', 'Chauffeur', 'Artisan', 'Médecin', 'Ingénieur', 'Électricien'];
const PREVIOUS_SCHOOLS = ['École Primaire Bilingue', 'Collège de la Cité', 'Groupe Scolaire Les Bambins', 'École Publique des Feux', 'Complexe Scolaire La Colombe', 'Petit Collège du Centre'];
const PREVIOUS_CLASSES = ['CM1', 'CM2', '6e', '5e', '4e'];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randPhone(): string {
  return `6${randRange(10000000, 99999999)}`;
}

function birthDate(minYear: number, maxYear: number): string {
  const year = randRange(minYear, maxYear);
  const month = randRange(1, 12);
  const day = randRange(1, 28);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export interface SeedResult {
  classes: number;
  createdStudents: number;
  createdEnrollments: number;
}

export class SeedService {
  /**
   * Garantit `perClass` élèves inscrits dans chaque classe de l'année scolaire
   * active (complète si besoin). Les élèves générés portent des informations
   * réalistes. Les écritures passent par StudentService (file de mutation
   * locale + synchronisation Supabase).
   */
  static async seedStudentsPerClass(schoolId: string, academicYearId: string, perClass = 15): Promise<SeedResult> {
    const db = await getDb();

    const classes = await StructureService.listClasses(schoolId, academicYearId);
    if (!classes.length) {
      throw new Error('Aucune classe trouvée pour cette année scolaire. Créez d\'abord des classes.');
    }

    const enrollments = await db.select<any[]>(
      `SELECT class_id, student_id, status FROM enrollments WHERE school_id = $1 AND academic_year_id = $2 AND deleted_at IS NULL`,
      [schoolId, academicYearId]
    );

    // Évite les matricules en double avec les élèves déjà existants.
    const existingMatricules = new Set<string>();
    const existingStudents = await db.select<any[]>(`SELECT matricule FROM students WHERE school_id = $1 AND deleted_at IS NULL`, [schoolId]);
    for (const s of existingStudents) {
      if (s.matricule) existingMatricules.add(s.matricule);
    }

    const year2 = new Date().getFullYear().toString().slice(-2);
    let seq = 1;
    const nextMatricule = (): string => {
      let code: string;
      do {
        code = `MAT${year2}${String(seq++).padStart(4, '0')}`;
      } while (existingMatricules.has(code));
      existingMatricules.add(code);
      return code;
    };

    let createdStudents = 0;
    let createdEnrollments = 0;

    for (const cls of classes) {
      const current = enrollments.filter(e => e.class_id === cls.id && e.status === 'active').length;
      const toCreate = Math.max(0, perClass - current);

      for (let i = 0; i < toCreate; i++) {
        const gender = Math.random() < 0.5 ? 'M' : 'F';
        const first_name = gender === 'M' ? pick(FIRST_NAMES_M) : pick(FIRST_NAMES_F);
        const last_name = pick(LAST_NAMES);
        const city = pick(CITIES);
        const neighborhood = pick(NEIGHBORHOODS);
        const parentRelation = gender === 'M' ? 'Père' : 'Mère';

        const student = await StudentService.createStudent({
          school_id: schoolId,
          matricule: nextMatricule(),
          first_name,
          last_name,
          gender,
          birth_date: birthDate(2008, 2015),
          birth_place: pick(BIRTH_PLACES),
          address: `Rue ${randRange(1, 120)}`,
          city,
          neighborhood,
          nationality: 'Camerounaise',
          contact_phone: randPhone(),
          contact_email: `${first_name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}.${last_name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '')}${randRange(1, 99)}@gmail.com`,
          parent_name: `Mr/Mme ${last_name}`,
          parent_contact: randPhone(),
          parent_city: city,
          parent_neighborhood: neighborhood,
          parent_whatsapp: randPhone(),
          parent_profession: pick(PROFESSIONS),
          parent_relation: parentRelation,
          financial_sponsor: 1,
          schooling_regime: pick(['Externe', 'Demi-pension', 'Interne']),
          previous_school: pick(PREVIOUS_SCHOOLS),
          previous_class: pick(PREVIOUS_CLASSES),
          previous_year: `${new Date().getFullYear() - 1}`,
        });

        await StudentService.createEnrollment({
          school_id: schoolId,
          student_id: student.id,
          class_id: cls.id,
          academic_year_id: academicYearId,
          status: 'active',
          enrollment_date: new Date().toISOString().substring(0, 10),
        });

        createdStudents++;
        createdEnrollments++;
      }
    }

    return { classes: classes.length, createdStudents, createdEnrollments };
  }
}