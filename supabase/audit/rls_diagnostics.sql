-- ============================================================
-- PROTOCOLE DE DIAGNOSTIC RLS — Projet Nia (P0-03)
-- À exécuter AVEC le rôle postgres dans le SQL Editor Supabase
-- (Dashboard -> SQL Editor -> Nouvelle requête), puis copier
-- l'INTÉGRALITÉ du résultat et le restituer.
-- ============================================================

-- 1) TABLES PUBLIQUES + RLS activé + nombre de politiques
SELECT c.relname                                       AS table_name,
       c.relrowsecurity                                AS rls_enabled,
       c.relforcerowsecurity                           AS rls_forced,
       (SELECT count(*) FROM pg_policy p
         WHERE p.polrelid = c.oid)                     AS policy_count
FROM pg_class c
WHERE c.relkind = 'r'
  AND c.relnamespace = 'public'::regnamespace
ORDER BY c.relname;

-- 2) POLITIQUES RLS PAR TABLE
SELECT t.relname                       AS table_name,
       p.polname                       AS policy_name,
       p.polpermissive                 AS permissive,          -- true=PERMISSIVE false=RESTRICTIVE
       p.polroles::regrole[]           AS roles,
       CASE p.polcmd
         WHEN 'r' THEN 'SELECT'
         WHEN 'a' THEN 'INSERT'
         WHEN 'w' THEN 'UPDATE'
         WHEN 'd' THEN 'DELETE'
         WHEN '*' THEN 'ALL' END       AS command,
       pg_get_expr(p.polqual, p.polrelid)     AS using_expr,
       pg_get_expr(p.polwithcheck, p.polrelid) AS with_check_expr
FROM pg_policy p
JOIN pg_class t ON t.oid = p.polrelid
WHERE t.relnamespace = 'public'::regnamespace
ORDER BY t.relname, p.polname;

-- 3) FONCTIONS SECURITY DEFINER OU LISANT AUTH.UID()/SESSION_USER
-- (prokind = 'f' exclut les agrégats -> évite l'erreur 42809 "array_agg is an aggregate function")
SELECT n.nspname             AS schema_,
       f.proname             AS function_name,
       f.prosecdef           AS security_definer,
       pg_get_function_arguments(f.oid) AS args,
       pg_get_functiondef(f.oid)        AS definition
FROM (SELECT * FROM pg_proc WHERE prokind = 'f') f
JOIN pg_namespace n ON n.oid = f.pronamespace
WHERE (f.prosecdef
       OR pg_get_functiondef(f.oid) ILIKE '%auth.uid()%'
       OR pg_get_functiondef(f.oid) ILIKE '%session_user%'
       OR pg_get_functiondef(f.oid) ILIKE '%request.jwt.claim%')
  AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'extensions')
ORDER BY n.nspname, f.proname;

-- 4) GRANTS SUR LA SCHEMA PUBLIC (PRIVILEGES PAR ROLE)
SELECT table_name, grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
ORDER BY table_name, grantee, privilege_type;

-- 5) MIGRATIONS SUPABASE TRACKÉES (uniquement si le CLI a été utilisé)
-- Résolution via SQL dynamique pour éviter l'erreur 42P01 si le schéma n'existe pas
CREATE OR REPLACE FUNCTION pg_temp.tmp_list_migrations()
RETURNS TABLE(version bigint, name text) LANGUAGE plpgsql AS $$
BEGIN
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    RETURN QUERY EXECUTE
      'SELECT version::bigint, name::text FROM supabase_migrations.schema_migrations ORDER BY version';
  END IF;
END
$$;

SELECT * FROM pg_temp.tmp_list_migrations();

-- 6) TRIGGERS ANTI-ESCALADE SUR PROFILES (présents et actifs ?)
SELECT trigger_name, event_manipulation, action_timing, action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table = 'profiles'
  AND trigger_name ILIKE '%protect%'
ORDER BY trigger_name;