-- Migration: 011_expenses
-- Description: Table for school expenses

CREATE TABLE public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL, -- e.g., 'Salaire', 'Matériel', 'Facture'
    amount NUMERIC(10, 2) NOT NULL,
    expense_date DATE NOT NULL,
    description TEXT,
    recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    
    -- Sync fields
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID,
    device_id VARCHAR(255),
    deleted_at TIMESTAMPTZ
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Modèle de rôle (cf. 20260914130008_rls_policies.sql) :
-- Les dépenses font partie de la caisse/comptabilité : seules la direction
-- et la secrétaire y accèdent (lecture + écriture). Un professeur n'a aucune
-- visibilité sur la finance.
CREATE POLICY "rls_expenses_read_staff" ON public.expenses
    FOR SELECT USING (
        public.is_super_admin()
        OR public.is_direction(school_id)
        OR public.is_secretaire(school_id)
    );

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
