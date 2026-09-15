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

-- Seule la direction et le super_admin peuvent lire les logs
CREATE POLICY "Direction can view their school's audit logs" 
ON public.audit_logs FOR SELECT 
USING (auth.uid() IN (SELECT user_id FROM user_roles WHERE school_id = audit_logs.school_id AND role IN ('direction', 'super_admin')));

-- Tous les utilisateurs (authentifiés) peuvent insérer des logs pour leur école
CREATE POLICY "Users can insert audit logs" 
ON public.audit_logs FOR INSERT 
WITH CHECK (auth.uid() IN (SELECT user_id FROM user_roles WHERE school_id = audit_logs.school_id) OR auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'super_admin'));
