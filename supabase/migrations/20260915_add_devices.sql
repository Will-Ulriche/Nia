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

-- Les utilisateurs peuvent voir les appareils de leur école
CREATE POLICY "Users can view their school's devices" 
ON public.devices FOR SELECT 
USING (auth.uid() IN (SELECT user_id FROM user_roles WHERE school_id = devices.school_id) OR auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'super_admin'));

-- Les utilisateurs peuvent enregistrer leur appareil
CREATE POLICY "Users can insert devices" 
ON public.devices FOR INSERT 
WITH CHECK (auth.uid() IN (SELECT user_id FROM user_roles WHERE school_id = devices.school_id) OR auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'super_admin'));

-- Les utilisateurs peuvent mettre à jour leur appareil (heartbeat, sync)
CREATE POLICY "Users can update their school's devices" 
ON public.devices FOR UPDATE 
USING (auth.uid() IN (SELECT user_id FROM user_roles WHERE school_id = devices.school_id) OR auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'super_admin'));
