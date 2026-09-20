-- Migration: 009_schedules
-- Description: Timetables for classes and teachers

CREATE TABLE public.schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 1 AND day_of_week <= 7), -- 1: Monday, 7: Sunday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    room VARCHAR(100),
    
    -- Sync fields
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID,
    device_id VARCHAR(255),
    deleted_at TIMESTAMPTZ,

    -- Contrainte: l'heure de fin doit être après l'heure de début
    CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Note: Les contraintes d'exclusion complexes pour le chevauchement (overlap) nécessiteraient
-- l'extension btree_gist qui n'est pas toujours activée par défaut. Nous ferons la vérification
-- de chevauchement côté applicatif (Service) pour simplifier.

-- Enable RLS
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

-- Modèle de rôle (cf. 20260914130008_rls_policies.sql) :
--   - Lecture  : tous les membres de l'établissement (emploi du temps partagé)
--   - Écriture : direction (ou super admin) uniquement
-- Aucune politique générique d'écriture : un professeur peut consulter
-- l'emploi du temps mais ne peut ni créér/modifier/supprimer un créneau.
CREATE POLICY "rls_schedules_read_member" ON public.schedules
    FOR SELECT USING (public.is_school_member(school_id) OR public.is_super_admin());

CREATE POLICY "rls_schedules_write_direction" ON public.schedules
    FOR ALL USING (public.is_direction(school_id))
    WITH CHECK (public.is_direction(school_id));
