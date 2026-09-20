-- =====================================================
-- NIA - Script de migration complet (Production)
-- Copiez et exécutez ce script dans le SQL Editor de Supabase
-- =====================================================

-- =====================================================
-- PARTIE 1 : TABLES CORE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID,
    device_id VARCHAR(255),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    school_id UUID REFERENCES public.schools(id) ON DELETE RESTRICT,
    role VARCHAR(50) NOT NULL CHECK (role IN ('super_admin', 'direction', 'secretaire', 'professeur')),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID,
    device_id VARCHAR(255),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.school_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    module_name VARCHAR(100) NOT NULL CHECK (module_name IN ('college', 'lycee', 'primaire', 'universite', 'formation')),
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID,
    device_id VARCHAR(255),
    deleted_at TIMESTAMPTZ,
    UNIQUE(school_id, module_name)
);

CREATE TABLE IF NOT EXISTS public.school_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    key VARCHAR(255) NOT NULL,
    value JSONB NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID,
    device_id VARCHAR(255),
    deleted_at TIMESTAMPTZ,
    UNIQUE(school_id, key)
);

CREATE TABLE IF NOT EXISTS public.school_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    device_name VARCHAR(255) NOT NULL,
    last_sync_at TIMESTAMPTZ,
    app_version VARCHAR(50),
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID,
    device_id VARCHAR(255),
    deleted_at TIMESTAMPTZ
);

-- =====================================================
-- PARTIE 2 : ACADEMIC
-- =====================================================

CREATE TABLE IF NOT EXISTS public.academic_years (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID,
    device_id VARCHAR(255),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID,
    device_id VARCHAR(255),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    section_id UUID NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    level_order INTEGER NOT NULL DEFAULT 0,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID,
    device_id VARCHAR(255),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.series (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    level_id UUID NOT NULL REFERENCES public.levels(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID,
    device_id VARCHAR(255),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    level_id UUID NOT NULL REFERENCES public.levels(id) ON DELETE CASCADE,
    academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
    series_id UUID REFERENCES public.series(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID,
    device_id VARCHAR(255),
    deleted_at TIMESTAMPTZ
);

-- =====================================================
-- PARTIE 3 : PEOPLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    matricule VARCHAR(100),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    gender VARCHAR(20),
    birth_date DATE,
    birth_place VARCHAR(255),
    address TEXT,
    contact_phone VARCHAR(100),
    contact_email VARCHAR(255),
    parent_name VARCHAR(255),
    parent_contact VARCHAR(100),
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID,
    device_id VARCHAR(255),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    contact_phone VARCHAR(100),
    contact_email VARCHAR(255),
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID,
    device_id VARCHAR(255),
    deleted_at TIMESTAMPTZ
);

-- =====================================================
-- PARTIE 4 : ENROLLMENTS & SUBJECTS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50),
    description TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID,
    device_id VARCHAR(255),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID,
    device_id VARCHAR(255),
    deleted_at TIMESTAMPTZ,
    UNIQUE(student_id, academic_year_id)
);

CREATE TABLE IF NOT EXISTS public.teacher_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID,
    device_id VARCHAR(255),
    deleted_at TIMESTAMPTZ,
    UNIQUE(teacher_id, subject_id, class_id, academic_year_id)
);

-- =====================================================
-- PARTIE 5 : GRADES & ATTENDANCE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    start_date DATE,
    end_date DATE,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID,
    device_id VARCHAR(255),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    period_id UUID NOT NULL REFERENCES public.periods(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    assessment_date DATE NOT NULL,
    total_score NUMERIC(5, 2) NOT NULL DEFAULT 20.0,
    weight NUMERIC(5, 2) NOT NULL DEFAULT 1.0,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID,
    device_id VARCHAR(255),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.grades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    score NUMERIC(5, 2),
    is_absent BOOLEAN NOT NULL DEFAULT FALSE,
    comments TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID,
    device_id VARCHAR(255),
    deleted_at TIMESTAMPTZ,
    UNIQUE(assessment_id, student_id)
);

CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    period_id UUID REFERENCES public.periods(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    status VARCHAR(50) NOT NULL,
    justification TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID,
    device_id VARCHAR(255),
    deleted_at TIMESTAMPTZ
);

