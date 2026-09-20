-- Migration: 008_rls_policies
-- Description: Multi-tenant isolation + role-based row-level security policies
--
-- Modèle d'accès imposé côté serveur (RLS) :
--   SUPER_ADMIN  -> toute la plateforme (public.is_super_admin())
--   DIRECTION    -> gestion complète de son établissement (structure, profils,
--                   élèves, professeurs, notes, finance, paramètres)
--   SECRÉTAIRE   -> élèves, inscriptions, paiements, caisse/comptabilité,
--                   présences ; lecture seule sur le reste de l'établissement
--   PROFESSEUR   -> uniquement SES classes, SES matières, SES notes,
--                   SES présences, SES moyennes
--
-- RÈGLE D'OR : en PostgreSQL, les politiques RLS permissives s'ADDITIONNENT
-- (OR implicite). Une politique « tout membre de l'école peut écrire » annule
-- donc toute politique de rôle plus restrictive. C'est pourquoi aucune
-- politique générique d'écriture n'est définie ici : chaque table possède ses
-- politiques de rôle. Le pare-feu applicatif (usePermission) n'est qu'un
-- habillage UI et n'est JAMAIS la garantie de sécurité.

-- ============================================================================
-- HELPERS
-- Toutes les fonctions sont SECURITY DEFINER pour :
--   1) éviter la récursion RLS (les politiques lisent public.profiles) ;
--   2) garantir une évaluation sûre des vérifications de propriété.
-- ============================================================================

-- École de l'utilisateur courant
CREATE OR REPLACE FUNCTION public.get_current_user_school_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT school_id FROM public.profiles WHERE id = auth.uid() AND deleted_at IS NULL;
$$;

-- L'utilisateur courant est-il super admin ?
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_admin' AND deleted_at IS NULL
  );
$$;

-- Rôle du profil courant au sein d'un établissement (NULL si absent de cette école)
CREATE OR REPLACE FUNCTION public.profile_role(_school_id UUID)
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM public.profiles
  WHERE id = auth.uid() AND school_id = _school_id AND deleted_at IS NULL
  LIMIT 1;
$$;

