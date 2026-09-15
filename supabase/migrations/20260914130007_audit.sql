-- Migration: 007_audit
-- Description: System audit logs

-- 1. Table: audit_logs
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE, -- Can be null for system-wide events
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL, -- e.g. "student.created", "payment.recorded"
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    details JSONB,
    device_id VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Audit logs are immutable and don't need update/sync versioning the same way,
    -- but we include sync metadata for the offline-first replication.
    version INTEGER NOT NULL DEFAULT 1,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Base RLS Policy Template for all multi-tenant tables
-- This policy ensures users can only read/write data for their assigned school.
-- Usage: This must be applied across all tables that have school_id.
-- (Implementation of policies will be refined as auth hooks are created).
