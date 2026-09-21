# Scénarios de test — Nia (P3-03)

Document vivant des scénarios de test du logiciel Nia, couvrant les
anomalies identifiées dans `NIA_AUDIT_OPENCODE.md` (P0, P1, P2, P3) et les
phases fonctionnelles de `PLAN_IMPLEMENTATION.md`.

Chaque scénario indique :
- les prérequis ;
- les étapes ;
- le résultat attendu.

Un scénario n'est validé que si **toutes** les étapes donnent le résultat attendu.

---

## 1. Commandes de vérification automatisées

| Vérification | Commande | Cible |
|---|---|---|
| Typecheck | `npx tsc -p tsconfig.app.json --noEmit` | TypeScript |
| Build | `npm run build` | Compilation + bundle Vite |
| Lint | `npm run lint` | oxlint (warnings pré-existants acceptés, pas de nouvelle erreur) |
| Tests unitaires | `npm test` | Vitest — 6 tests d'isolation multi-établissements du `WebSqlMock` |
| Backend Tauri | `cargo check` (dans `src-tauri/`) | Rust (si l'environnement Rust est installé) |

Règle : un correctif n'est terminé que si typecheck, lint, tests et build passent
(ou que l'écart est documenté).

---

## 2. Scénario 1 — Isolation multi-établissements (P0-04)

Couvre : tables locales à `school_id`, filtres stricts du mock, lecture/sync.

Automatisé : `npm test` (`src/services/local/websql-mock.test.ts`, 6 tests).

### Prérequis
- Deux établissements A et B toujours accessibles au Super Admin.

### Étapes
1. Super Admin crée 6ème A dans l'établissement A et 6ème A dans l'établissement B
   (mêmes noms, données distinctes).
2. Ouvrir la liste des classes côté A puis côté B.
3. En mode navigateur de développement (WebSqlMock), effectuer une écriture
   (inscription) dans A, puis la relire côté B.

### Résultat attendu
- Afficher les classes de A ne montre jamais celles de B, et inversement.
- Aucune lecture ni écriture locale ne mélange les établissements (filtre strict,
  jamais `|| !school_id`).
- Une ligne sans `school_id` n'est jamais considérée comme appartenant à A ou B.

---

## 3. Scénario 2 — Permissions et impersonation (P0-01)

Couvre : pas de bypass des permissions pendant l'impersonation.

### Prérequis
- Un compte Super Admin et un compte professeur (établissement A).

### Étapes
1. Le professeur tente d'ouvrir une route direction (`/direction/*`) : accès refusé.
2. Le Super Admin s'impersonifie le professeur : l'interface affiche l'espace
   professeur, avec un indicateur de mode impersonation visible.
3. Depuis ce mode, le Super Admin tente une action interdite du scope professeur
   (ex : modifier une licence, accéder à la caisse).
4. Le Super Admin quitte le mode impersonation.

### Résultat attendu
- Le professeur ne peut jamais accéder aux routes direction.
- L'impersonation ne modifie pas la session Supabase réelle (l'identité
  authentifiée reste celle du Super Admin).
- Aucune opération interdite n'est réalisable via l'impersonation (le frontend
  n'est jamais la seule protection ; RLS reste le verrou final).
- Quitter le mode impersonation restaure l'identité réelle.
- Le journal d'audit trace l'acteur réel (Super Admin), l'utilisateur visualisé,
  l'action et la date (type `IMPERSONA*` / journalisation prévue P0-01).

---

## 4. Scénario 3 — Sécurité RLS côté base (P0-03)

Couvre : migrations, politiques SELECT/INSERT/UPDATE/DELETE, fonctions SECURITY DEFINER.

### Prérequis
- Accès Supabase SQL Editor, rôle `postgres`.

### Étapes
1. Exécuter l'intégralité de `supabase/audit/rls_diagnostics.sql`.
2. Inspecter le résultat :
   - chaque table métier a RLS activé (`rls_enabled = t`) ;
   - chaque table possède des politiques couvrant SELECT/INSERT/UPDATE/DELETE ;
   - les politiques restreignent par `school_id` (et par classe/matière pour le
     professeur) ;
   - les fonctions SECURITY DEFINER sont identifiées et vérifiées ;
   - les triggers anti-escalade `profiles` sont présents et actifs.
3. Vérifier l'ordre des migrations appliquées (section 5 du diagnostic).
4. Tester manuellement les rôles : professeur, secrétaire, direction, Super Admin,
   utilisateur d'un autre établissement, utilisateur non authentifié.

### Résultat attendu
- Aucune table sensible sans RLS ni politique manquante.
- Un utilisateur ne peut pas changer son propre rôle ni son école (trigger anti-escalade).
- L'insertion d'un `audit_logs` n'est possible que pour `user_id = auth.uid()`
  et `school_id` = école courante.
- Ce qui n'est pas vérifiable depuis le dépôt (état réel de la base) est exécuté
  via ce protocole et les conclusions consignées ici.

---

## 5. Scénario 4 — Base locale SQLite vs navigateur (P0-02, P1-02, P1-04)

Couvre : pas de bascule silencieuse vers WebSqlMock ; erreurs d'initialisation
remontées ; contrat du mock documenté.

### Prérequis
- Packaging Tauri (`npm run tauri dev` ou `.exe`).

### Étapes
1. Lancer l'application Tauri avec le fichier SQLite supprimé/verrouillé ou une
   migration cassée (simulation).
2. Observer l'état d'erreur affiché par `SyncStatusPanel` et la console.
3. Lancer l'application en navigateur de développement (`npm run dev`) : le mock
   fonctionne uniquement si le mode navigateur est explicitement activé.

### Résultat attendu
- En Tauri, une erreur SQLite **ne bascule jamais automatiquement** vers
  l'LocalStorage/WebSqlMock : état d'erreur explicite et message exploitable
  (cf. P0-02 : `db.ts` ne touche pas à `localStorage` sur le chemin SQLite).
- Le moteur de stockage utilisé est indiqué dans `SyncStatusPanel`.
- Le mock (utilisé en dev navigateur) respecte le contrat documenté :
  limites supportées listées dans `LOCAL_CLOUD_CONTRACT.md` / `WebSqlMock` —
  il n'est jamais utilisé pour valider la logique critique de sync.
- L'échec d'une mutation remonte un résultat explicite au module appelant
  (jamais `console.warn` seul), accompagné d'une alerte UI.

---

## 6. Scénario 5 — Périmètre professeur (P1-05, Scénario 3 NIA)

Couvre : accès classe/matière/élèves, notes, présences.

### Prérequis
- Professeur P affecté à 6ème A uniquement (matière M), année scolaire active.

### Étapes
1. P saisit une note dans sa classe 6ème A / matière M : accepté.
2. P tente de saisir une note dans la classe 5ème B (non affectée) : refusé.
3. P tente de lire les élèves d'une classe non affectée : refusé.
4. P tente d'enregistrer une présence hors de son périmètre : refusé.
5. Direction et secrétaire conservent leurs droits prévus.

### Résultat attendu
- Les opérations contributeur/élève de P sont limitées aux écritures dont
  l'élève est inscrit dans ses classes (cf. P1-05) — refus côté service ET côté
  RLS.
- Seules les classes/matières affectées sont visibles dans le dashboard professeur.

---

## 7. Scénario 6 — Synchronisation deux appareils (P1-03, Scénario 2 NIA)

Couvre : curseurs par table, pull partiel, suppressions, retry, idempotence.

### Prérequis
- Deux postes (PC direction, PC secrétaire), Supabase accessible.

### Étapes
1. PC direction crée une classe hors ligne (déconnecté) ; PC secrétaire ajoute
   une inscription hors ligne.
2. Réconnecter les deux postes et synchroniser.
3. Sur un chiffre, simuler une erreur réseau pendant le pull d'une table.
4. Faire une suppression depuis un poste, vérifier la réplication sur l'autre.

### Résultat attendu
- Toutes les modifications locales sont remontées (file `mutations_queue`,
  statut `pending → processing → supprimé après succès`).
- Le curseur global n'avance pas si une table critique échoue (curseur **par
  table**) ; au cycle suivant, la reprise est automatisée (`retry`,
  `MAX_RETRIES = 3`).
- Les insertions sont idempotentes (`onConflict: 'id'`, upsert).
- Les suppressions sont logiques (tombstone `deleted_at`) et propagées.
- `SyncStatusPanel` reflète l'état réel (idle/syncing/offline/error/conflit).

---

## 8. Scénario 7 — Paiements et soldes (Scénario 4 NIA)

Couvre : paiements partiels, soldes, historique, reçus.

### Prérequis
- Un élève avec des frais définis à 100 000 (table `fee_definitions`).

### Étapes
1. Enregistrer un paiement partiel de 40 000.
2. Enregistrer un second paiement de 60 000.
3. Ouvrir l'historique de l'élève, puis la caisse.

### Résultat attendu
- Solde = 0 après les deux paiements.
- Les deux paiements restent dans l'historique (jamais écrasés).
- Un reçu est généré pour chaque paiement, avec numérotation cohérente.
- Soldes cohérents en cas de paiement partiel (pas de solde négatif ni perdu).

---

## 9. Scénario 8 — Licence et activation (Phase 28)

Couvre : création, prolongation, réactivation, activation, cache hors ligne.

### Prérequis
- Super Admin + établissement, connexion Internet.

### Étapes
1. Super Admin → Licences : créer une licence (durée mois/jours/heures/minutes,
   max appareils). Copier la clé `KEM-...`.
2. Prolonger la licence d'une durée, vérifier `valid_until` = fin actuelle +
   durée (pas de doublement des champs du formulaire).
3. Révoquer puis réactiver.
4. Côté Direction, déconnecter Internet, activer avec la clé (en ligne), puis
   couper Internet : l'application reste utilisable via le cache `license_cache`.
5. Laisser expirer la période : l'obturateur bloque l'application.

### Résultat attendu
- Un seul formulaire de création (champs Durée/Jours/Heures/Minutes **non doublés**).
- Le flux de prolongation affiche un seul bloc de champs (avec bouton Annuler).
- L'activation passe par `LicenseService.activate` (validation serveur, appareil
  non révoqué) puis `license_cache` local.
