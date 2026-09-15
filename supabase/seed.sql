-- Seed file to create a default Super Admin for local development

-- 1. Insert a test user into auth.users
-- The password is 'password123' encrypted using crypt() and gen_salt()
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-1111-1111-111111111111',
    'authenticated',
    'authenticated',
    'admin@kemitia.local',
    crypt('password123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- 2. Insert the corresponding profile as 'super_admin'
INSERT INTO public.profiles (
    id,
    school_id, -- NULL because super_admin is not bound to a specific school at creation
    role,
    first_name,
    last_name,
    version
) VALUES (
    '11111111-1111-1111-1111-111111111111',
    NULL,
    'super_admin',
    'Super',
    'Admin',
    1
) ON CONFLICT (id) DO NOTHING;
