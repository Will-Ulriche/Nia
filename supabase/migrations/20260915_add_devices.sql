-- ==============================
-- TABLE: devices
-- ==============================
CREATE TABLE IF NOT EXISTS public.devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    app_version TEXT,
    last_active_at TIMESTAMPTZ DEFAULT now(),
    last_sync_at TIMESTAMPTZ,
    is_revoked BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

-- Modèle de rôle (cf. 20260914130008_rls_policies.sql) :
--   - Lecture/INSERT : tous les membres de l'établissement
--   - UPDATE/DELETE  : direction (ou super admin) uniquement
-- Note : les anciennes politiques référençaient une table `user_roles` qui
-- n'existe nulle part (le rôle vit dans public.profiles). Elles faisaient
-- échouer cette migration en production. Corrigé ici.
CREATE POLICY "rls_devices_read_member" ON public.devices
FOR SELECT USING (public.is_school_member(school_id) OR public.is_super_admin());

CREATE POLICY "rls_devices_insert_member" ON public.devices
FOR INSERT WITH CHECK (public.is_school_member(school_id) OR public.is_super_admin());

CREATE POLICY "rls_devices_update_direction" ON public.devices
FOR UPDATE USING (public.is_direction(school_id) OR public.is_super_admin());

CREATE POLICY "rls_devices_delete_admin" ON public.devices
FOR DELETE USING (public.is_super_admin());
