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

CREATE POLICY "Averages viewable by school members"
    ON public.averages FOR SELECT
    USING (school_id IN (
        SELECT school_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Averages insertable by Direction"
    ON public.averages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.school_id = averages.school_id
            AND profiles.role IN ('super_admin', 'direction')
        )
    );

CREATE POLICY "Averages updatable by Direction"
    ON public.averages FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.school_id = averages.school_id
            AND profiles.role IN ('super_admin', 'direction')
        )
    );

CREATE POLICY "Averages deletable by Direction"
    ON public.averages FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.school_id = averages.school_id
            AND profiles.role IN ('super_admin', 'direction')
        )
    );
