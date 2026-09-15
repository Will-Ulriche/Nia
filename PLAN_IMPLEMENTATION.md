# PLAN D'IMPLEMENTATION --- SCHOOL MANAGEMENT SOFTWARE

## Objectif

Construire progressivement un logiciel commercial de gestion scolaire
pour les établissements du Togo, avec une première version orientée
collège et une architecture capable de gérer simultanément collège et
lycée dans un même établissement.

Le développement doit être réalisé par phases. Chaque phase doit être
terminée, testée et validée avant de passer à la suivante.

------------------------------------------------------------------------

# PHASE 0 --- Initialisation et cadrage

## Objectifs

-   Créer le projet.
-   Initialiser React + TypeScript.
-   Initialiser Tauri.
-   Préparer SQLite.
-   Préparer Supabase.
-   Mettre en place la structure de dossiers.
-   Configurer TypeScript, linting et formatage.
-   Créer README.md et la documentation de base.

## Livrables

-   Projet démarrable.
-   Application Tauri fonctionnelle.
-   Frontend React fonctionnel.
-   Connexion initiale aux environnements local/cloud.
-   Structure de projet propre.

## Validation

-   L'application démarre.
-   Le frontend fonctionne.
-   Tauri fonctionne.
-   SQLite peut être initialisé.
-   Supabase peut être configuré sans exposer de secrets.

------------------------------------------------------------------------

# PHASE 1 --- Architecture de données et migrations

## Objectifs

Créer le socle de données.

Préparer les migrations SQLite et Supabase/PostgreSQL.

## Entités initiales

-   schools
-   school_modules
-   school_settings
-   users/profiles
-   school_devices
-   academic_years
-   sections
-   levels
-   series
-   classes
-   students
-   teachers
-   subjects
-   enrollments
-   teacher_assignments
-   periods
-   assessments
-   grades
-   attendance
-   fee_definitions
-   payments
-   receipts
-   audit_logs

Ajouter les tables techniques nécessaires au système Offline/Online.

## Validation

-   Migrations exécutables.
-   Relations cohérentes.
-   Contraintes principales présentes.
-   Architecture multi-tenant fonctionnelle.

------------------------------------------------------------------------

# PHASE 2 --- Multi-établissements

## Objectifs

Mettre en place l'isolation des établissements.

## Tâches

-   Création d'un établissement.
-   Identifiant unique d'établissement.
-   `school_id` sur les données concernées.
-   Configuration de base.
-   Préparation des politiques RLS.
-   Tests d'isolation.

## Validation

-   Deux établissements peuvent exister.
-   Les données de l'un ne sont jamais visibles par l'autre.
-   Le Super Admin peut administrer les deux.

------------------------------------------------------------------------

# PHASE 3 --- Super Admin

## Objectifs

Créer l'espace d'administration globale.

## Fonctionnalités

-   Dashboard global.
-   Liste des établissements.
-   Création d'établissement.
-   Modification d'établissement.
-   Activation/désactivation des modules.
-   Gestion des appareils.
-   Gestion des utilisateurs selon permissions.
-   État de synchronisation.
-   Journaux système.
-   Paramètres globaux.

## Validation

Le Super Admin peut créer et configurer un établissement sans accéder
par erreur aux permissions d'un utilisateur scolaire.

------------------------------------------------------------------------

# PHASE 4 --- Configuration des modules scolaires

## Objectifs

Permettre à un établissement d'activer plusieurs sections.

## Exemple

Établissement X : - Collège : actif - Lycée : actif - Primaire : inactif

## Tâches

-   Interface de sélection des modules.
-   Enregistrement dans `school_modules`.
-   Chargement dynamique des modules actifs.
-   Masquage des fonctionnalités des modules inactifs.

## Validation

Un établissement peut avoir collège + lycée simultanément.

------------------------------------------------------------------------

# PHASE 5 --- Authentification et utilisateurs

## Objectifs

Mettre en place Supabase Auth et les profils utilisateurs.

## Rôles

-   Super Admin
-   Direction
-   Secrétaire
-   Professeur

## Tâches

-   Connexion.
-   Déconnexion.
-   Réinitialisation de mot de passe.
-   Profil utilisateur.
-   Association utilisateur ↔ établissement.
-   Association professeur ↔ profil.
-   Protection des routes.

## Validation

Chaque utilisateur arrive uniquement dans son espace autorisé.