-- =====================================================
-- PARTIE 6 : FINANCE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.fee_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    description TEXT,
    is_mandatory BOOLEAN NOT NULL DEFAULT TRUE,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID,
    device_id VARCHAR(255),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
    fee_definition_id UUID REFERENCES public.fee_definitions(id) ON DELETE SET NULL,
    amount NUMERIC(10, 2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_method VARCHAR(50),
    reference_number VARCHAR(255),
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID,
    device_id VARCHAR(255),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
    receipt_number VARCHAR(100) NOT NULL,
    issued_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    issue_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID,
    device_id VARCHAR(255),
    deleted_at TIMESTAMPTZ,
    UNIQUE(school_id, receipt_number)
);

CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    expense_date DATE NOT NULL,
    description TEXT,
    recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID,
    device_id VARCHAR(255),
    deleted_at TIMESTAMPTZ
);

-- =====================================================
-- PARTIE 7 : AUDIT, SCHEDULES, AVERAGES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    details JSONB,
    device_id VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version INTEGER NOT NULL DEFAULT 1,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 1 AND day_of_week <= 7),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    room VARCHAR(100),
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID,
    device_id VARCHAR(255),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

CREATE TABLE IF NOT EXISTS public.averages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    period_id UUID NOT NULL REFERENCES public.periods(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    average NUMERIC(5, 2) NOT NULL,
    rank INTEGER,
    appreciation TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID,
    device_id VARCHAR(255),
    UNIQUE NULLS NOT DISTINCT (student_id, period_id, subject_id)
);

-- =====================================================
-- PARTIE 8 : BACKUPS & LICENSES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.backups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    scope TEXT NOT NULL DEFAULT 'cloud',
    kind TEXT NOT NULL DEFAULT 'logical',
    note TEXT,
    checksum TEXT,
    data JSONB,
    row_counts JSONB,
    size_bytes BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.licenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    activation_key VARCHAR(255) NOT NULL UNIQUE,
    plan VARCHAR(50) NOT NULL DEFAULT 'standard',
    starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    activated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    device_fingerprint VARCHAR(255) NOT NULL,
    device_name VARCHAR(255),
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(school_id, device_fingerprint)
);

-- =====================================================
-- PARTIE 9 : ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.averages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PARTIE 10 : FONCTIONS HELPER & POLITIQUES DE RÔLE
-- =====================================================
-- Modèle d'accès imposé côté serveur (RLS) :
--   SUPER_ADMIN  -> toute la plateforme
--   DIRECTION    -> gestion complète de son établissement
--   SECRÉTAIRE   -> élèves, inscriptions, paiements, caisse/comptabilité,
--                   présences ; lecture sur le reste de l'établissement
--   PROFESSEUR   -> uniquement SES classes, SES matières, SES notes,
--                   SES présences, SES moyennes
-- IMPORTANT : les politiques RLS de PostgreSQL sont additives (OR). Aucune
-- politique générique « tout membre peut écrire » ne doit exister, sinon elle
-- annule les politiques de rôle. Celles-ci n'existent donc pas ici.

CREATE OR REPLACE FUNCTION public.get_current_user_school_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT school_id FROM public.profiles WHERE id = auth.uid() AND deleted_at IS NULL; $$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin' AND deleted_at IS NULL); $$;

CREATE OR REPLACE FUNCTION public.profile_role(_school_id UUID)
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT role FROM public.profiles WHERE id = auth.uid() AND school_id = _school_id AND deleted_at IS NULL LIMIT 1; $$;

