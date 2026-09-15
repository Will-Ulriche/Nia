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

-- Direction et super_admin peuvent consulter les sauvegardes de leur école
CREATE POLICY "Users can view their school's backups"
ON public.backups FOR SELECT
USING (
    auth.uid() IN (SELECT user_id FROM user_roles WHERE school_id = backups.school_id AND role IN ('direction', 'secretaire'))
    OR auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'super_admin')
);

-- Direction et super_admin peuvent créer des sauvegardes
CREATE POLICY "Users can insert backups for their school"
ON public.backups FOR INSERT
WITH CHECK (
    auth.uid() IN (SELECT user_id FROM user_roles WHERE school_id = backups.school_id)
    OR auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'super_admin')
);

-- Direction et super_admin peuvent mettre à jour les métadonnées
CREATE POLICY "Users can update their school's backups"
ON public.backups FOR UPDATE
USING (
    auth.uid() IN (SELECT user_id FROM user_roles WHERE school_id = backups.school_id AND role IN ('direction'))
    OR auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'super_admin')
);

-- Direction et super_admin peuvent supprimer des sauvegardes
CREATE POLICY "Users can delete their school's backups"
ON public.backups FOR DELETE
USING (
    auth.uid() IN (SELECT user_id FROM user_roles WHERE school_id = backups.school_id AND role IN ('direction'))
    OR auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'super_admin')
);
