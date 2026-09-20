-- ==============================
-- TABLE: licenses (Phase 28 - Activation & licence)
-- ==============================
-- Une licence lie un établissement à une clé d'activation validée côté serveur.
-- L'application vérifie la licence au démarrage (validation serveur) et la met
-- en cache localement pour fonctionner hors ligne entre deux validations.

CREATE TABLE IF NOT EXISTS public.licenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    license_key TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'expired' | 'cancelled' | 'pending'
    valid_from TIMESTAMPTZ,
    valid_until TIMESTAMPTZ,
    max_devices INTEGER NOT NULL DEFAULT 3,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX idx_licenses_school_id ON public.licenses(school_id);
CREATE INDEX idx_licenses_key ON public.licenses(license_key);

-- ==============================
-- RLS
-- ==============================
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;

-- Modèle de rôle (cf. 20260914130008_rls_policies.sql) :
--   - Lecture  : tous les membres (validation de licence côté application)
--   - INSERT/UPDATE/DELETE : super admin uniquement (gestion commerciale)
-- Note : anciennes politiques basées sur une table `user_roles` inexistante
-- (le rôle vit dans public.profiles) — corrompues et non appliquées.
CREATE POLICY "rls_licenses_read_member" ON public.licenses
FOR SELECT USING (
    public.is_school_member(school_id) OR public.is_super_admin()
);

CREATE POLICY "rls_licenses_write_admin" ON public.licenses
FOR ALL USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());