CREATE OR REPLACE FUNCTION public.is_school_member(_school_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT (public.profile_role(_school_id) IS NOT NULL); $$;

CREATE OR REPLACE FUNCTION public.is_direction(_school_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT (public.profile_role(_school_id) = 'direction'); $$;

CREATE OR REPLACE FUNCTION public.is_secretaire(_school_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT (public.profile_role(_school_id) = 'secretaire'); $$;

CREATE OR REPLACE FUNCTION public.is_professeur(_school_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT (public.profile_role(_school_id) = 'professeur'); $$;

CREATE OR REPLACE FUNCTION public.current_teacher_id(_school_id UUID)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT t.id FROM public.teachers t WHERE t.school_id = _school_id AND t.profile_id = auth.uid() AND t.deleted_at IS NULL LIMIT 1; $$;

CREATE OR REPLACE FUNCTION public.professor_teaches_class(_school_id UUID, _class_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT (public.current_teacher_id(_school_id) IS NOT NULL AND EXISTS (
  SELECT 1 FROM public.teacher_assignments ta
  WHERE ta.school_id = _school_id AND ta.class_id = _class_id
    AND ta.teacher_id = public.current_teacher_id(_school_id) AND ta.deleted_at IS NULL)); $$;

CREATE OR REPLACE FUNCTION public.professor_teaches_subject(_school_id UUID, _subject_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (
  SELECT 1 FROM public.teacher_assignments ta
  WHERE ta.school_id = _school_id AND ta.subject_id = _subject_id
    AND ta.teacher_id = public.current_teacher_id(_school_id) AND ta.deleted_at IS NULL); $$;

CREATE OR REPLACE FUNCTION public.professor_owns_assessment(_school_id UUID, _assessment_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (
  SELECT 1 FROM public.assessments a
  WHERE a.id = _assessment_id AND a.school_id = _school_id
    AND public.professor_teaches_class(_school_id, a.class_id)); $$;

CREATE OR REPLACE FUNCTION public.professor_has_student(_school_id UUID, _student_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (
  SELECT 1 FROM public.enrollments e
  WHERE e.student_id = _student_id AND e.school_id = _school_id AND e.deleted_at IS NULL
    AND public.professor_teaches_class(_school_id, e.class_id)); $$;

-- Anti-escalade : un utilisateur ne peut pas modifier son propre rôle/école ;
-- et seul un super_admin peut créer/promouvoir un super_admin.
CREATE OR REPLACE FUNCTION public.protect_profile_privileges()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'super_admin' AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Seul un super admin peut promouvoir un super admin.';
  END IF;
  IF NEW.id = auth.uid() AND NOT public.is_super_admin() THEN
    IF NOT public.is_direction(OLD.school_id) AND NOT public.is_direction(NEW.school_id) THEN
      IF NEW.role IS DISTINCT FROM OLD.role OR NEW.school_id IS DISTINCT FROM OLD.school_id THEN
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
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public
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

-- ==============================
-- schools
-- ==============================
CREATE POLICY "rls_schools_admin_all" ON public.schools FOR ALL USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());
CREATE POLICY "rls_schools_read_own" ON public.schools FOR SELECT USING (id = public.get_current_user_school_id());

-- ==============================
-- profiles
-- ==============================
CREATE POLICY "rls_profiles_admin_all" ON public.profiles FOR ALL USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());
CREATE POLICY "rls_profiles_read_school" ON public.profiles FOR SELECT USING (school_id = public.get_current_user_school_id());
CREATE POLICY "rls_profiles_direction_insert" ON public.profiles FOR INSERT WITH CHECK (public.is_direction(school_id) AND role <> 'super_admin');
CREATE POLICY "rls_profiles_direction_update" ON public.profiles FOR UPDATE USING (public.is_direction(school_id))
  WITH CHECK (public.is_direction(school_id) AND role <> 'super_admin');
CREATE POLICY "rls_profiles_self_update" ON public.profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "rls_profiles_delete_admin" ON public.profiles FOR DELETE USING (public.is_super_admin());

-- ==============================
-- Paramètres / modules / appareils
-- ==============================
CREATE POLICY "rls_school_modules_read_member" ON public.school_modules FOR SELECT USING (public.is_school_member(school_id) OR public.is_super_admin());
CREATE POLICY "rls_school_modules_write_direction" ON public.school_modules FOR ALL USING (public.is_direction(school_id))
  WITH CHECK (public.is_direction(school_id));

CREATE POLICY "rls_school_settings_read_member" ON public.school_settings FOR SELECT USING (public.is_school_member(school_id) OR public.is_super_admin());
CREATE POLICY "rls_school_settings_write_direction" ON public.school_settings FOR ALL USING (public.is_direction(school_id))
  WITH CHECK (public.is_direction(school_id));

CREATE POLICY "rls_school_devices_read_member" ON public.school_devices FOR SELECT USING (public.is_school_member(school_id) OR public.is_super_admin());
CREATE POLICY "rls_school_devices_insert_member" ON public.school_devices FOR INSERT WITH CHECK (public.is_school_member(school_id) OR public.is_super_admin());
CREATE POLICY "rls_school_devices_update_direction" ON public.school_devices FOR UPDATE USING (public.is_direction(school_id) OR public.is_super_admin());
CREATE POLICY "rls_school_devices_delete_direction" ON public.school_devices FOR DELETE USING (public.is_direction(school_id) OR public.is_super_admin());

-- ==============================
-- Structure académique
-- ==============================
CREATE POLICY "rls_academic_years_read_member" ON public.academic_years FOR SELECT USING (public.is_school_member(school_id) OR public.is_super_admin());
CREATE POLICY "rls_academic_years_write_direction" ON public.academic_years FOR ALL USING (public.is_direction(school_id))
  WITH CHECK (public.is_direction(school_id));

CREATE POLICY "rls_sections_read_member" ON public.sections FOR SELECT USING (public.is_school_member(school_id) OR public.is_super_admin());
CREATE POLICY "rls_sections_write_direction" ON public.sections FOR ALL USING (public.is_direction(school_id))
  WITH CHECK (public.is_direction(school_id));

CREATE POLICY "rls_levels_read_member" ON public.levels FOR SELECT USING (public.is_school_member(school_id) OR public.is_super_admin());
CREATE POLICY "rls_levels_write_direction" ON public.levels FOR ALL USING (public.is_direction(school_id))
  WITH CHECK (public.is_direction(school_id));

CREATE POLICY "rls_series_read_member" ON public.series FOR SELECT USING (public.is_school_member(school_id) OR public.is_super_admin());
CREATE POLICY "rls_series_write_direction" ON public.series FOR ALL USING (public.is_direction(school_id))
  WITH CHECK (public.is_direction(school_id));

CREATE POLICY "rls_classes_read_staff_teacher" ON public.classes FOR SELECT USING (
  public.is_super_admin() OR public.is_direction(school_id) OR public.is_secretaire(school_id)
  OR (public.is_professeur(school_id) AND public.professor_teaches_class(school_id, id)));
CREATE POLICY "rls_classes_write_direction" ON public.classes FOR ALL USING (public.is_direction(school_id))
  WITH CHECK (public.is_direction(school_id));

-- ==============================
-- Personnes
-- ==============================
CREATE POLICY "rls_students_read" ON public.students FOR SELECT USING (
  public.is_super_admin() OR public.is_direction(school_id) OR public.is_secretaire(school_id)
  OR (public.is_professeur(school_id) AND public.professor_has_student(school_id, id)));
CREATE POLICY "rls_students_write_staff" ON public.students FOR ALL USING (
  public.is_super_admin() OR public.is_direction(school_id) OR public.is_secretaire(school_id))
  WITH CHECK (
  public.is_super_admin() OR public.is_direction(school_id) OR public.is_secretaire(school_id));

CREATE POLICY "rls_teachers_read_member" ON public.teachers FOR SELECT USING (public.is_school_member(school_id) OR public.is_super_admin());
CREATE POLICY "rls_teachers_write_direction" ON public.teachers FOR ALL USING (public.is_direction(school_id))
  WITH CHECK (public.is_direction(school_id));

-- ==============================
-- Matières / inscriptions / affectations
-- ==============================
CREATE POLICY "rls_subjects_read" ON public.subjects FOR SELECT USING (
  public.is_super_admin() OR public.is_direction(school_id) OR public.is_secretaire(school_id)
  OR (public.is_professeur(school_id) AND public.professor_teaches_subject(school_id, id)));
CREATE POLICY "rls_subjects_write_direction" ON public.subjects FOR ALL USING (public.is_direction(school_id))
  WITH CHECK (public.is_direction(school_id));

CREATE POLICY "rls_enrollments_read" ON public.enrollments FOR SELECT USING (
  public.is_super_admin() OR public.is_direction(school_id) OR public.is_secretaire(school_id)
  OR (public.is_professeur(school_id) AND public.professor_teaches_class(school_id, class_id)));
CREATE POLICY "rls_enrollments_write_staff" ON public.enrollments FOR ALL USING (
  public.is_super_admin() OR public.is_direction(school_id) OR public.is_secretaire(school_id))
  WITH CHECK (
  public.is_super_admin() OR public.is_direction(school_id) OR public.is_secretaire(school_id));

CREATE POLICY "rls_teacher_assignments_read" ON public.teacher_assignments FOR SELECT USING (
  public.is_super_admin() OR public.is_direction(school_id) OR public.is_secretaire(school_id)
  OR (public.is_professeur(school_id) AND teacher_id = public.current_teacher_id(school_id)));
CREATE POLICY "rls_teacher_assignments_write_direction" ON public.teacher_assignments FOR ALL USING (public.is_direction(school_id))
  WITH CHECK (public.is_direction(school_id));

-- ==============================
-- Périodes
-- ==============================
CREATE POLICY "rls_periods_read_member" ON public.periods FOR SELECT USING (public.is_school_member(school_id) OR public.is_super_admin());
CREATE POLICY "rls_periods_write_direction" ON public.periods FOR ALL USING (public.is_direction(school_id))
  WITH CHECK (public.is_direction(school_id));

-- ==============================
-- Évaluations / notes / assiduité
-- ==============================
CREATE POLICY "rls_assessments_read" ON public.assessments FOR SELECT USING (
  public.is_super_admin() OR public.is_direction(school_id) OR public.is_secretaire(school_id)
  OR (public.is_professeur(school_id) AND public.professor_teaches_class(school_id, class_id)));
CREATE POLICY "rls_assessments_write_direction" ON public.assessments FOR ALL USING (public.is_direction(school_id))
  WITH CHECK (public.is_direction(school_id));
CREATE POLICY "rls_assessments_write_professeur" ON public.assessments FOR ALL USING (
  public.is_professeur(school_id) AND public.professor_teaches_class(school_id, class_id))
  WITH CHECK (
  public.is_professeur(school_id) AND public.professor_teaches_class(school_id, class_id));

CREATE POLICY "rls_grades_read" ON public.grades FOR SELECT USING (
  public.is_super_admin() OR public.is_direction(school_id) OR public.is_secretaire(school_id)
  OR (public.is_professeur(school_id) AND public.professor_owns_assessment(school_id, assessment_id)));
CREATE POLICY "rls_grades_write_direction" ON public.grades FOR ALL USING (public.is_direction(school_id))
  WITH CHECK (public.is_direction(school_id));
CREATE POLICY "rls_grades_write_professeur" ON public.grades FOR ALL USING (
  public.is_professeur(school_id) AND public.professor_owns_assessment(school_id, assessment_id))
  WITH CHECK (
  public.is_professeur(school_id) AND public.professor_owns_assessment(school_id, assessment_id));

CREATE POLICY "rls_attendance_read" ON public.attendance FOR SELECT USING (
  public.is_super_admin() OR public.is_direction(school_id) OR public.is_secretaire(school_id)
  OR (public.is_professeur(school_id) AND public.professor_teaches_class(school_id, class_id)));
CREATE POLICY "rls_attendance_write" ON public.attendance FOR ALL USING (
  public.is_super_admin() OR public.is_direction(school_id) OR public.is_secretaire(school_id)
  OR (public.is_professeur(school_id) AND public.professor_teaches_class(school_id, class_id)))
  WITH CHECK (
  public.is_super_admin() OR public.is_direction(school_id) OR public.is_secretaire(school_id)
  OR (public.is_professeur(school_id) AND public.professor_teaches_class(school_id, class_id)));

-- ==============================
-- Finance (direction + secrétaire)
-- ==============================
CREATE POLICY "rls_fee_definitions_read_staff" ON public.fee_definitions FOR SELECT USING (
  public.is_super_admin() OR public.is_direction(school_id) OR public.is_secretaire(school_id));
CREATE POLICY "rls_fee_definitions_write_direction" ON public.fee_definitions FOR ALL USING (public.is_direction(school_id))
  WITH CHECK (public.is_direction(school_id));

CREATE POLICY "rls_payments_read_staff" ON public.payments FOR SELECT USING (
  public.is_super_admin() OR public.is_direction(school_id) OR public.is_secretaire(school_id));
CREATE POLICY "rls_payments_write_staff" ON public.payments FOR ALL USING (
  public.is_super_admin() OR public.is_direction(school_id) OR public.is_secretaire(school_id))
  WITH CHECK (
  public.is_super_admin() OR public.is_direction(school_id) OR public.is_secretaire(school_id));

CREATE POLICY "rls_receipts_read_staff" ON public.receipts FOR SELECT USING (
  public.is_super_admin() OR public.is_direction(school_id) OR public.is_secretaire(school_id));
CREATE POLICY "rls_receipts_write_staff" ON public.receipts FOR ALL USING (
  public.is_super_admin() OR public.is_direction(school_id) OR public.is_secretaire(school_id))
  WITH CHECK (
  public.is_super_admin() OR public.is_direction(school_id) OR public.is_secretaire(school_id));

-- ==============================
-- Dépenses
-- ==============================
CREATE POLICY "rls_expenses_read_staff" ON public.expenses FOR SELECT USING (
  public.is_super_admin() OR public.is_direction(school_id) OR public.is_secretaire(school_id));
CREATE POLICY "rls_expenses_write_staff" ON public.expenses FOR ALL USING (
  public.is_super_admin() OR public.is_direction(school_id) OR public.is_secretaire(school_id))
  WITH CHECK (
  public.is_super_admin() OR public.is_direction(school_id) OR public.is_secretaire(school_id));

-- ==============================
-- Journal d'audit (immuable)
-- ==============================
CREATE POLICY "rls_audit_logs_read_direction" ON public.audit_logs FOR SELECT USING (
  public.is_super_admin() OR public.is_direction(school_id));
CREATE POLICY "rls_audit_logs_insert_member" ON public.audit_logs FOR INSERT WITH CHECK (
  public.is_super_admin() OR public.is_school_member(school_id));

-- ==============================
-- Emplois du temps
-- ==============================
CREATE POLICY "rls_schedules_read_member" ON public.schedules FOR SELECT USING (public.is_school_member(school_id) OR public.is_super_admin());
CREATE POLICY "rls_schedules_write_direction" ON public.schedules FOR ALL USING (public.is_direction(school_id))
  WITH CHECK (public.is_direction(school_id));

-- ==============================
-- Moyennes
-- ==============================
CREATE POLICY "rls_averages_read" ON public.averages FOR SELECT USING (
  public.is_super_admin() OR public.is_direction(school_id) OR public.is_secretaire(school_id)
  OR (public.is_professeur(school_id) AND public.professor_teaches_class(school_id, class_id)));
CREATE POLICY "rls_averages_write_direction" ON public.averages FOR ALL USING (public.is_direction(school_id))
  WITH CHECK (public.is_direction(school_id));
CREATE POLICY "rls_averages_write_professeur" ON public.averages FOR ALL USING (
  public.is_professeur(school_id) AND public.professor_teaches_class(school_id, class_id))
  WITH CHECK (
  public.is_professeur(school_id) AND public.professor_teaches_class(school_id, class_id));

-- ==============================
-- Licences / Appareils / Sauvegardes (super admin / membres)
-- ==============================
CREATE POLICY "rls_licenses_read_member" ON public.licenses FOR SELECT USING (public.is_school_member(school_id) OR public.is_super_admin());
CREATE POLICY "rls_licenses_write_admin" ON public.licenses FOR ALL USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "rls_devices_read_member" ON public.devices FOR SELECT USING (public.is_school_member(school_id) OR public.is_super_admin());
CREATE POLICY "rls_devices_insert_member" ON public.devices FOR INSERT WITH CHECK (public.is_school_member(school_id) OR public.is_super_admin());
CREATE POLICY "rls_devices_update_direction" ON public.devices FOR UPDATE USING (public.is_direction(school_id) OR public.is_super_admin());
CREATE POLICY "rls_devices_delete_admin" ON public.devices FOR DELETE USING (public.is_super_admin());

CREATE POLICY "rls_backups_read_direction_secretaire" ON public.backups FOR SELECT USING (
  public.is_super_admin() OR public.is_direction(school_id) OR public.is_secretaire(school_id));
CREATE POLICY "rls_backups_insert_direction_secretaire" ON public.backups FOR INSERT WITH CHECK (
  public.is_super_admin() OR public.is_direction(school_id) OR public.is_secretaire(school_id));
CREATE POLICY "rls_backups_update_direction" ON public.backups FOR UPDATE USING (public.is_super_admin() OR public.is_direction(school_id));
CREATE POLICY "rls_backups_delete_direction" ON public.backups FOR DELETE USING (public.is_super_admin() OR public.is_direction(school_id));

-- =====================================================
-- PARTIE 11 : TRIGGER pour créer le profil automatiquement
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    -- Le profil sera créé manuellement par le super_admin ou via l'app
    -- Ce trigger peut être utilisé pour des initialisations futures
    RETURN NEW;
END;
$$;

-- =====================================================
-- PARTIE 12 : VOTRE PREMIER COMPTE SUPER ADMIN
-- Remplacez 'VOTRE_USER_ID' par l'UUID de votre utilisateur
-- (Visible dans Authentication > Users dans Supabase)
-- =====================================================

-- INSERT INTO public.profiles (id, school_id, role, first_name, last_name)
-- VALUES ('VOTRE_USER_ID', NULL, 'super_admin', 'Admin', 'Nia');