- Hors ligne : `LicenseService.validate` lit le cache et contrôle l'expiration.
- Révoquée/expirée → accès bloqué avec message explicite.
- Chaque activation est tracée (`LICENSE_ACTIVATE` dans `audit_logs`).

---

## 10. Scénario 9 — Appareils (P1-01)

Couvre : enregistrement, affectation, révocation, heartbeat, version.

### Prérequis
- Un compte d'établissement + Super Admin, table `school_devices`.

### Étapes
1. Enregistrer un appareil via `DeviceRegistrationModal` (version = source
   officielle `package.json`, cf. P2-02).
2. Super Admin → Appareils : identifier l'appareil, vérifier dernière activité /
   dernière sync.
3. Révoquer l'appareil.

### Résultat attendu
- Toutes les opérations utilisent `school_devices` (aucune référence à `devices`).
- La version enregistrée n'est plus codée en dur (`1.0.0` remplacé par la source
   officielle via `vite` define — voir `src/utils/version.ts`).
- Un appareil révoqué ne peut pas activer de licence (`DeviceService.isRevoked`).

---

## 11. Scénario 10 — Sauvegarde et restauration (Phase 27)

Couvre : sauvegarde locale/cloud, restauration, intégrité.

### Prérequis
- Direction, menu → Sauvegardes (`/direction/backups`).

