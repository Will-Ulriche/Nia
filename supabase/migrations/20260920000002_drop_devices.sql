-- ============================================================
-- Suppression de la table obsolète `devices` (P1-01 / P0-03)
-- Le code utilise `school_devices` ; la table `devices` n'est plus
-- référencée par l'application. RLS déjà actif et grants `anon`
-- réduits à SELECT avant suppression (20260920000001).
--
-- audit_logs.device_id garde une FK (ON DELETE SET NULL) vers
-- devices(id) : on retire d'abord cette contrainte, puis on
-- supprime la table.
--
-- À exécuter avec le rôle postgres dans le SQL Editor Supabase.
-- ============================================================

ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_device_id_fkey;

-- Supprime la table et ses objets dépendants (politiques RLS, index).
DROP TABLE IF EXISTS public.devices;