-- Membre de l'établissement ?
CREATE OR REPLACE FUNCTION public.is_school_member(_school_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT (public.profile_role(_school_id) IS NOT NULL);
$$;

-- Direction de l'établissement ?
CREATE OR REPLACE FUNCTION public.is_direction(_school_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT (public.profile_role(_school_id) = 'direction');
$$;

-- Secrétaire de l'établissement ?
CREATE OR REPLACE FUNCTION public.is_secretaire(_school_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT (public.profile_role(_school_id) = 'secretaire');
$$;

-- Professeur de l'établissement ?
CREATE OR REPLACE FUNCTION public.is_professeur(_school_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT (public.profile_role(_school_id) = 'professeur');
$$;

-- Ligne teachers() liée au profil courant, au sein de l'école
CREATE OR REPLACE FUNCTION public.current_teacher_id(_school_id UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT t.id FROM public.teachers t
  WHERE t.school_id = _school_id AND t.profile_id = auth.uid() AND t.deleted_at IS NULL
  LIMIT 1;
$$;

-- Le professeur courant enseigne-t-il dans cette classe ?
CREATE OR REPLACE FUNCTION public.professor_teaches_class(_school_id UUID, _class_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT (
    public.current_teacher_id(_school_id) IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.teacher_assignments ta
      WHERE ta.school_id = _school_id AND ta.class_id = _class_id
        AND ta.teacher_id = public.current_teacher_id(_school_id)
        AND ta.deleted_at IS NULL
    )
  );
$$;

-- Le professeur courant enseigne-t-il cette matière ?
CREATE OR REPLACE FUNCTION public.professor_teaches_subject(_school_id UUID, _subject_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.teacher_assignments ta
    WHERE ta.school_id = _school_id AND ta.subject_id = _subject_id
      AND ta.teacher_id = public.current_teacher_id(_school_id)
      AND ta.deleted_at IS NULL
  );
$$;

-- Le professeur courant est-il titulaire de cette évaluation ? (via la classe)
CREATE OR REPLACE FUNCTION public.professor_owns_assessment(_school_id UUID, _assessment_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.assessments a
    WHERE a.id = _assessment_id AND a.school_id = _school_id
      AND public.professor_teaches_class(_school_id, a.class_id)
  );
$$;

-- L'élève appartient-il à une classe du professeur courant ?
CREATE OR REPLACE FUNCTION public.professor_has_student(_school_id UUID, _student_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.student_id = _student_id AND e.school_id = _school_id AND e.deleted_at IS NULL
      AND public.professor_teaches_class(_school_id, e.class_id)
  );
$$;

-- ============================================================================
-- SECURITE PROFILES : anti-escalade de privilèges
-- Un utilisateur ne peut PAS changer son propre rôle ni son école,
-- quels que soient son rôle (y compris une direction) et sa nouvelle école.
-- Seuls le super_admin peuvent le faire (sur eux-mêmes comme sur les autres) ;
-- la direction gère les rôles/écoles des AUTRES membres via la politique
-- rls_profiles_direction_update.
-- (Sans ce garde-fou, « Users can update own profile » permettrait à un
--  professeur de se passer le rôle 'direction'.)
-- En outre, AUCUN utilisateur non super_admin ne peut créer ou promouvoir un
-- profil super_admin (le rôle super_admin est cross-tenant : il reste
-- réservé au super_admin lui-même, contrôlé ici en PostgreSQL, pas en React).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.protect_profile_privileges()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  -- Le rôle super_admin est réservé : seule la personne réellement super_admin
  -- peut promouvoir un autre profil (défense en profondeur + RLS ci-dessous).
  IF NEW.role = 'super_admin' AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Seul un super admin peut promouvoir un super admin.';
  END IF;

  -- Unicité du cas « l'utilisateur se modifie lui-même » : aucun changement de
  -- rôle ou d'école sur son propre profil, même pour une direction.
  IF NEW.id = auth.uid() AND NOT public.is_super_admin() THEN
    IF NEW.role IS DISTINCT FROM OLD.role
       OR NEW.school_id IS DISTINCT FROM OLD.school_id THEN
      RAISE EXCEPTION 'Un utilisateur ne peut pas modifier son propre rôle ni son établissement.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profiles_privileges ON public.profiles;
CREATE TRIGGER trg_protect_profiles_privileges
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_privileges();

-- Même garde-fou à la CRÉATION d'un profil : empêche une direction (ou une
-- secrétaire compromisée passant par une autre voie) d'insérer un super_admin.
CREATE OR REPLACE FUNCTION public.protect_profile_role_insert()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'super_admin' AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Seul un super admin peut créer un profil super admin.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profiles_role_insert ON public.profiles;
CREATE TRIGGER trg_protect_profiles_role_insert
BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role_insert();

-- ============================================================================
-- 1. SCHOOLS
-- ============================================================================
CREATE POLICY "rls_schools_admin_all" ON public.schools
  FOR ALL USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "rls_schools_read_own" ON public.schools
  FOR SELECT USING (id = public.get_current_user_school_id());

-- ============================================================================
-- 2. PROFILES
-- ============================================================================
-- Super admin : tout
CREATE POLICY "rls_profiles_admin_all" ON public.profiles
  FOR ALL USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Lecture : profils de la même école
CREATE POLICY "rls_profiles_read_school" ON public.profiles
  FOR SELECT USING (school_id = public.get_current_user_school_id());

-- Création d'utilisateurs : la direction de l'école (ou super admin).
-- Le rôle 'super_admin' est exclu : il ne peut être créé que par le
-- super_admin lui-même (politique rls_profiles_admin_all).
CREATE POLICY "rls_profiles_direction_insert" ON public.profiles
  FOR INSERT WITH CHECK (public.is_direction(school_id) AND role <> 'super_admin');

-- Mise à jour d'utilisateurs : la direction de l'école (ou super admin),
-- restreinte à son établissement (le WITH CHECK évalue le NOUVEAU champ
-- school_id) et sans possibilité de promouvoir un super_admin.
CREATE POLICY "rls_profiles_direction_update" ON public.profiles
  FOR UPDATE USING (public.is_direction(school_id))
  WITH CHECK (public.is_direction(school_id) AND role <> 'super_admin');

-- Profil personnel : on peut mettre à jour ses informations factuelles
-- (le rôle et l'école restent protégés par le trigger anti-escalade)
CREATE POLICY "rls_profiles_self_update" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

-- Suppression de profils : réservé au super admin
CREATE POLICY "rls_profiles_delete_admin" ON public.profiles
  FOR DELETE USING (public.is_super_admin());

-- ============================================================================
-- 3. PARAMETRES / MODULES / APPAREILS DE L'ÉCOLE
-- ============================================================================

-- school_modules : lus par tous les membres, modifiés par la direction
CREATE POLICY "rls_school_modules_read_member" ON public.school_modules
  FOR SELECT USING (public.is_school_member(school_id) OR public.is_super_admin());
CREATE POLICY "rls_school_modules_write_direction" ON public.school_modules
  FOR ALL USING (public.is_direction(school_id))
  WITH CHECK (public.is_direction(school_id));

-- school_settings : lus par tous les membres, modifiés par la direction
CREATE POLICY "rls_school_settings_read_member" ON public.school_settings
  FOR SELECT USING (public.is_school_member(school_id) OR public.is_super_admin());
CREATE POLICY "rls_school_settings_write_direction" ON public.school_settings
  FOR ALL USING (public.is_direction(school_id))
  WITH CHECK (public.is_direction(school_id));

-- school_devices :
--   lecture : tous les membres (echo device + contrôle de révocation)
--   INSERT  : tous les membres (auto-enregistrement de l'appareil)
--   UPDATE  : direction/uniquement (empêche un membre de lever sa révocation)
--   DELETE  : direction uniquement
CREATE POLICY "rls_school_devices_read_member" ON public.school_devices
  FOR SELECT USING (public.is_school_member(school_id) OR public.is_super_admin());
CREATE POLICY "rls_school_devices_insert_member" ON public.school_devices
  FOR INSERT WITH CHECK (public.is_school_member(school_id) OR public.is_super_admin());
CREATE POLICY "rls_school_devices_update_direction" ON public.school_devices
  FOR UPDATE USING (public.is_direction(school_id) OR public.is_super_admin());
CREATE POLICY "rls_school_devices_delete_direction" ON public.school_devices
  FOR DELETE USING (public.is_direction(school_id) OR public.is_super_admin());

-- ============================================================================
-- 4. STRUCTURE ACADEMIQUE (année, sections, niveaux, séries, classes)
-- ============================================================================

-- academic_years
CREATE POLICY "rls_academic_years_read_member" ON public.academic_years
  FOR SELECT USING (public.is_school_member(school_id) OR public.is_super_admin());
CREATE POLICY "rls_academic_years_write_direction" ON public.academic_years
  FOR ALL USING (public.is_direction(school_id))
  WITH CHECK (public.is_direction(school_id));

-- sections / levels / series (données de référence)
CREATE POLICY "rls_sections_read_member" ON public.sections
  FOR SELECT USING (public.is_school_member(school_id) OR public.is_super_admin());
CREATE POLICY "rls_sections_write_direction" ON public.sections
  FOR ALL USING (public.is_direction(school_id))
  WITH CHECK (public.is_direction(school_id));

CREATE POLICY "rls_levels_read_member" ON public.levels
  FOR SELECT USING (public.is_school_member(school_id) OR public.is_super_admin());
CREATE POLICY "rls_levels_write_direction" ON public.levels
  FOR ALL USING (public.is_direction(school_id))
  WITH CHECK (public.is_direction(school_id));

CREATE POLICY "rls_series_read_member" ON public.series
  FOR SELECT USING (public.is_school_member(school_id) OR public.is_super_admin());
CREATE POLICY "rls_series_write_direction" ON public.series
  FOR ALL USING (public.is_direction(school_id))
  WITH CHECK (public.is_direction(school_id));

-- classes : un professeur ne voit QUE ses classes
CREATE POLICY "rls_classes_read_staff_teacher" ON public.classes
  FOR SELECT USING (
    public.is_super_admin()
    OR public.is_direction(school_id)
    OR public.is_secretaire(school_id)
    OR (public.is_professeur(school_id) AND public.professor_teaches_class(school_id, id))
  );
CREATE POLICY "rls_classes_write_direction" ON public.classes
  FOR ALL USING (public.is_direction(school_id))
  WITH CHECK (public.is_direction(school_id));

-- ============================================================================
-- 5. PERSONNES (élèves, professeurs)
-- ============================================================================

-- students : secrétaire/direction gèrent ; un professeur ne voit QUE les
-- élèves inscrits dans ses classes
CREATE POLICY "rls_students_read" ON public.students
  FOR SELECT USING (
    public.is_super_admin()
    OR public.is_direction(school_id)
    OR public.is_secretaire(school_id)
    OR (public.is_professeur(school_id) AND public.professor_has_student(school_id, id))
  );
CREATE POLICY "rls_students_write_staff" ON public.students
  FOR ALL USING (
    public.is_super_admin()
    OR public.is_direction(school_id)
    OR public.is_secretaire(school_id)
  )
  WITH CHECK (
    public.is_super_admin()
    OR public.is_direction(school_id)
    OR public.is_secretaire(school_id)
  );

-- teachers
CREATE POLICY "rls_teachers_read_member" ON public.teachers
  FOR SELECT USING (public.is_school_member(school_id) OR public.is_super_admin());
CREATE POLICY "rls_teachers_write_direction" ON public.teachers
  FOR ALL USING (public.is_direction(school_id))
  WITH CHECK (public.is_direction(school_id));

-- ============================================================================
-- 6. MATIERES, INSCRIPTIONS, AFFECTATIONS
-- ============================================================================

-- subjects : un professeur ne voit QUE ses matières
CREATE POLICY "rls_subjects_read" ON public.subjects
  FOR SELECT USING (
    public.is_super_admin()
    OR public.is_direction(school_id)
    OR public.is_secretaire(school_id)
    OR (public.is_professeur(school_id) AND public.professor_teaches_subject(school_id, id))
  );
CREATE POLICY "rls_subjects_write_direction" ON public.subjects
  FOR ALL USING (public.is_direction(school_id))
  WITH CHECK (public.is_direction(school_id));

-- enrollments (inscriptions) : secrétaire/direction gèrent
CREATE POLICY "rls_enrollments_read" ON public.enrollments
  FOR SELECT USING (
    public.is_super_admin()
    OR public.is_direction(school_id)
    OR public.is_secretaire(school_id)
    OR (public.is_professeur(school_id) AND public.professor_teaches_class(school_id, class_id))
  );
CREATE POLICY "rls_enrollments_write_staff" ON public.enrollments
  FOR ALL USING (
    public.is_super_admin()
    OR public.is_direction(school_id)
    OR public.is_secretaire(school_id)
  )
  WITH CHECK (
    public.is_super_admin()
    OR public.is_direction(school_id)
    OR public.is_secretaire(school_id)
  );

-- teacher_assignments : un professeur ne voit QUE ses affectations
CREATE POLICY "rls_teacher_assignments_read" ON public.teacher_assignments
  FOR SELECT USING (
    public.is_super_admin()
    OR public.is_direction(school_id)
    OR public.is_secretaire(school_id)
    OR (public.is_professeur(school_id) AND teacher_id = public.current_teacher_id(school_id))
  );
CREATE POLICY "rls_teacher_assignments_write_direction" ON public.teacher_assignments
  FOR ALL USING (public.is_direction(school_id))
  WITH CHECK (public.is_direction(school_id));

-- ============================================================================
-- 7. PERIODES
-- ============================================================================
-- Donnée de référence : lisible par tous, modifiable par la direction
CREATE POLICY "rls_periods_read_member" ON public.periods
  FOR SELECT USING (public.is_school_member(school_id) OR public.is_super_admin());
CREATE POLICY "rls_periods_write_direction" ON public.periods
  FOR ALL USING (public.is_direction(school_id))
  WITH CHECK (public.is_direction(school_id));

-- ============================================================================
-- 8. EVALUATIONS, NOTES, ASSIDUITE, MOYENNES
-- ============================================================================

-- assessments : le professeur crée/modifie uniquement pour SES classes
CREATE POLICY "rls_assessments_read" ON public.assessments
  FOR SELECT USING (
    public.is_super_admin()
    OR public.is_direction(school_id)
    OR public.is_secretaire(school_id)
    OR (public.is_professeur(school_id) AND public.professor_teaches_class(school_id, class_id))
  );
CREATE POLICY "rls_assessments_write_direction" ON public.assessments
  FOR ALL USING (public.is_direction(school_id))
  WITH CHECK (public.is_direction(school_id));
CREATE POLICY "rls_assessments_write_professeur" ON public.assessments
  FOR ALL USING (
    public.is_professeur(school_id) AND public.professor_teaches_class(school_id, class_id)
  )
  WITH CHECK (
    public.is_professeur(school_id) AND public.professor_teaches_class(school_id, class_id)
  );

-- grades (notes) : lecture limitée à la scope du rôle ; le professeur ne
-- saisit des notes que sur SES évaluations
CREATE POLICY "rls_grades_read" ON public.grades
  FOR SELECT USING (
    public.is_super_admin()
    OR public.is_direction(school_id)
    OR public.is_secretaire(school_id)
    OR (public.is_professeur(school_id) AND public.professor_owns_assessment(school_id, assessment_id))
  );
CREATE POLICY "rls_grades_write_direction" ON public.grades
  FOR ALL USING (public.is_direction(school_id))
  WITH CHECK (public.is_direction(school_id));
CREATE POLICY "rls_grades_write_professeur" ON public.grades
  FOR ALL USING (
    public.is_professeur(school_id)
    AND public.professor_owns_assessment(school_id, assessment_id)
    AND public.professor_has_student(school_id, student_id)
  )
  WITH CHECK (
    public.is_professeur(school_id)
    AND public.professor_owns_assessment(school_id, assessment_id)
    AND public.professor_has_student(school_id, student_id)
  );

-- attendance (présences) : le professeur gère SES classes uniquement
CREATE POLICY "rls_attendance_read" ON public.attendance
  FOR SELECT USING (
    public.is_super_admin()
    OR public.is_direction(school_id)
    OR public.is_secretaire(school_id)
    OR (public.is_professeur(school_id) AND public.professor_teaches_class(school_id, class_id))
  );
CREATE POLICY "rls_attendance_write" ON public.attendance
  FOR ALL USING (
    public.is_super_admin()
    OR public.is_direction(school_id)
    OR public.is_secretaire(school_id)
    OR (public.is_professeur(school_id) AND public.professor_teaches_class(school_id, class_id)
        AND public.professor_has_student(school_id, student_id))
  )
  WITH CHECK (
    public.is_super_admin()
    OR public.is_direction(school_id)
    OR public.is_secretaire(school_id)
    OR (public.is_professeur(school_id) AND public.professor_teaches_class(school_id, class_id)
        AND public.professor_has_student(school_id, student_id))
  );

-- ============================================================================
-- 9. FINANCE (frais, paiements, reçus)
-- ============================================================================

-- fee_definitions : la secrétaire lit (pour les paiements), la direction écrit
CREATE POLICY "rls_fee_definitions_read_staff" ON public.fee_definitions
  FOR SELECT USING (
    public.is_super_admin()
    OR public.is_direction(school_id)
    OR public.is_secretaire(school_id)
  );
CREATE POLICY "rls_fee_definitions_write_direction" ON public.fee_definitions
  FOR ALL USING (public.is_direction(school_id))
  WITH CHECK (public.is_direction(school_id));

-- payments & receipts : direction + secrétaire (caisse/comptabilité)
CREATE POLICY "rls_payments_read_staff" ON public.payments
  FOR SELECT USING (
    public.is_super_admin()
    OR public.is_direction(school_id)
    OR public.is_secretaire(school_id)
  );
CREATE POLICY "rls_payments_write_staff" ON public.payments
  FOR ALL USING (
    public.is_super_admin()
    OR public.is_direction(school_id)
    OR public.is_secretaire(school_id)
  )
  WITH CHECK (
    public.is_super_admin()
    OR public.is_direction(school_id)
    OR public.is_secretaire(school_id)
  );

CREATE POLICY "rls_receipts_read_staff" ON public.receipts
  FOR SELECT USING (
    public.is_super_admin()
    OR public.is_direction(school_id)
    OR public.is_secretaire(school_id)
  );
CREATE POLICY "rls_receipts_write_staff" ON public.receipts
  FOR ALL USING (
    public.is_super_admin()
    OR public.is_direction(school_id)
    OR public.is_secretaire(school_id)
  )
  WITH CHECK (
    public.is_super_admin()
    OR public.is_direction(school_id)
    OR public.is_secretaire(school_id)
  );

-- ============================================================================
-- 10. JOURNAL D'AUDIT
-- ============================================================================
-- Lecture : direction uniquement (contenant sensible).
-- INSERT  : tous les membres (chaque action utilisateur est journalisée).
-- Aucune politique UPDATE/DELETE => les logs sont immuables.
CREATE POLICY "rls_audit_logs_read_direction" ON public.audit_logs
  FOR SELECT USING (
    public.is_super_admin() OR public.is_direction(school_id)
  );
CREATE POLICY "rls_audit_logs_insert_member" ON public.audit_logs
  FOR INSERT WITH CHECK (
    public.is_super_admin() OR public.is_school_member(school_id)
  );

-- ============================================================================
-- RAPPEL : les tables créées plus tard (schedules, averages, expenses,
-- backups, licenses, devices) possèdent leurs propres politiques de rôle
-- dans leur migration respective, sur le même modèle.
-- ============================================================================