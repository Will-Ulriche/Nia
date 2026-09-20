-- Migration: 20260920_rls_role_based
-- Description: REMEDIATION sécurité — remplace le modèle RLS générique par un
--              modèle strictement basé sur les rôles.
--
-- POURQUOI CE FICHIER ?
-- La migration 20260914130008 définissait des politiques génériques du type
--   school_id = get_current_user_school_id() OR is_super_admin()
-- pour SELECT/INSERT/UPDATE/DELETE. Or les politiques RLS de PostgreSQL sont
-- ADDITIVES (OR) : cette politique générique d'écriture annulait toute
-- politique de rôle plus restrictive (emploie du temps, moyennes, ...).
-- Résultat : un simple professeur pouvait écrire dans les notes, la finance,
-- les paramètres, etc. de son établissement.
--
-- Ce script :
--   1. recrée les helpers de rôle (idempotent) ;
--   2. pose le trigger anti-escalade sur profiles (idempotent) ;
--   3. SUPPRIME toutes les anciennes politiques permissives/génériques ;
--   4. recrée des politiques de rôle strictes sur TOUTES les tables,
--      de façon idempotente (DROP + CREATE).
--
-- Sûr à exécuter plusieurs fois et via n'importe quel outil (SQL Editor,
-- supabase db push, psql).

