-- Migration: 008_rls_policies
-- Description: Multi-tenant isolation policies and helper functions

-- Helper function to get current user's school_id
CREATE OR REPLACE FUNCTION public.get_current_user_school_id()
RETURNS UUID
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT school_id FROM public.profiles WHERE id = auth.uid();
$$;

-- Helper function to check if current user is super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'super_admin'
  );
$$;

-------------------------------------------------------------------------------
-- 1. SCHOOLS
-------------------------------------------------------------------------------
-- Super Admins can do everything
CREATE POLICY "Super Admins can manage schools" ON public.schools
FOR ALL USING (public.is_super_admin());

-- Users can only view their own school
CREATE POLICY "Users can view their own school" ON public.schools
FOR SELECT USING (id = public.get_current_user_school_id());

-------------------------------------------------------------------------------
-- 2. PROFILES
-------------------------------------------------------------------------------
-- Super admins can view/manage all profiles
CREATE POLICY "Super Admins can manage profiles" ON public.profiles
FOR ALL USING (public.is_super_admin());

-- Users can view profiles from their own school
CREATE POLICY "Users can view school profiles" ON public.profiles
FOR SELECT USING (school_id = public.get_current_user_school_id());

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE USING (id = auth.uid());

-------------------------------------------------------------------------------
-- 3. ISOLATION POLICY TEMPLATE FOR ALL OTHER TABLES
-------------------------------------------------------------------------------
-- For simplicity in this script, we apply a blanket policy allowing read/write
-- to users whose school_id matches the row's school_id. 
-- Role-based restrictions (direction, secretaire, professeur) will be added in later phases.

DO $$
DECLARE
    t_name text;
    tables text[] := ARRAY[
        'school_modules', 'school_settings', 'school_devices',
        'academic_years', 'sections', 'levels', 'series', 'classes',
        'students', 'teachers', 'subjects', 'enrollments', 'teacher_assignments',
        'periods', 'assessments', 'grades', 'attendance',
        'fee_definitions', 'payments', 'receipts', 'audit_logs'
    ];
BEGIN
    FOREACH t_name IN ARRAY tables
    LOOP
        -- SELECT Policy
        EXECUTE format(
            'CREATE POLICY "Tenant isolation select for %I" ON public.%I FOR SELECT USING (school_id = public.get_current_user_school_id() OR public.is_super_admin());',
            t_name, t_name
        );
        -- INSERT Policy
        EXECUTE format(
            'CREATE POLICY "Tenant isolation insert for %I" ON public.%I FOR INSERT WITH CHECK (school_id = public.get_current_user_school_id() OR public.is_super_admin());',
            t_name, t_name
        );
        -- UPDATE Policy
        EXECUTE format(
            'CREATE POLICY "Tenant isolation update for %I" ON public.%I FOR UPDATE USING (school_id = public.get_current_user_school_id() OR public.is_super_admin());',
            t_name, t_name
        );
        -- DELETE Policy
        EXECUTE format(
            'CREATE POLICY "Tenant isolation delete for %I" ON public.%I FOR DELETE USING (school_id = public.get_current_user_school_id() OR public.is_super_admin());',
            t_name, t_name
        );
    END LOOP;
END
$$;
