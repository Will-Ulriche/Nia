-- Migration: 010_averages
-- Description: Stored averages computed per student/subject/period

CREATE TABLE public.averages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    period_id UUID NOT NULL REFERENCES public.periods(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    -- If subject_id is filled: subject average. If NULL: general average.
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    average NUMERIC(5, 2) NOT NULL,
    rank INTEGER,
    appreciation TEXT,

    -- Sync fields
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID,
    device_id VARCHAR(255),

    -- Unique constraint: one average per student/period/subject
    -- subject_id can be NULL (general average), so we use COALESCE trick
    UNIQUE NULLS NOT DISTINCT (student_id, period_id, subject_id)
);

-- Enable RLS
ALTER TABLE public.averages ENABLE ROW LEVEL SECURITY;

-- Modèle de rôle (cf. 20260914130008_rls_policies.sql) :
--   - Lecture  : direction, secrétaire, et professeur (sur SES classes)
--   - Écriture : direction, et professeur (sur SES classes)
-- Un professeur déclenche le recalcul des moyennes à la saisie d'une note
-- (CalculationService) : il doit donc pouvoir insérer/mettre à jour les
-- moyennes des élèves de ses classes. Rien au-delà.
CREATE POLICY "rls_averages_read" ON public.averages
    FOR SELECT USING (
        public.is_super_admin()
        OR public.is_direction(school_id)
        OR public.is_secretaire(school_id)
        OR (public.is_professeur(school_id) AND public.professor_teaches_class(school_id, class_id))
    );

CREATE POLICY "rls_averages_write_direction" ON public.averages
    FOR ALL USING (public.is_direction(school_id))
    WITH CHECK (public.is_direction(school_id));

CREATE POLICY "rls_averages_write_professeur" ON public.averages
    FOR ALL USING (
        public.is_professeur(school_id) AND public.professor_teaches_class(school_id, class_id)
    )
    WITH CHECK (
        public.is_professeur(school_id) AND public.professor_teaches_class(school_id, class_id)
    );