-- ============================================================================
-- 1. HELPERS DE RÔLE (identiques à 20260914130008 ; recréés pour être
--    autonome, par ex. si ce script est exécuté seul).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_current_user_school_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT school_id FROM public.profiles WHERE id = auth.uid() AND deleted_at IS NULL;
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_admin' AND deleted_at IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.profile_role(_school_id UUID)
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM public.profiles
  WHERE id = auth.uid() AND school_id = _school_id AND deleted_at IS NULL
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_school_member(_school_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT (public.profile_role(_school_id) IS NOT NULL);
$$;

CREATE OR REPLACE FUNCTION public.is_direction(_school_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT (public.profile_role(_school_id) = 'direction');
$$;

CREATE OR REPLACE FUNCTION public.is_secretaire(_school_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT (public.profile_role(_school_id) = 'secretaire');
$$;

CREATE OR REPLACE FUNCTION public.is_professeur(_school_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT (public.profile_role(_school_id) = 'professeur');
$$;

CREATE OR REPLACE FUNCTION public.current_teacher_id(_school_id UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT t.id FROM public.teachers t
  WHERE t.school_id = _school_id AND t.profile_id = auth.uid() AND t.deleted_at IS NULL
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.professor_teaches_class(_school_id UUID, _class_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT (
    public.current_teacher_id(_school_id) IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.teacher_assignments ta
      WHERE ta.school_id = _school_id AND ta.class_id = _class_id
        AND ta.teacher_id = public.current_teacher_id(_school_id)
        AND ta.deleted_at IS NULL
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.professor_teaches_subject(_school_id UUID, _subject_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.teacher_assignments ta
    WHERE ta.school_id = _school_id AND ta.subject_id = _subject_id
      AND ta.teacher_id = public.current_teacher_id(_school_id)
      AND ta.deleted_at IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.professor_owns_assessment(_school_id UUID, _assessment_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.assessments a
    WHERE a.id = _assessment_id AND a.school_id = _school_id
      AND public.professor_teaches_class(_school_id, a.class_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.professor_has_student(_school_id UUID, _student_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.student_id = _student_id AND e.school_id = _school_id AND e.deleted_at IS NULL
      AND public.professor_teaches_class(_school_id, e.class_id)
  );
$$;

-- ============================================================================
-- 2. TRIGGER ANTI-ESCALADE SUR PROFILES
-- ============================================================================
CREATE OR REPLACE FUNCTION public.protect_profile_privileges()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'super_admin' AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Seul un super admin peut promouvoir un super admin.';
  END IF;

  IF NEW.id = auth.uid() AND NOT public.is_super_admin() THEN
    IF NOT public.is_direction(OLD.school_id) AND NOT public.is_direction(NEW.school_id) THEN
      IF NEW.role IS DISTINCT FROM OLD.role
         OR NEW.school_id IS DISTINCT FROM OLD.school_id THEN
        RAISE EXCEPTION 'Un utilisateur ne peut pas modifier son propre rôle ni son établissement.';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profiles_privileges ON public.profiles;
CREATE TRIGGER trg_protect_profiles_privileges
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_privileges();

CREATE OR REPLACE FUNCTION public.protect_profile_role_insert()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'super_admin' AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Seul un super admin peut créer un profil super admin.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profiles_role_insert ON public.profiles;
CREATE TRIGGER trg_protect_profiles_role_insert
BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role_insert();

-- ============================================================================
-- 3. SUPPRESSION DES ANCIENNES POLITIQUES PERMISSIVES / GÉNÉRIQUES
-- ============================================================================

-- 3a. Politiques génériques créées en boucle par 20260914130008 et
--     full_migration.sql (noms construits dynamiquement : préfixes + table).
DO $$
DECLARE
    t text;
    n text;
    tables text[] := ARRAY[
        'school_modules','school_settings','school_devices',
        'academic_years','sections','levels','series','classes',
        'students','teachers','subjects','enrollments','teacher_assignments',
        'periods','assessments','grades','attendance',
        'fee_definitions','payments','receipts','audit_logs',
        'schedules','averages','expenses'
    ];
    prefixes text[] := ARRAY[
        'Tenant isolation select for ','Tenant isolation insert for ',
        'Tenant isolation update for ','Tenant isolation delete for ',
        'Select ','Insert ','Update ','Delete '
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        IF to_regclass('public.' || t) IS NOT NULL THEN
            FOREACH n IN ARRAY prefixes LOOP
                EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', n || t, t);
            END LOOP;
        END IF;
    END LOOP;
END $$;

-- 3b. Autres anciennes politiques nommées (migrations + full_migration.sql).
DO $$
DECLARE
    r text[];
BEGIN
    FOREACH r SLICE 1 IN ARRAY ARRAY[
        -- schools / profiles (008 + full_migration)
        ARRAY['schools','Super Admins can manage schools'],
        ARRAY['schools','Users can view their own school'],
        ARRAY['profiles','Super Admins can manage profiles'],
        ARRAY['profiles','Users can view school profiles'],
        ARRAY['profiles','Users can update own profile'],
        ARRAY['profiles','Users can insert own profile'],
        -- schedules (009)
        ARRAY['schedules','Schedules are viewable by everyone in the school'],
        ARRAY['schedules','Schedules are insertable by Direction/SuperAdmin'],
        ARRAY['schedules','Schedules are updatable by Direction/SuperAdmin'],
        ARRAY['schedules','Schedules are deletable by Direction/SuperAdmin'],
        -- averages (010)
        ARRAY['averages','Averages viewable by school members'],
        ARRAY['averages','Averages insertable by Direction'],
        ARRAY['averages','Averages updatable by Direction'],
        ARRAY['averages','Averages deletable by Direction'],
        -- devices (20260915_add_devices + full_migration)
        ARRAY['devices','Super Admins manage devices'],
        ARRAY['devices','Users view own school devices'],
        ARRAY['devices','Users can view their school''s devices'],
        ARRAY['devices','Users can insert devices'],
        ARRAY['devices','Users can update their school''s devices'],
        -- audit_logs (20260915_add_audit_logs + full_migration)
        ARRAY['audit_logs','Direction can view their school''s audit logs'],
        ARRAY['audit_logs','Users can insert audit logs'],
        -- backups (20260915140000 + full_migration)
        ARRAY['backups','Users can view their school''s backups'],
        ARRAY['backups','Users can insert backups for their school'],
        ARRAY['backups','Users can update their school''s backups'],
        ARRAY['backups','Users can delete their school''s backups'],
        ARRAY['backups','Super Admins manage backups'],
        ARRAY['backups','Users view own school backups'],
        ARRAY['backups','Users insert backups'],
        -- licenses (20260915150000 + full_migration)
        ARRAY['licenses','Users can view their school''s licenses'],
        ARRAY['licenses','Super admin can insert licenses'],
        ARRAY['licenses','Super admin can update licenses'],
        ARRAY['licenses','Super admin can delete licenses'],
        ARRAY['licenses','Super Admins manage licenses'],
        ARRAY['licenses','Users view own school license']
    ] LOOP
        IF to_regclass('public.' || r[1]) IS NOT NULL THEN
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r[2], r[1]);
        END IF;
    END LOOP;
END $$;

-- ============================================================================
-- 4. RECRÉATION — POLITIQUES DE RÔLE (idempotentes : DROP + CREATE)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- schools / profiles
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "rls_schools_admin_all" ON public.schools;
CREATE POLICY "rls_schools_admin_all" ON public.schools
  FOR ALL USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());
DROP POLICY IF EXISTS "rls_schools_read_own" ON public.schools;
CREATE POLICY "rls_schools_read_own" ON public.schools
  FOR SELECT USING (id = public.get_current_user_school_id());

DROP POLICY IF EXISTS "rls_profiles_admin_all" ON public.profiles;
CREATE POLICY "rls_profiles_admin_all" ON public.profiles
  FOR ALL USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());
DROP POLICY IF EXISTS "rls_profiles_read_school" ON public.profiles;
CREATE POLICY "rls_profiles_read_school" ON public.profiles
  FOR SELECT USING (school_id = public.get_current_user_school_id());
DROP POLICY IF EXISTS "rls_profiles_direction_insert" ON public.profiles;
CREATE POLICY "rls_profiles_direction_insert" ON public.profiles
  FOR INSERT WITH CHECK (public.is_direction(school_id) AND role <> 'super_admin');
DROP POLICY IF EXISTS "rls_profiles_direction_update" ON public.profiles;
CREATE POLICY "rls_profiles_direction_update" ON public.profiles
  FOR UPDATE USING (public.is_direction(school_id))
  WITH CHECK (public.is_direction(school_id) AND role <> 'super_admin');
DROP POLICY IF EXISTS "rls_profiles_self_update" ON public.profiles;
CREATE POLICY "rls_profiles_self_update" ON public.profiles
  FOR UPDATE USING (id = auth.uid());
DROP POLICY IF EXISTS "rls_profiles_delete_admin" ON public.profiles;
CREATE POLICY "rls_profiles_delete_admin" ON public.profiles
  FOR DELETE USING (public.is_super_admin());

-- ----------------------------------------------------------------------------
-- Paramètres / modules / appareils
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "rls_school_modules_read_member" ON public.school_modules;
CREATE POLICY "rls_school_modules_read_member" ON public.school_modules
  FOR SELECT USING (public.is_school_member(school_id) OR public.is_super_admin());
DROP POLICY IF EXISTS "rls_school_modules_write_direction" ON public.school_modules;
CREATE POLICY "rls_school_modules_write_direction" ON public.school_modules
  FOR ALL USING (public.is_direction(school_id))
  WITH CHECK (public.is_direction(school_id));

DROP POLICY IF EXISTS "rls_school_settings_read_member" ON public.school_settings;
CREATE POLICY "rls_school_settings_read_member" ON public.school_settings
  FOR SELECT USING (public.is_school_member(school_id) OR public.is_super_admin());
DROP POLICY IF EXISTS "rls_school_settings_write_direction" ON public.school_settings;
CREATE POLICY "rls_school_settings_write_direction" ON public.school_settings
  FOR ALL USING (public.is_direction(school_id))
  WITH CHECK (public.is_direction(school_id));

DROP POLICY IF EXISTS "rls_school_devices_read_member" ON public.school_devices;
CREATE POLICY "rls_school_devices_read_member" ON public.school_devices
  FOR SELECT USING (public.is_school_member(school_id) OR public.is_super_admin());
DROP POLICY IF EXISTS "rls_school_devices_insert_member" ON public.school_devices;
CREATE POLICY "rls_school_devices_insert_member" ON public.school_devices
  FOR INSERT WITH CHECK (public.is_school_member(school_id) OR public.is_super_admin());
DROP POLICY IF EXISTS "rls_school_devices_update_direction" ON public.school_devices;
CREATE POLICY "rls_school_devices_update_direction" ON public.school_devices
  FOR UPDATE USING (public.is_direction(school_id) OR public.is_super_admin());
DROP POLICY IF EXISTS "rls_school_devices_delete_direction" ON public.school_devices;
CREATE POLICY "rls_school_devices_delete_direction" ON public.school_devices
  FOR DELETE USING (public.is_direction(school_id) OR public.is_super_admin());

-- ----------------------------------------------------------------------------
-- Structure académique
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "rls_academic_years_read_member" ON public.academic_years;
CREATE POLICY "rls_academic_years_read_member" ON public.academic_years
  FOR SELECT USING (public.is_school_member(school_id) OR public.is_super_admin());
DROP POLICY IF EXISTS "rls_academic_years_write_direction" ON public.academic_years;
CREATE POLICY "rls_academic_years_write_direction" ON public.academic_years
  FOR ALL USING (public.is_direction(school_id))
  WITH CHECK (public.is_direction(school_id));

DROP POLICY IF EXISTS "rls_sections_read_member" ON public.sections;
CREATE POLICY "rls_sections_read_member" ON public.sections
  FOR SELECT USING (public.is_school_member(school_id) OR public.is_super_admin());
DROP POLICY IF EXISTS "rls_sections_write_direction" ON public.sections;
CREATE POLICY "rls_sections_write_direction" ON public.sections
  FOR ALL USING (public.is_direction(school_id))
  WITH CHECK (public.is_direction(school_id));

DROP POLICY IF EXISTS "rls_levels_read_member" ON public.levels;
CREATE POLICY "rls_levels_read_member" ON public.levels
  FOR SELECT USING (public.is_school_member(school_id) OR public.is_super_admin());
DROP POLICY IF EXISTS "rls_levels_write_direction" ON public.levels;
CREATE POLICY "rls_levels_write_direction" ON public.levels
  FOR ALL USING (public.is_direction(school_id))
  WITH CHECK (public.is_direction(school_id));

DROP POLICY IF EXISTS "rls_series_read_member" ON public.series;
CREATE POLICY "rls_series_read_member" ON public.series
  FOR SELECT USING (public.is_school_member(school_id) OR public.is_super_admin());
DROP POLICY IF EXISTS "rls_series_write_direction" ON public.series;
CREATE POLICY "rls_series_write_direction" ON public.series
  FOR ALL USING (public.is_direction(school_id))
  WITH CHECK (public.is_direction(school_id));

DROP POLICY IF EXISTS "rls_classes_read_staff_teacher" ON public.classes;
CREATE POLICY "rls_classes_read_staff_teacher" ON public.classes
  FOR SELECT USING (
    public.is_super_admin()
    OR public.is_direction(school_id)
    OR public.is_secretaire(school_id)
    OR (public.is_professeur(school_id) AND public.professor_teaches_class(school_id, id))
  );
DROP POLICY IF EXISTS "rls_classes_write_direction" ON public.classes;
CREATE POLICY "rls_classes_write_direction" ON public.classes
  FOR ALL USING (public.is_direction(school_id))
  WITH CHECK (public.is_direction(school_id));

-- ----------------------------------------------------------------------------
-- Personnes
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "rls_students_read" ON public.students;
CREATE POLICY "rls_students_read" ON public.students
  FOR SELECT USING (
    public.is_super_admin()
    OR public.is_direction(school_id)
    OR public.is_secretaire(school_id)
    OR (public.is_professeur(school_id) AND public.professor_has_student(school_id, id))
  );
DROP POLICY IF EXISTS "rls_students_write_staff" ON public.students;
CREATE POLICY "rls_students_write_staff" ON public.students
  FOR ALL USING (
    public.is_super_admin()
    OR public.is_direction(school_id)
    OR public.is_secretaire(school_id)
  )
  WITH CHECK (
    public.is_super_admin()
    OR public.is_direction(school_id)
    OR public.is_secretaire(school_id)
  );

DROP POLICY IF EXISTS "rls_teachers_read_member" ON public.teachers;
CREATE POLICY "rls_teachers_read_member" ON public.teachers
  FOR SELECT USING (public.is_school_member(school_id) OR public.is_super_admin());
DROP POLICY IF EXISTS "rls_teachers_write_direction" ON public.teachers;
CREATE POLICY "rls_teachers_write_direction" ON public.teachers
  FOR ALL USING (public.is_direction(school_id))
  WITH CHECK (public.is_direction(school_id));

-- ----------------------------------------------------------------------------
-- Matières / inscriptions / affectations
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "rls_subjects_read" ON public.subjects;
CREATE POLICY "rls_subjects_read" ON public.subjects
  FOR SELECT USING (
    public.is_super_admin()
    OR public.is_direction(school_id)
    OR public.is_secretaire(school_id)
    OR (public.is_professeur(school_id) AND public.professor_teaches_subject(school_id, id))
  );
DROP POLICY IF EXISTS "rls_subjects_write_direction" ON public.subjects;
CREATE POLICY "rls_subjects_write_direction" ON public.subjects
  FOR ALL USING (public.is_direction(school_id))
  WITH CHECK (public.is_direction(school_id));

DROP POLICY IF EXISTS "rls_enrollments_read" ON public.enrollments;
CREATE POLICY "rls_enrollments_read" ON public.enrollments
  FOR SELECT USING (
    public.is_super_admin()
    OR public.is_direction(school_id)
    OR public.is_secretaire(school_id)
    OR (public.is_professeur(school_id) AND public.professor_teaches_class(school_id, class_id))
  );
DROP POLICY IF EXISTS "rls_enrollments_write_staff" ON public.enrollments;
CREATE POLICY "rls_enrollments_write_staff" ON public.enrollments
  FOR ALL USING (
    public.is_super_admin()
    OR public.is_direction(school_id)
    OR public.is_secretaire(school_id)
  )
  WITH CHECK (
    public.is_super_admin()
    OR public.is_direction(school_id)
    OR public.is_secretaire(school_id)
  );

DROP POLICY IF EXISTS "rls_teacher_assignments_read" ON public.teacher_assignments;
CREATE POLICY "rls_teacher_assignments_read" ON public.teacher_assignments
  FOR SELECT USING (
    public.is_super_admin()
    OR public.is_direction(school_id)
    OR public.is_secretaire(school_id)
    OR (public.is_professeur(school_id) AND teacher_id = public.current_teacher_id(school_id))
  );
DROP POLICY IF EXISTS "rls_teacher_assignments_write_direction" ON public.teacher_assignments;
CREATE POLICY "rls_teacher_assignments_write_direction" ON public.teacher_assignments
  FOR ALL USING (public.is_direction(school_id))
  WITH CHECK (public.is_direction(school_id));

-- ----------------------------------------------------------------------------
-- Périodes
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "rls_periods_read_member" ON public.periods;
CREATE POLICY "rls_periods_read_member" ON public.periods
  FOR SELECT USING (public.is_school_member(school_id) OR public.is_super_admin());
DROP POLICY IF EXISTS "rls_periods_write_direction" ON public.periods;
CREATE POLICY "rls_periods_write_direction" ON public.periods
  FOR ALL USING (public.is_direction(school_id))
  WITH CHECK (public.is_direction(school_id));

-- ----------------------------------------------------------------------------
-- Évaluations / notes / assiduité
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "rls_assessments_read" ON public.assessments;
CREATE POLICY "rls_assessments_read" ON public.assessments
  FOR SELECT USING (
    public.is_super_admin()
    OR public.is_direction(school_id)
    OR public.is_secretaire(school_id)
    OR (public.is_professeur(school_id) AND public.professor_teaches_class(school_id, class_id))
  );
DROP POLICY IF EXISTS "rls_assessments_write_direction" ON public.assessments;
CREATE POLICY "rls_assessments_write_direction" ON public.assessments
  FOR ALL USING (public.is_direction(school_id))
  WITH CHECK (public.is_direction(school_id));
DROP POLICY IF EXISTS "rls_assessments_write_professeur" ON public.assessments;
CREATE POLICY "rls_assessments_write_professeur" ON public.assessments
  FOR ALL USING (
    public.is_professeur(school_id) AND public.professor_teaches_class(school_id, class_id)
  )
  WITH CHECK (
    public.is_professeur(school_id) AND public.professor_teaches_class(school_id, class_id)
  );

DROP POLICY IF EXISTS "rls_grades_read" ON public.grades;
CREATE POLICY "rls_grades_read" ON public.grades
  FOR SELECT USING (
    public.is_super_admin()
    OR public.is_direction(school_id)
    OR public.is_secretaire(school_id)
    OR (public.is_professeur(school_id) AND public.professor_owns_assessment(school_id, assessment_id))
  );
DROP POLICY IF EXISTS "rls_grades_write_direction" ON public.grades;
CREATE POLICY "rls_grades_write_direction" ON public.grades
  FOR ALL USING (public.is_direction(school_id))
  WITH CHECK (public.is_direction(school_id));
DROP POLICY IF EXISTS "rls_grades_write_professeur" ON public.grades;
CREATE POLICY "rls_grades_write_professeur" ON public.grades
  FOR ALL USING (
    public.is_professeur(school_id) AND public.professor_owns_assessment(school_id, assessment_id)
  )
  WITH CHECK (
    public.is_professeur(school_id) AND public.professor_owns_assessment(school_id, assessment_id)
  );

DROP POLICY IF EXISTS "rls_attendance_read" ON public.attendance;
CREATE POLICY "rls_attendance_read" ON public.attendance
  FOR SELECT USING (
    public.is_super_admin()
    OR public.is_direction(school_id)
    OR public.is_secretaire(school_id)
    OR (public.is_professeur(school_id) AND public.professor_teaches_class(school_id, class_id))
  );
DROP POLICY IF EXISTS "rls_attendance_write" ON public.attendance;
CREATE POLICY "rls_attendance_write" ON public.attendance
  FOR ALL USING (
    public.is_super_admin()
    OR public.is_direction(school_id)
    OR public.is_secretaire(school_id)
    OR (public.is_professeur(school_id) AND public.professor_teaches_class(school_id, class_id))
  )
  WITH CHECK (
    public.is_super_admin()
    OR public.is_direction(school_id)
    OR public.is_secretaire(school_id)
    OR (public.is_professeur(school_id) AND public.professor_teaches_class(school_id, class_id))
  );

-- ----------------------------------------------------------------------------
-- Finance
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "rls_fee_definitions_read_staff" ON public.fee_definitions;
CREATE POLICY "rls_fee_definitions_read_staff" ON public.fee_definitions
  FOR SELECT USING (
    public.is_super_admin()
    OR public.is_direction(school_id)
    OR public.is_secretaire(school_id)
  );
DROP POLICY IF EXISTS "rls_fee_definitions_write_direction" ON public.fee_definitions;
CREATE POLICY "rls_fee_definitions_write_direction" ON public.fee_definitions
  FOR ALL USING (public.is_direction(school_id))
  WITH CHECK (public.is_direction(school_id));

DROP POLICY IF EXISTS "rls_payments_read_staff" ON public.payments;
CREATE POLICY "rls_payments_read_staff" ON public.payments
  FOR SELECT USING (
    public.is_super_admin()
    OR public.is_direction(school_id)
    OR public.is_secretaire(school_id)
  );
DROP POLICY IF EXISTS "rls_payments_write_staff" ON public.payments;
CREATE POLICY "rls_payments_write_staff" ON public.payments
  FOR ALL USING (
    public.is_super_admin()
    OR public.is_direction(school_id)
    OR public.is_secretaire(school_id)
  )
  WITH CHECK (
    public.is_super_admin()
    OR public.is_direction(school_id)
    OR public.is_secretaire(school_id)
  );

DROP POLICY IF EXISTS "rls_receipts_read_staff" ON public.receipts;
CREATE POLICY "rls_receipts_read_staff" ON public.receipts
  FOR SELECT USING (
    public.is_super_admin()
    OR public.is_direction(school_id)
    OR public.is_secretaire(school_id)
  );
DROP POLICY IF EXISTS "rls_receipts_write_staff" ON public.receipts;
CREATE POLICY "rls_receipts_write_staff" ON public.receipts
  FOR ALL USING (
    public.is_super_admin()
    OR public.is_direction(school_id)
    OR public.is_secretaire(school_id)
  )
  WITH CHECK (
    public.is_super_admin()
    OR public.is_direction(school_id)
    OR public.is_secretaire(school_id)
  );

-- ----------------------------------------------------------------------------
-- Journal d'audit (immuable : aucune politique UPDATE/DELETE)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "rls_audit_logs_read_direction" ON public.audit_logs;
CREATE POLICY "rls_audit_logs_read_direction" ON public.audit_logs
  FOR SELECT USING (
    public.is_super_admin() OR public.is_direction(school_id)
  );
DROP POLICY IF EXISTS "rls_audit_logs_insert_member" ON public.audit_logs;
CREATE POLICY "rls_audit_logs_insert_member" ON public.audit_logs
  FOR INSERT WITH CHECK (
    public.is_super_admin() OR public.is_school_member(school_id)
  );

-- ----------------------------------------------------------------------------
-- Emplois du temps
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "rls_schedules_read_member" ON public.schedules;
CREATE POLICY "rls_schedules_read_member" ON public.schedules
  FOR SELECT USING (public.is_school_member(school_id) OR public.is_super_admin());
DROP POLICY IF EXISTS "rls_schedules_write_direction" ON public.schedules;
CREATE POLICY "rls_schedules_write_direction" ON public.schedules
  FOR ALL USING (public.is_direction(school_id))
  WITH CHECK (public.is_direction(school_id));

-- ----------------------------------------------------------------------------
-- Moyennes
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "rls_averages_read" ON public.averages;
CREATE POLICY "rls_averages_read" ON public.averages
  FOR SELECT USING (
    public.is_super_admin()
    OR public.is_direction(school_id)
    OR public.is_secretaire(school_id)
    OR (public.is_professeur(school_id) AND public.professor_teaches_class(school_id, class_id))
  );
DROP POLICY IF EXISTS "rls_averages_write_direction" ON public.averages;
CREATE POLICY "rls_averages_write_direction" ON public.averages
  FOR ALL USING (public.is_direction(school_id))
  WITH CHECK (public.is_direction(school_id));
DROP POLICY IF EXISTS "rls_averages_write_professeur" ON public.averages;
CREATE POLICY "rls_averages_write_professeur" ON public.averages
  FOR ALL USING (
    public.is_professeur(school_id) AND public.professor_teaches_class(school_id, class_id)
  )
  WITH CHECK (
    public.is_professeur(school_id) AND public.professor_teaches_class(school_id, class_id)
  );

-- ----------------------------------------------------------------------------
-- Dépenses (caisse/comptabilité : direction + secrétaire)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "rls_expenses_read_staff" ON public.expenses;
CREATE POLICY "rls_expenses_read_staff" ON public.expenses
  FOR SELECT USING (
    public.is_super_admin()
    OR public.is_direction(school_id)
    OR public.is_secretaire(school_id)
  );
DROP POLICY IF EXISTS "rls_expenses_write_staff" ON public.expenses;
CREATE POLICY "rls_expenses_write_staff" ON public.expenses
  FOR ALL USING (
    public.is_super_admin()
    OR public.is_direction(school_id)
    OR public.is_secretaire(school_id)
  )
  WITH CHECK (
    public.is_super_admin()
    OR public.is_direction(school_id)
    OR public.is_secretaire(school_id)
  );

-- ----------------------------------------------------------------------------
-- Sauvegardes (Backups)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.backups') IS NOT NULL THEN
    DROP POLICY IF EXISTS "rls_backups_read_direction_secretaire" ON public.backups;
    CREATE POLICY "rls_backups_read_direction_secretaire" ON public.backups
      FOR SELECT USING (
        public.is_super_admin()
        OR public.is_direction(school_id)
        OR public.is_secretaire(school_id)
      );
    DROP POLICY IF EXISTS "rls_backups_insert_direction_secretaire" ON public.backups;
    CREATE POLICY "rls_backups_insert_direction_secretaire" ON public.backups
      FOR INSERT WITH CHECK (
        public.is_super_admin()
        OR public.is_direction(school_id)
        OR public.is_secretaire(school_id)
      );
    DROP POLICY IF EXISTS "rls_backups_update_direction" ON public.backups;
    CREATE POLICY "rls_backups_update_direction" ON public.backups
      FOR UPDATE USING (public.is_super_admin() OR public.is_direction(school_id));
    DROP POLICY IF EXISTS "rls_backups_delete_direction" ON public.backups;
    CREATE POLICY "rls_backups_delete_direction" ON public.backups
      FOR DELETE USING (public.is_super_admin() OR public.is_direction(school_id));
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- Licences (lecture par tous les membres ; écriture super admin uniquement)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.licenses') IS NOT NULL THEN
    DROP POLICY IF EXISTS "rls_licenses_read_member" ON public.licenses;
    CREATE POLICY "rls_licenses_read_member" ON public.licenses
      FOR SELECT USING (public.is_school_member(school_id) OR public.is_super_admin());
    DROP POLICY IF EXISTS "rls_licenses_write_admin" ON public.licenses;
    CREATE POLICY "rls_licenses_write_admin" ON public.licenses
      FOR ALL USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- Appareils (table devices, distincte de school_devices)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.devices') IS NOT NULL THEN
    DROP POLICY IF EXISTS "rls_devices_read_member" ON public.devices;
    CREATE POLICY "rls_devices_read_member" ON public.devices
      FOR SELECT USING (public.is_school_member(school_id) OR public.is_super_admin());
    DROP POLICY IF EXISTS "rls_devices_insert_member" ON public.devices;
    CREATE POLICY "rls_devices_insert_member" ON public.devices
      FOR INSERT WITH CHECK (public.is_school_member(school_id) OR public.is_super_admin());
    DROP POLICY IF EXISTS "rls_devices_update_direction" ON public.devices;
    CREATE POLICY "rls_devices_update_direction" ON public.devices
      FOR UPDATE USING (public.is_direction(school_id) OR public.is_super_admin());
    DROP POLICY IF EXISTS "rls_devices_delete_admin" ON public.devices;
    CREATE POLICY "rls_devices_delete_admin" ON public.devices
      FOR DELETE USING (public.is_super_admin());
  END IF;
END $$;

-- ============================================================================
-- FIN — Vérification rapide (facultatif) : liste des tables encore couvertes
-- par une politique d'écriture « tout membre » :
--   SELECT schemaname, tablename, policyname
--   FROM pg_policies
--   WHERE policyname NOT LIKE 'rls_%';
-- Aucune ligne attendue.
-- ============================================================================