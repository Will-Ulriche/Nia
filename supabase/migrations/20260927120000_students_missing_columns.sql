-- La table locale SQLite (et le formulaire d'inscription) envoient bien plus
-- de champs que ce que la table Supabase `students` acceptait jusqu'ici.
-- Résultat : chaque tentative de synchronisation d'un élève échouait avec
-- une erreur "column ... does not exist" côté PostgREST, épuisait ses
-- MAX_RETRIES, et l'élève restait bloqué en local sans jamais atteindre
-- Supabase. On aligne le schéma distant sur le schéma local.

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS city VARCHAR(255),
  ADD COLUMN IF NOT EXISTS neighborhood VARCHAR(255),
  ADD COLUMN IF NOT EXISTS nationality VARCHAR(100),
  ADD COLUMN IF NOT EXISTS parent_city VARCHAR(255),
  ADD COLUMN IF NOT EXISTS parent_neighborhood VARCHAR(255),
  ADD COLUMN IF NOT EXISTS parent_whatsapp VARCHAR(100),
  ADD COLUMN IF NOT EXISTS parent_profession VARCHAR(255),
  ADD COLUMN IF NOT EXISTS parent_relation VARCHAR(100),
  ADD COLUMN IF NOT EXISTS financial_sponsor INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS schooling_regime VARCHAR(100),
  ADD COLUMN IF NOT EXISTS previous_school VARCHAR(255),
  ADD COLUMN IF NOT EXISTS previous_class VARCHAR(100),
  ADD COLUMN IF NOT EXISTS previous_year VARCHAR(20);-- La table locale SQLite (et le formulaire d'inscription) envoient bien plus
-- de champs que ce que la table Supabase `students` acceptait jusqu'ici.
-- Résultat : chaque tentative de synchronisation d'un élève échouait avec
-- une erreur "column ... does not exist" côté PostgREST, épuisait ses
-- MAX_RETRIES, et l'élève restait bloqué en local sans jamais atteindre
-- Supabase. On aligne le schéma distant sur le schéma local.

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS city VARCHAR(255),
  ADD COLUMN IF NOT EXISTS neighborhood VARCHAR(255),
  ADD COLUMN IF NOT EXISTS nationality VARCHAR(100),
  ADD COLUMN IF NOT EXISTS parent_city VARCHAR(255),
  ADD COLUMN IF NOT EXISTS parent_neighborhood VARCHAR(255),
  ADD COLUMN IF NOT EXISTS parent_whatsapp VARCHAR(100),
  ADD COLUMN IF NOT EXISTS parent_profession VARCHAR(255),
  ADD COLUMN IF NOT EXISTS parent_relation VARCHAR(100),
  ADD COLUMN IF NOT EXISTS financial_sponsor INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS schooling_regime VARCHAR(100),
  ADD COLUMN IF NOT EXISTS previous_school VARCHAR(255),
  ADD COLUMN IF NOT EXISTS previous_class VARCHAR(100),
  ADD COLUMN IF NOT EXISTS previous_year VARCHAR(20);