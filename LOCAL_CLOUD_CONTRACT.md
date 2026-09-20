# Contrat Local/Cloud — Nia

Contrat de cohérence entre la base **locale** (SQLite `nia.db`, schéma
`src/services/local/schema.sql`) et le **cloud** (Supabase/Postgres, migrations
dans `supabase/migrations/`).

Règles communes :
- Chaque ligne synchronisée = clé primaire `id` (UUID, généré localement via
  `crypto.randomUUID()` ou coté serveur).
- Toutes les tables d'entreprise portent `school_id` (isolation multi-tenant).
- Champs de synchronisation (présents dans les deux mondes) :
  - `version` INTEGER — version de la ligne (incrémenté par les mises à jour) ;
  - `created_at` / `updated_at` — timestamps ; `updated_at` sert de curseur
    d'incrémental (pull par table, comparaison `>=`) ;
  - `updated_by` — id du dernier éditeur (profiles) ;
  - `device_id` — appareil émetteur ;
  - `deleted_at` — **suppression logique** (tombstone) : jamais de DELETE physique
    dans la file de mutation.
- Ordre de sync : `SYNC_TABLES` dans `src/services/sync.service.ts`
  (parents avant enfants).
- Le curseur d'incrémental est **par table** :
  `sync_metadata.last_sync_at_{schoolId}_{table}` (cf. P1-03).

## Tableau de compatibilité (19 tables synchronisées)

| Table | `school_id` | Champs obligatoires | Uniques | Dépend de | Conflit |
|---|---|---|---|---|---|
| `academic_years` | ✔ | `name`, `start_date`, `end_date` | `id` | — | LWW |
| `periods` | ✔ | `academic_year_id`, `name` | `id` | `academic_years` | LWW |
| `sections` | ✔ | `name` | `id` | — | LWW |
| `levels` | ✔ | `section_id`, `name` | `id` | `sections` | LWW |
| `series` | ✔ | `level_id`, `name` | `id` | `levels` | LWW |
| `classes` | ✔ | `level_id`, `academic_year_id`, `name` | `id` | `levels`, `academic_years` | LWW |
| `students` | ✔ | `first_name`, `last_name` | `id`, `matricule` (il·le) | — | LWW |
| `teachers` | ✔ | `first_name`, `last_name` | `id` | `profiles` (`profile_id`) | LWW |
| `enrollments` | ✔ | `student_id`, `class_id`, `academic_year_id`, `enrollment_date` | `id` | `students`, `classes` | LWW |
| `subjects` | ✔ | `name` | `id` | — | LWW |
| `teacher_assignments` | ✔ | `teacher_id`, `subject_id`, `class_id`, `academic_year_id` | `id` | `teachers`, `subjects`, `classes` | LWW |
| `schedules` | ✔ | `academic_year_id`, `class_id`, `subject_id`, `teacher_id`, `day_of_week`, `start_time`, `end_time` | `id` | `classes`, `subjects`, `teachers` | LWW |
| `assessments` | ✔ | `class_id`, `subject_id`, `period_id`, `title`, `assessment_date` | `id` | `classes`, `subjects`, `periods` | LWW |
| `grades` | ✔ | `assessment_id`, `student_id` | `id` | `assessments`, `students` | **Critique** |
| `averages` | ✔ | `student_id`, `period_id`, `class_id`, `average` | `id` | `students`, `periods`, `classes` | **Critique** |
| `attendance` | ✔ | `student_id`, `class_id`, `date`, `status` | `id` | `students`, `classes` | LWW |
| `fee_definitions` | ✔ | `academic_year_id`, `name`, `amount` | `id` | `academic_years` | **Critique** |
| `payments` | ✔ | `student_id`, `academic_year_id`, `amount`, `payment_date` | `id` | `students`, `academic_years` | **Critique** |
| `receipts` | ✔ | `payment_id`, `receipt_number`, `issue_date` | `id` | `payments` | **Critique** |
| `expenses` | ✔ | `academic_year_id`, `category`, `amount`, `expense_date` | `id` | `academic_years` | LWW |

Tableaux **non synchronisés** (locaux ou techniques) : `mutations_queue`,
`sync_metadata`, `conflicts_log`, `audit_logs`, `backups`, `license_cache`,
`class_subjects`, `subject_templates`, `subject_template_items`.

## Détail par axe

### Identifiant
- `id` UUID ; l'insert local précède la sync ; `INSERT OR REPLACE ... id`.
- En cas de doublon d'insert, l'upsert cloud (`onConflict: 'id'`) rend la
  mutation idempotente.

### `school_id`
- Obligatoire sur toutes les tables d'entreprise (locale : `NOT NULL` ;
  cloud : politique RLS sur `school_id`).
- Le pull est filtré par `school_id` ; RLS vérifie `is_school_member`,
  `is_direction`, `is_secretaire`, `is_super_admin` (voir `rls_diagnostics.sql`
  et les migrations `*_rls_*`).

### Champs obligatoires / types
- Les colonnes non-listées sont optionnelles (TEXT/REAL/INTEGER nullable).
- Booléens stockés en `INTEGER 0|1` côté SQLite, convertis en `BOOLEAN` cloud
  (cf. `BOOLEAN_COLUMNS` dans `sync.service.ts`, sinon conversion JS `v ? 1 : 0`).

### Suppression
- Logique uniquement : poser `deleted_at` (et `updated_at`), la ligne reste
  synchronisable (tombstone copié localement par le pull). RLS administratif
  = `rls_*_delete_*` (direction/super admin).

### Conflits
- `CRITICAL_TABLES = { grades, averages, payments, receipts, fee_definitions }`
  → **jamais** de résolution automatique (`pending_manual`, attend l'utilisateur).
- Autres tables : auto-résolution *last-write-wins*.
- Journal : `conflicts_log` (versions locale + distante, résolution).

### Comportement offline
- Écritures locales immédiates (SQLite) + `queueMutation` dans
  `mutations_queue` (statut `pending` → `processing` → supprimé après succès).
- `pushMutations` : upsert idempotent, retries (`MAX_RETRIES = 3`) puis état
  `error` — mutation visible pour revue manuelle (UI `SyncStatusPanel`).
- `pullData` : curseurs par table ; échec d'une table → son curseur ne bouge pas.