-- =====================================================
-- KEMITIA - Script de migration complet (Production)
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
-- PARTIE 10 : FONCTIONS HELPER & POLICIES
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_current_user_school_id()
RETURNS UUID LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$ SELECT school_id FROM public.profiles WHERE id = auth.uid(); $$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'); $$;

-- Policies simples : super_admin voit tout, les autres voient leur école
CREATE POLICY "Super Admins can manage schools" ON public.schools FOR ALL USING (public.is_super_admin());
CREATE POLICY "Users can view their own school" ON public.schools FOR SELECT USING (id = public.get_current_user_school_id());

CREATE POLICY "Super Admins can manage profiles" ON public.profiles FOR ALL USING (public.is_super_admin());
CREATE POLICY "Users can view school profiles" ON public.profiles FOR SELECT USING (school_id = public.get_current_user_school_id());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (id = auth.uid());
-- Permettre l'insertion du profil lors de la première connexion
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (id = auth.uid());

-- Policies pour licences et appareils (super_admin uniquement)
CREATE POLICY "Super Admins manage licenses" ON public.licenses FOR ALL USING (public.is_super_admin());
CREATE POLICY "Users view own school license" ON public.licenses FOR SELECT USING (school_id = public.get_current_user_school_id());
CREATE POLICY "Super Admins manage devices" ON public.devices FOR ALL USING (public.is_super_admin());
CREATE POLICY "Users view own school devices" ON public.devices FOR SELECT USING (school_id = public.get_current_user_school_id());
CREATE POLICY "Super Admins manage backups" ON public.backups FOR ALL USING (public.is_super_admin());
CREATE POLICY "Users view own school backups" ON public.backups FOR SELECT USING (school_id = public.get_current_user_school_id());
CREATE POLICY "Users insert backups" ON public.backups FOR INSERT WITH CHECK (school_id = public.get_current_user_school_id() OR public.is_super_admin());

-- Policies génériques pour les tables métier (isolation par école)
DO $$
DECLARE
    t_name text;
    tables text[] := ARRAY[
        'school_modules', 'school_settings', 'school_devices',
        'academic_years', 'sections', 'levels', 'series', 'classes',
        'students', 'teachers', 'subjects', 'enrollments', 'teacher_assignments',
        'periods', 'assessments', 'grades', 'attendance',
        'fee_definitions', 'payments', 'receipts', 'expenses',
        'audit_logs', 'schedules', 'averages'
    ];
BEGIN
    FOREACH t_name IN ARRAY tables LOOP
        EXECUTE format('CREATE POLICY "Select %I" ON public.%I FOR SELECT USING (school_id = public.get_current_user_school_id() OR public.is_super_admin());', t_name, t_name);
        EXECUTE format('CREATE POLICY "Insert %I" ON public.%I FOR INSERT WITH CHECK (school_id = public.get_current_user_school_id() OR public.is_super_admin());', t_name, t_name);
        EXECUTE format('CREATE POLICY "Update %I" ON public.%I FOR UPDATE USING (school_id = public.get_current_user_school_id() OR public.is_super_admin());', t_name, t_name);
        EXECUTE format('CREATE POLICY "Delete %I" ON public.%I FOR DELETE USING (school_id = public.get_current_user_school_id() OR public.is_super_admin());', t_name, t_name);
    END LOOP;
END $$;

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
-- VALUES ('VOTRE_USER_ID', NULL, 'super_admin', 'Admin', 'Kemitia');
