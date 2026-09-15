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

-- Tout membre de l'établissement peut consulter la licence de son école
-- (nécessaire pour la validation côté application) ; le super_admin voit tout.
CREATE POLICY "Users can view their school's licenses"
ON public.licenses FOR SELECT
USING (
    auth.uid() IN (SELECT user_id FROM user_roles WHERE school_id = licenses.school_id)
    OR auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'super_admin')
);

-- Seul le super_admin crée, modifie ou supprime les licences (gestion commerciale)
CREATE POLICY "Super admin can insert licenses"
ON public.licenses FOR INSERT
WITH CHECK (
    auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'super_admin')
);

CREATE POLICY "Super admin can update licenses"
ON public.licenses FOR UPDATE
USING (
    auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'super_admin')
);

CREATE POLICY "Super admin can delete licenses"
ON public.licenses FOR DELETE
USING (
    auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'super_admin')
);