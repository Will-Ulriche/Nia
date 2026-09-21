# Nia - Logiciel de Gestion Scolaire

Bienvenue dans le dépôt du logiciel Nia. Ce logiciel est conçu comme un produit professionnel, sécurisé et multi-établissements (Collège, Lycée, etc.) fonctionnant en mode Offline-First (SQLite + Supabase Sync) grâce à Tauri.

## Prérequis
- [Node.js](https://nodejs.org/)
- [Rust](https://rustup.rs/) (et les dépendances de build C++ de Visual Studio si vous êtes sur Windows) pour compiler l'application Tauri.

## Installation

1. Installer les dépendances JavaScript :
```bash
npm install
```

2. Configurer les variables d'environnement :
Copiez `.env.example` en `.env` et remplissez les valeurs.

## Démarrage (Développement)

Pour démarrer l'application en mode Desktop (Tauri) avec le hot-reload React :
```bash
npm run tauri dev
```

Si vous souhaitez uniquement démarrer l'interface web pour des tests rapides (sans les API natives SQLite/Tauri) :
```bash
npm run dev
```

## Structure du Projet
- `src/` : Code source React (TypeScript).
  - `app/` : Point d'entrée (`App.tsx`).
  - `components/` : Composants UI réutilisables (dont `LicenseGuard`, modales, formulaires).
  - `pages/` : Vues par espace (`direction/`, `superadmin/`, dashboards).
  - `services/` : Logique métier (Supabase, sync) + `services/local/` (SQLite local, schémas).
  - `context/` : Contextes (`AuthContext`, `SchoolContext`, `AcademicContext`).
  - `hooks/` : Hooks réutilisables (`useAuth`, `useModules`, `usePermission`, ...).
  - `layouts/` : Dispositions (`DashboardLayout`).
  - `types/` : Définitions TypeScript.
  - `db/` : Référentiel de modules (`modules.db.ts`).
  - `utils/` : Fonctions utilitaires (`version.ts`).
- `src-tauri/` : Code source Rust pour l'application Desktop et ses plugins (ex: SQLite).
- `supabase/` : Migrations SQL (schéma + RLS) et `audit/rls_diagnostics.sql` (protocole de diagnostic RLS).

## Test et Qualité

- `npm test` : tests unitaires Vitest (isolation multi-établissements du `WebSqlMock`).
- `npm run lint` : oxlint.
- `npm run build` : typecheck + bundle Vite.
- Scénarios de test manuels : voir [`TEST_SCENARIOS.md`](TEST_SCENARIOS.md).
- Contrat de cohérence local/cloud : voir [`LOCAL_CLOUD_CONTRACT.md`](LOCAL_CLOUD_CONTRACT.md).

## Sauvegardes et Restauration (Phase 27)

La fonctionnalité est accessible depuis le menu **Direction → 💾 Sauvegardes** (`/direction/backups`).

- **Sauvegarde locale** : snapshot logique JSON (toutes les tables de données) + copie physique
  compacte de la base via `VACUUM INTO`, stockée dans le dossier de données de l'application
  (`<appDataDir>/backups/` ou racine `<appDataDir>/` si le dossier n'existe pas encore).
- **Sauvegarde cloud** : copie du snapshot dans la table Supabase `backups` (RLS par établissement).
- **Restauration** : remplace les données actuelles par le contenu de la sauvegarde (locale ou cloud).
  La file `mutations_queue` est vidée après restauration ; les modifications non synchronisées sont perdues.
- **Vérification d'intégrité** : `PRAGMA integrity_check` sur la base locale, sur le dernier snapshot
  physique, et validation du checksum SHA-256 de la dernière sauvegarde logique.

Chaque création, restauration et vérification d'intégrité est tracée dans le journal d'audit
(`CREATE_BACKUP`, `RESTORE_BACKUP`, `VERIFY_INTEGRITY`).

## Activation et Licence (Phase 28)

Préparation de la commercialisation : chaque établissement doit disposer d'une licence active pour
utiliser l'application.

- **Gestion côté Super Admin** : menu **Super Admin → 🔑 Licences** (`/admin/licenses`).
  Création d'une licence (établissement + durée en mois/jours/heures/minutes + nombre max
  d'appareils), prolongation d'une durée libre, révocation / réactivation, copie de la clé
  (`KEM-XXXX-XXXX-XXXX-XXXX`).
- **Activation côté Direction** : à la connexion, si l'application ne détecte pas de licence valide,
  un obturateur bloque l'application jusqu'à saisie de la clé fournie par l'administrateur.
- **Validation serveur** : la clé est vérifiée dans la table Supabase `licenses` (appartenance à
  l'établissement, statut `active`, période de validité) ; un appareil révoqué ne peut pas activer.
- **Cache local & hors ligne** : le résultat est mis en cache dans `license_cache` (SQLite) pour que
  l'application reste utilisable hors ligne entre deux validations ; l'expiration reste vérifiée localement.
- **Préparation abonnement** : la table `licenses` (statuts `active`/`expired`/`cancelled`/`pending`,
  `valid_until`, `max_devices`) est conçue pour servir de base à un futur système d'abonnement.

Chaque activation est tracée dans le journal d'audit (`LICENSE_ACTIVATE`).
