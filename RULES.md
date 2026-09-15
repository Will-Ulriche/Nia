# RULES --- SCHOOL MANAGEMENT SOFTWARE

## 1. Vision du projet

Le projet est un logiciel commercial de gestion scolaire destiné en
priorité aux établissements scolaires du Togo.

La première version cible principalement les collèges, tout en prévoyant
une architecture extensible vers : - Lycée - Primaire - Université -
Centre de formation

Le logiciel doit être conçu comme un produit professionnel, sécurisé,
maintenable, évolutif et adapté aux réalités des établissements
togolais.

## 2. Architecture générale obligatoire

Stack principale : - React - TypeScript - Tauri - SQLite local -
Supabase / PostgreSQL cloud - Supabase Auth - Moteur de synchronisation
Offline/Online

Architecture cible :

React + TypeScript ↓ Tauri ↓ Application Windows .exe ↓ SQLite local ↕
Moteur de synchronisation ↕ Supabase / PostgreSQL

SQLite est la base locale utilisée par l'application. Supabase est la
base centrale/cloud et ne doit pas être considérée comme la seule base
de fonctionnement de l'application.

## 3. Fonctionnement Offline/Online

Le logiciel doit continuer à fonctionner sans Internet pour les
opérations normales.

Les modifications effectuées hors ligne doivent : 1. être enregistrées
dans SQLite ; 2. être placées dans une file de synchronisation ; 3. être
synchronisées automatiquement lorsque la connexion revient.

Le système doit gérer : - synchronisation automatique ; - reprise après
erreur ; - nouvelles tentatives ; - opérations idempotentes ; -
téléchargement des modifications distantes ; - conflits entre appareils
; - première synchronisation ; - migrations de base locale.

L'interface doit indiquer clairement l'état : - Synchronisé -
Synchronisation... - Hors ligne - Modifications en attente - Dernière
synchronisation

## 4. Multi-établissements / Multi-tenant

Le logiciel doit être multi-établissements.

Chaque établissement doit être isolé des autres.

Toutes les données appartenant à un établissement doivent être liées à
un `school_id` ou mécanisme équivalent.

L'établissement A ne doit jamais pouvoir consulter ou modifier les
données de l'établissement B.

Ne jamais concevoir l'application comme si elle ne pouvait gérer qu'une
seule école.

## 5. Modules d'établissement

Ne jamais utiliser uniquement un champ du type `school.type = college`.

Utiliser une architecture permettant plusieurs modules simultanément.

Exemple : - Collège - Lycée - Primaire - Université - Centre de
formation

Un même établissement peut avoir plusieurs modules actifs en même temps,
par exemple : - Collège actif - Lycée actif

L'interface et les fonctionnalités doivent s'adapter aux modules
activés.

## 6. Utilisateurs et rôles

Les rôles scolaires sont : - Direction - Secrétaire - Professeur

Le rôle Secrétaire prend également en charge les fonctions de caisse et
de comptabilité prévues par le logiciel.

Un rôle distinct existe au niveau de la plateforme : - Super Admin

Le Super Admin est séparé des utilisateurs d'un établissement.

Les permissions doivent être contrôlées : - dans l'interface ; - dans
les services applicatifs ; - dans la base de données/backend.

Ne jamais considérer le masquage d'un bouton comme une sécurité
suffisante.

## 7. Super Admin

Le Super Admin doit pouvoir administrer la plateforme et les
établissements selon ses permissions.

Il doit notamment pouvoir : - créer/configurer un établissement ; -
activer ou désactiver des modules ; - gérer les établissements ; - gérer
les utilisateurs selon les droits prévus ; - gérer les appareils ; -
consulter les informations de synchronisation ; - gérer les paramètres
globaux ; - consulter les journaux système ; - préparer l'architecture
pour les licences/abonnements futurs.

Le Super Admin ne doit pas être mélangé avec les données ou permissions
normales d'une école.

## 8. Structure scolaire

La structure scolaire doit être configurable et ne doit pas être
entièrement codée en dur.

Pour le collège, le système doit permettre des classes telles que : -
6ème A - 6ème B - 6ème C - 5ème A - 4ème A - 3ème A

Une direction doit pouvoir créer de nouvelles classes sans modification
du code.

Séparer conceptuellement : - Section - Niveau - Série si nécessaire -
Classe

Exemple collège : Section → Niveau → Classe

Exemple lycée : Section → Niveau → Série → Classe

Un enseignant peut enseigner au collège, au lycée ou aux deux.

## 9. Années scolaires et périodes

Le système doit gérer plusieurs années scolaires et conserver
l'historique.

Exemples : - 2025-2026 - 2026-2027

Une seule année scolaire doit être active à la fois pour un
établissement.

Les périodes scolaires doivent être configurables.

Le système doit permettre notamment : - 1er trimestre - 2ème trimestre -
3ème trimestre

Ne pas coder les périodes de manière rigide afin de permettre plus tard
d'autres modèles.

## 10. Élèves et historique scolaire

Ne jamais simplement remplacer la classe actuelle d'un élève sans
conserver son historique.

Les inscriptions doivent conserver l'année scolaire et la classe.

Exemple : - 2025-2026 → 5ème A - 2026-2027 → 4ème A

Le système doit prévoir : - inscription ; - réinscription ; - changement
de classe ; - transfert ; - retrait/départ ; - historique scolaire.

## 11. Enseignants et affectations

Une affectation doit relier au minimum : - enseignant ; - matière ; -
classe ; - année scolaire.

Selon le modèle retenu, elle peut également contenir : - section ; -
niveau ; - période.

Un professeur ne doit accéder qu'aux classes et matières qui lui sont
attribuées.