------------------------------------------------------------------------

# PHASE 6 --- Permissions

## Objectifs

Créer un système de permissions clair.

## Direction

Accès complet aux fonctions de son établissement selon les règles
définies.

## Secrétaire

-   Élèves.
-   Inscriptions.
-   Paiements.
-   Caisse.
-   Reçus.
-   Fonctions administratives autorisées.

## Professeur

-   Mes classes.
-   Mes matières.
-   Élèves de mes classes.
-   Évaluations.
-   Notes.
-   Présences.

## Validation

Tester les permissions dans l'interface ET côté backend/base de données.

------------------------------------------------------------------------

# PHASE 7 --- Années scolaires et périodes

## Objectifs

Créer la gestion académique temporelle.

## Fonctionnalités

-   Création d'année scolaire.
-   Activation d'une année.
-   Fermeture.
-   Archivage.
-   1er trimestre.
-   2ème trimestre.
-   3ème trimestre.
-   Périodes configurables.

## Validation

Les données d'une année précédente restent consultables et ne sont pas
écrasées.

------------------------------------------------------------------------

# PHASE 8 --- Structure Collège

## Objectifs

Implémenter la structure spécifique au collège.

## Fonctionnalités

-   Section Collège.
-   Niveaux :
    -   6ème
    -   5ème
    -   4ème
    -   3ème
-   Création de classes :
    -   6ème A
    -   6ème B
    -   6ème C
    -   etc.

## Important

Les classes ne doivent pas être hardcodées.

## Validation

La Direction peut créer, modifier et désactiver une classe sans modifier
le code.

------------------------------------------------------------------------

# PHASE 9 --- Structure Lycée

## Objectifs

Préparer les établissements qui ont collège + lycée.

## Fonctionnalités

-   Section Lycée.
-   Niveaux.
-   Séries configurables.
-   Classes associées.

L'architecture doit rester suffisamment flexible pour les différents
modèles d'organisation du lycée.

## Validation

Un établissement peut gérer simultanément : - 6ème A - 5ème A - 3ème B -
Seconde... sans mélange entre collège et lycée.

------------------------------------------------------------------------

# PHASE 10 --- Gestion des matières

## Objectifs

Créer le référentiel des matières.

## Fonctionnalités

-   Ajouter matière.
-   Modifier matière.
-   Activer/désactiver.
-   Associer aux niveaux/classes.
-   Préparer les coefficients.

## Validation

La Direction peut configurer les matières sans modifier le code.

------------------------------------------------------------------------

# PHASE 11 --- Gestion des enseignants

## Fonctionnalités

-   Créer professeur.
-   Modifier profil.
-   Affecter matières.
-   Affecter classes.
-   Affecter année scolaire.
-   Consulter emploi du temps ultérieurement.

## Validation

Un professeur ne voit que les classes et matières qui lui sont
affectées.

------------------------------------------------------------------------

# PHASE 12 --- Gestion des élèves

## Données

-   Matricule.
-   Nom.
-   Prénom.
-   Sexe.
-   Date de naissance.
-   Lieu de naissance.
-   Adresse.
-   Contacts.
-   Informations administratives nécessaires.

## Fonctionnalités

-   Inscription.
-   Réinscription.
-   Recherche.
-   Modification.
-   Transfert.
-   Retrait.
-   Historique.

## Validation

Un élève peut avoir plusieurs inscriptions historiques sans perte de
données.

------------------------------------------------------------------------

# PHASE 13 --- Affectations et inscriptions

## Objectifs

Relier les personnes à l'organisation scolaire.

## Tâches

-   Élève ↔ année ↔ classe.
-   Professeur ↔ année ↔ matière ↔ classe.
-   Gestion des changements de classe.

## Validation

Les affectations sont historisées.

------------------------------------------------------------------------

# PHASE 14 --- Évaluations et notes

## Fonctionnalités

-   Créer une évaluation.
-   Définir matière.
-   Définir classe.
-   Définir période.
-   Définir barème.
-   Définir coefficient.
-   Saisir notes.
-   Modifier notes selon permissions.
-   Historiser les modifications importantes.

## Validation

Une note contient tout son contexte académique et ne peut pas être
ambiguë.

------------------------------------------------------------------------

# PHASE 15 --- Calcul des moyennes

## Fonctionnalités

