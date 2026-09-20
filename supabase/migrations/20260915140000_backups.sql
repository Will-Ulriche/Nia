-- ==============================
-- TABLE: backups (Phase 27 - Sauvegarde & restauration)
-- ==============================
-- Historique des sauvegardes cloud. La table locale `backups` (SQLite)
-- contient les métadonnées et le payload JSON pour les sauvegardes
-- créées sur cet appareil.

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

-- Indexes
CREATE INDEX idx_backups_school_id ON public.backups(school_id);
CREATE INDEX idx_backups_created_at ON public.backups(created_at);

-- ==============================
-- RLS
-- ==============================
ALTER TABLE public.backups ENABLE ROW LEVEL SECURITY;

-- Modèle de rôle (cf. 20260914130008_rls_policies.sql) :
--   - Lecture/INSERT : direction et secrétaire (ou super admin)
--   - UPDATE/DELETE  : direction (ou super admin)
-- Note : anciennes politiques basées sur une table `user_roles` inexistante
-- (le rôle vit dans public.profiles) — corrompues et non appliquées.
CREATE POLICY "rls_backups_read_direction_secretaire" ON public.backups
FOR SELECT USING (
    public.is_super_admin()
    OR public.is_direction(school_id)
    OR public.is_secretaire(school_id)
);

CREATE POLICY "rls_backups_insert_direction_secretaire" ON public.backups
FOR INSERT WITH CHECK (
    public.is_super_admin()
    OR public.is_direction(school_id)
    OR public.is_secretaire(school_id)
);

CREATE POLICY "rls_backups_update_direction" ON public.backups
FOR UPDATE USING (
    public.is_super_admin() OR public.is_direction(school_id)
);

CREATE POLICY "rls_backups_delete_direction" ON public.backups
FOR DELETE USING (
    public.is_super_admin() OR public.is_direction(school_id)
);