## 12. Matières

Les matières doivent être configurables par l'établissement.

Ne pas hardcoder la liste des matières dans le code.

Les matières doivent pouvoir être associées aux niveaux/classes et aux
enseignants.

## 13. Notes et évaluations

Une note ne doit jamais être simplement stockée comme un nombre isolé.

Elle doit pouvoir être rattachée à : - élève ; - matière ; - enseignant
; - classe ; - année scolaire ; - période/trimestre ; - évaluation ; -
score ; - barème ; - date ; - coefficient si applicable.

Le système doit prévoir : - évaluations ; - notes ; - moyennes par
évaluation ; - moyennes par matière ; - moyenne trimestrielle ; -
moyenne générale ; - classement si activé ; - bulletins.

Les règles de calcul ne doivent pas être dispersées ou codées en dur
lorsqu'elles peuvent être configurables.

## 14. Présences et absences

Les enseignants doivent pouvoir enregistrer les présences/absences pour
leurs classes.

La direction doit pouvoir consulter les statistiques et historiques.

## 15. Paiements et caisse

Le module financier doit permettre notamment : - frais scolaires ; -
paiements ; - paiements partiels ; - reçus ; - caisse ; - historique des
transactions ; - états financiers.

La secrétaire prend en charge les fonctions prévues pour la
caisse/comptabilité.

Les opérations financières importantes doivent être traçables.

## 16. Documents et rapports

Le logiciel doit être capable de produire progressivement : - listes
d'élèves ; - listes de classes ; - listes d'enseignants ; - statistiques
; - états de paiement ; - résultats scolaires ; - bulletins ; - reçus
; - rapports administratifs.

Les bulletins doivent pouvoir contenir les informations nécessaires : -
établissement ; - élève ; - classe ; - année scolaire ; -
trimestre/période ; - matières ; - notes ; - moyennes ; - coefficients
; - moyenne générale ; - appréciations.

## 17. Sécurité

Utiliser Supabase Auth pour l'authentification.

Mettre en place des politiques de sécurité côté backend/base de données,
notamment Row Level Security (RLS) pour l'isolation des établissements.

Les permissions doivent être vérifiées côté serveur/backend et pas
uniquement dans React.

Prévoir un journal d'audit pour les opérations importantes : -
utilisateur ; - action ; - entité concernée ; - date/heure ; - appareil.

Exemples : - professeur ajoute une note ; - secrétaire enregistre un
paiement ; - direction modifie une classe.

## 18. Appareils

Chaque installation doit pouvoir être identifiée comme un appareil.

Le système doit prévoir : - identité de l'appareil ; - établissement
associé ; - utilisateur/appareil ; - dernière synchronisation ; - état
; - version de l'application ; - possibilité de révocation par le Super
Admin.

## 19. Licence et activation

L'application commerciale doit prévoir une architecture d'activation.

Flux cible :

Installation .exe → activation/configuration → identification de
l'établissement → validation serveur → récupération de la configuration
→ connexion utilisateur → fonctionnement local possible hors ligne

Les licences et abonnements peuvent être développés plus tard, mais
l'architecture ne doit pas empêcher leur ajout.

## 20. Qualité du code

Toujours privilégier : - code lisible ; - architecture modulaire ; -
séparation des responsabilités ; - composants réutilisables ; - services
distincts ; - typage TypeScript strict ; - validation des données ; -
gestion des erreurs ; - migrations versionnées ; - tests sur les
fonctionnalités critiques.

Ne pas créer de gros fichiers contenant toute la logique de
l'application.

## 21. Base de données

Les schémas de base de données doivent être versionnés par migrations.

Les données historiques ne doivent pas être détruites lors d'une
évolution fonctionnelle.

Les relations entre entités doivent être explicites et cohérentes.

Les identifiants doivent être stables et adaptés à la synchronisation
multi-appareils.

## 22. Synchronisation et conflits

Toutes les opérations synchronisables doivent pouvoir être identifiées
de manière unique.

Le système doit pouvoir détecter les conflits lorsque plusieurs
appareils modifient une même donnée hors ligne.

Ne jamais écraser silencieusement une modification distante sans
stratégie définie.

Prévoir notamment : - `id` - `version` - `updated_at` - `updated_by` -
`device_id`

pour les entités concernées.

## 23. Interface utilisateur

L'interface doit être : - simple ; - professionnelle ; - adaptée à une
utilisation quotidienne dans une école ; - responsive dans les limites
de l'application desktop ; - claire pour les utilisateurs non
techniques.

Les menus doivent être adaptés au rôle de l'utilisateur.

## 24. Règle de développement avec Antigravity

Ne pas développer tout le logiciel en une seule étape.

Avant chaque grande implémentation : 1. lire les règles du projet ; 2.
lire `PLAN_IMPLEMENTATION.md` ; 3. identifier la phase en cours ; 4.
implémenter uniquement la phase demandée ; 5. vérifier que la phase
fonctionne ; 6. corriger les erreurs ; 7. documenter les décisions
importantes ; 8. passer à la phase suivante uniquement après validation.

Ne jamais supprimer ou réécrire une fonctionnalité existante sans
vérifier ses dépendances.

Toute décision d'architecture importante doit rester compatible avec : -
multi-établissements ; - multi-modules ; - fonctionnement offline ; -
synchronisation ; - historique des données ; - sécurité.

## 25. Principe fondamental

Le logiciel doit être conçu comme un produit commercial durable, et non
comme une simple application créée pour une seule école.

Toute nouvelle fonctionnalité doit être pensée pour pouvoir être
utilisée par plusieurs établissements sans mélange de données.
