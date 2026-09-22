-- Migration: 02_student_columns
-- Description: Complète la table students avec les colonnes absentes de la
-- migration initiale (01_init.sql) mais présentes dans schema.sql et utilisées
-- par StudentService.createStudent / l'inscription. Sans ces colonnes, tout
-- INSERT d'élève échoue sur la base SQLite locale.
ALTER TABLE students ADD COLUMN city TEXT;
ALTER TABLE students ADD COLUMN neighborhood TEXT;
ALTER TABLE students ADD COLUMN nationality TEXT;
ALTER TABLE students ADD COLUMN parent_city TEXT;
ALTER TABLE students ADD COLUMN parent_neighborhood TEXT;
ALTER TABLE students ADD COLUMN parent_whatsapp TEXT;
ALTER TABLE students ADD COLUMN parent_profession TEXT;
ALTER TABLE students ADD COLUMN parent_relation TEXT;
ALTER TABLE students ADD COLUMN financial_sponsor INTEGER DEFAULT 1;
ALTER TABLE students ADD COLUMN schooling_regime TEXT;
ALTER TABLE students ADD COLUMN previous_school TEXT;
ALTER TABLE students ADD COLUMN previous_class TEXT;
ALTER TABLE students ADD COLUMN previous_year TEXT;