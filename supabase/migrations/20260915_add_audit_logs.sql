-- ==============================
-- TABLE: audit_logs
-- ==============================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    device_id UUID REFERENCES public.devices(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes pour les recherches fréquentes
CREATE INDEX idx_audit_logs_school_id ON public.audit_logs(school_id);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at);

-- RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Les politiques de `audit_logs` sont définies dans 20260914130008_rls_policies.sql
-- (lecture direction/super admin, insertion par tout membre, aucune mise à jour
-- ni suppression : logs immuables).
-- Les anciennes politiques de ce fichier référençaient une table `user_roles`
-- inexistante et faisaient échouer la migration ; elles ne sont pas reproduites.