-   Moyenne par évaluation.
-   Moyenne par matière.
-   Moyenne de période.
-   Moyenne générale.
-   Coefficients.
-   Classement optionnel.
-   Règles configurables.

## Validation

Tester les calculs avec plusieurs cas réels et cas limites.

------------------------------------------------------------------------

# PHASE 16 --- Bulletins

## Fonctionnalités

-   Générer bulletin.
-   Aperçu.
-   Impression.
-   Export PDF si prévu.
-   Informations établissement.
-   Élève.
-   Classe.
-   Période.
-   Matières.
-   Notes.
-   Moyennes.
-   Coefficients.
-   Moyenne générale.
-   Appréciations.

## Validation

Le bulletin correspond exactement aux données enregistrées.

------------------------------------------------------------------------

# PHASE 17 --- Présences et absences

## Fonctionnalités

-   Prise de présence par professeur.
-   Absence.
-   Retard si retenu dans le modèle.
-   Historique.
-   Statistiques.
-   Consultation Direction.

## Validation

Un professeur ne peut enregistrer les présences que pour ses classes
autorisées.

------------------------------------------------------------------------

# PHASE 18 --- Frais scolaires et paiements

## Fonctionnalités

-   Définition des frais.
-   Élève concerné.
-   Montant.
-   Paiement total.
-   Paiement partiel.
-   Solde.
-   Historique.

## Validation

Les soldes sont calculés correctement et les historiques ne sont pas
écrasés.

------------------------------------------------------------------------

# PHASE 19 --- Caisse et reçus

## Fonctionnalités

-   Enregistrement transaction.
-   Entrées.
-   Sorties si prévues.
-   Caisse.
-   Reçu.
-   Numérotation des reçus.
-   Historique.
-   Recherche.
-   Rapports.

## Validation

Chaque paiement possède une trace et un reçu cohérent.

------------------------------------------------------------------------

# PHASE 20 --- Rapports

## Rapports prioritaires

-   Élèves par classe.
-   Élèves par niveau.
-   Enseignants.
-   Classes.
-   Notes.
-   Moyennes.
-   Absences.
-   Paiements.
-   Impayés.
-   Caisse.
-   Statistiques générales.

## Validation

Les rapports respectent les permissions et l'année scolaire
sélectionnée.

------------------------------------------------------------------------

# PHASE 21 --- Offline local

## Objectifs

Faire fonctionner les fonctions principales sans Internet.

## Tâches

-   Initialisation SQLite.
-   Repositories/services locaux.
-   Lecture locale.
-   Écriture locale.
-   Détection de connexion.
-   File d'attente des mutations.
-   Statut Offline/Online.

## Validation

Couper Internet et vérifier que les opérations principales continuent à
fonctionner.

------------------------------------------------------------------------

# PHASE 22 --- Synchronisation Supabase

## Tâches

-   Push des modifications locales.
-   Pull des modifications distantes.
-   Sync initiale.
-   Sync incrémentale.
-   Retry.
-   Idempotence.
-   Gestion des erreurs.
-   Horodatage.
-   Versionnement.

## Validation

Une modification faite sur PC A peut être récupérée par PC B après
synchronisation.

------------------------------------------------------------------------

# PHASE 23 --- Gestion des conflits

## Objectifs

Gérer les modifications simultanées provenant de plusieurs appareils.

## Tâches

-   Détection de conflit.
-   Stratégie de résolution.
-   Conservation des informations nécessaires.
-   Journalisation.
-   Gestion des cas critiques.

## Validation

Créer volontairement un conflit hors ligne sur deux appareils et
vérifier le comportement.

------------------------------------------------------------------------

# PHASE 24 --- Interface de synchronisation

## Affichage

-   Synchronisé.
-   Synchronisation...
-   Hors ligne.
-   X modifications en attente.
-   Dernière synchronisation.
-   Erreur de synchronisation.

## Validation

L'utilisateur comprend immédiatement l'état de ses données.

------------------------------------------------------------------------

# PHASE 25 --- Gestion des appareils

## Fonctionnalités

-   Enregistrement appareil.
-   Nom appareil.
-   Établissement.
-   Dernière activité.
-   Dernière synchronisation.
-   Version application.
-   Révocation.

## Validation

Le Super Admin peut identifier les appareils d'un établissement.

------------------------------------------------------------------------

# PHASE 26 --- Journal d'audit