### Étapes
1. Créer une sauvegarde locale.
2. Créer une sauvegarde cloud (table `backups`, RLS par établissement).
3. Vérifier l'intégrité (`PRAGMA integrity_check`, checksum SHA-256).
4. Restaurer la sauvegarde sur un environnement de test.

### Résultat attendu
- Les données sont récupérables telles quelles.
- La file `mutations_queue` est vidée après restauration (documenté : les
  modifications non synchronisées sont perdues).
- Les actions `CREATE_BACKUP`, `RESTORE_BACKUP`, `VERIFY_INTEGRITY` sont auditées.

---

## 12. Cartographie audit → scénario

| Item | Scénario(s) | Statut |
|---|---|---|
| P0-01 Impersonation | 3 | ✅ corrigé — à re-tester |
| P0-02 Fallback SQLite | 5 | ✅ corrigé — à re-tester |
| P0-03 RLS | 4 | ✅ validé en base : RLS actif (28 tables), politiques par table OK, grants `anon` réduits à SELECT, trigger anti-escalade actif |
| P0-04 Isolation | 2 | ✅ corrigé — tests automatisés 6/6 |
| P1-01 `school_devices` | 10 | ✅ corrigé |
| P1-02 WebSqlMock | 5 | ✅ contrat documenté |
| P1-03 Sync curseurs | 7 | ✅ corrigé |
| P1-04 Erreurs locales | 5 | ✅ corrigé |
| P1-05 Périmètre professeur | 6 | ✅ corrigé |
| P2-01 Build/lint | 1 | ✅ vérifié |
| P2-02 Version app | 10 | ✅ corrigé |
| P2-03 Tests | 1, 2 | ✅ vitest 6/6 |
| P2-04 Contrat local/cloud | — | ✅ `LOCAL_CLOUD_CONTRACT.md` |
| P3-01 `any` | — | ✅ corrigé à la frontière SQL locale |
| P3-02 Observabilité | 5 | ✅ corrigé |
| P3-03 Documentation | ce document | ✅ |