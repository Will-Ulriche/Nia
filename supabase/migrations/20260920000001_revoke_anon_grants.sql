-- ============================================================
-- Durcissement des grants (P0-03)
-- Le rôle `anon` (clé publishable, utilisateurs NON connectés)
-- possédait SELECT/INSERT/UPDATE/DELETE sur toutes les tables
-- (comportement par défaut Supabase). RLS reste le filtre réel,
-- mais une défense en profondeur interdit toute écriture
-- anonyme au niveau des privilèges.
--
-- À exécuter avec le rôle postgres dans le SQL Editor Supabase.
-- ============================================================

-- Révocation totale pour anon sur toutes les tables du schéma public.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;

-- Select conservé : il est de toute façon filtré par RLS (0 ligne si
-- aucune politique ne permet la lecture pour anon).
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- Futures tables créées : elles repartent du même principe
-- (révocations par défaut pour anon, SELECT conservé).
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon;

-- ============================================================
-- Vérification (section 4 du diagnostic)
--   SELECT table_name, grantee, privilege_type
--   FROM information_schema.role_table_grants
--   WHERE table_schema = 'public'
--     AND grantee = 'anon'
--   ORDER BY table_name, privilege_type;
-- Attendu : uniquement SELECT pour l'ensemble des tables.
-- ============================================================