## Fonctionnalités

Tracer les actions sensibles : - connexion ; -
ajout/modification/suppression ; - note ; - paiement ; - changement de
classe ; - configuration ; - activation module ; - synchronisation.

## Validation

Chaque action critique possède une trace exploitable.

------------------------------------------------------------------------

# PHASE 27 --- Sauvegarde et restauration

## Objectifs

Prévoir les mécanismes de sauvegarde.

## Tâches

-   Sauvegarde locale.
-   Sauvegarde cloud selon architecture.
-   Restauration.
-   Vérification de l'intégrité.

## Validation

Créer une sauvegarde et restaurer les données sur un environnement de
test.

------------------------------------------------------------------------

# PHASE 28 --- Activation et licence

## Objectifs

Préparer la commercialisation.

## Fonctionnalités

-   Activation établissement.
-   Validation serveur.
-   Configuration locale.
-   Cache de licence.
-   État de licence.
-   Préparation abonnement.

## Validation

Une installation ne peut être associée à un établissement sans
validation prévue par le système.

------------------------------------------------------------------------

# PHASE 29 --- UX/UI finale

## Objectifs

Améliorer l'utilisation quotidienne.

## Tâches

-   Dashboard Direction.
-   Dashboard Secrétaire.
-   Dashboard Professeur.
-   Dashboard Super Admin.
-   Navigation.
-   Recherche.
-   Filtres.
-   Notifications.
-   États vides.
-   Messages d'erreur.
-   Confirmation des actions sensibles.

## Validation

Chaque rôle peut effectuer ses tâches principales rapidement et sans
confusion.

------------------------------------------------------------------------

# PHASE 30 --- Tests

## Tests à prévoir

-   Unitaires.
-   Intégration.
-   Permissions.
-   Multi-tenant.
-   Base de données.
-   Offline.
-   Synchronisation.
-   Conflits.
-   Paiements.
-   Notes.
-   Bulletins.
-   Sécurité.

## Validation

Les fonctionnalités critiques disposent de tests reproductibles.

------------------------------------------------------------------------

# PHASE 31 --- Packaging Windows

## Objectifs

Créer la version distribuable.

## Tâches

-   Build Tauri.
-   Génération `.exe`.
-   Installation.
-   Mise à jour.
-   Gestion de version.
-   Configuration environnement.
-   Vérification post-installation.

## Validation

Installer le logiciel sur un PC Windows propre et effectuer le parcours
complet.

------------------------------------------------------------------------

# PHASE 32 --- Préparation commerciale

## Tâches

-   Création établissement.
-   Activation.
-   Gestion des appareils.
-   Documentation utilisateur.
-   Support.
-   Sauvegarde.
-   Licences.
-   Abonnements futurs.
-   Procédure d'installation.

## Validation

Une nouvelle école peut être configurée et utiliser le logiciel sans
intervention directe dans le code.

------------------------------------------------------------------------

# RÈGLE D'EXÉCUTION DU PLAN

Antigravity doit travailler phase par phase.

Pour chaque phase :

1.  Lire `RULES.md`.
2.  Lire la phase concernée dans `PLAN_IMPLEMENTATION.md`.
3.  Analyser l'existant avant de modifier.
4.  Implémenter les fonctionnalités de la phase.
5.  Ne pas anticiper inutilement les phases futures.
6.  Tester.
7.  Corriger les erreurs.
8.  Vérifier que les règles du projet sont respectées.
9.  Documenter les changements importants.
10. Signaler clairement la phase terminée et les éventuels blocages.

Ne pas passer automatiquement à la phase suivante sans validation.

------------------------------------------------------------------------

# ORDRE PRIORITAIRE

L'ordre recommandé est :

0.  Initialisation
1.  Architecture de données
2.  Multi-établissements
3.  Super Admin
4.  Modules
5.  Authentification
6.  Permissions
7.  Années scolaires
8.  Collège
9.  Lycée
10. Matières
11. Enseignants
12. Élèves
13. Affectations
14. Notes
15. Moyennes
16. Bulletins
17. Présences
18. Paiements
19. Caisse
20. Rapports
21. Offline
22. Synchronisation
23. Conflits
24. Statut synchronisation
25. Appareils
26. Audit
27. Sauvegardes
28. Activation/licence
29. UX/UI
30. Tests
31. Packaging
32. Commercialisation
