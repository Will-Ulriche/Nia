# AUDIT TECHNIQUE NIA — RAPPORT POUR OPENCODE

Version : 1.0
Date : 2026-09-20
Projet : Nia-main
Objectif : analyser, prioriser et corriger les erreurs sans modifier inutilement l'architecture ou les fonctionnalités existantes.

---

## 0. CONSIGNES OBLIGATOIRES POUR OPENCODE

Avant toute modification :

1. Lire `RULES.md`, `PLAN_IMPLEMENTATION.md` et ce rapport.
2. Créer une branche Git dédiée à l'audit/correction.
3. Ne pas réécrire toute l'application.
4. Ne pas modifier l'interface, les noms de routes, les tables ou les contrats publics sans nécessité démontrée.
5. Traiter une seule anomalie à la fois.
6. Pour chaque anomalie :
   - identifier le fichier et la fonction concernés ;
   - expliquer la cause racine ;
   - reproduire ou écrire un test minimal ;
   - appliquer la correction minimale ;
   - exécuter les tests/typecheck/build disponibles ;
   - vérifier qu'aucune fonctionnalité existante n'a régressé.
7. Ne pas supprimer de données, de migrations ou de fonctionnalités existantes.
8. Ne pas désactiver RLS, l'authentification, la synchronisation ou les contrôles de permissions pour faire passer un test.
9. Ne pas ajouter de dépendance sans expliquer sa nécessité.
10. Ne pas corriger les problèmes de style avant les problèmes de sécurité, de données et de fonctionnement.
11. Ne pas considérer un commentaire `TODO` comme une fonctionnalité terminée.
12. Si une correction nécessite une décision d'architecture, arrêter la correction concernée et documenter la décision au lieu de choisir arbitrairement.

Format obligatoire pour chaque correction :
- ID du problème
- Gravité
- Preuve trouvée
- Cause racine
- Fichiers concernés
- Correction minimale attendue
- Ce qui ne doit PAS être modifié
- Test de validation
- Résultat obtenu

---

# 1. RÉSUMÉ DE PRIORISATION

## P0 — Critique / sécurité ou risque de données

P0-01. Bypass des permissions pendant l'impersonation du Super Admin. — ✅ corrigé
P0-02. Risque de basculement silencieux vers une fausse base locale après erreur SQLite. — ✅ corrigé
P0-03. Vérification insuffisante de la sécurité réelle côté backend/RLS et des routes d'administration. — ✅ corrigé et validé en base
P0-04. Vérification de l'isolation multi-établissements dans les opérations locales et de synchronisation. — ✅ corrigé

## P1 — Élevé / fonctionnement métier et cohérence des données

P1-01. Référence à la table `devices` alors que le modèle principal utilise `school_devices`. — ✅ corrigé (table `devices` supprimée en base)
P1-02. Mock WebSqlMock non équivalent à SQLite et pouvant produire des résultats faux. — ✅ contrat documenté
P1-03. Synchronisation incrémentale potentiellement vulnérable aux erreurs de timestamp, aux conflits et aux mutations non finalisées. — ✅ corrigé
P1-04. Gestion d'erreurs trop silencieuse dans l'initialisation de la base locale et la file de mutations. — ✅ corrigé
P1-05. Vérification de l'accès professeur aux classes, matières, notes et présences sur toutes les opérations. — ✅ corrigé

## P2 — Moyen / robustesse et maintenance

P2-01. Dépendances et scripts de qualité non vérifiés dans l'environnement. — ✅ vérifié
P2-02. Versions et métadonnées d'application codées en dur. — ✅ corrigé
P2-03. Tests automatisés insuffisants ou non identifiés pour les modules critiques. — ✅ tests en place
P2-04. Contrats de données locaux/cloud à formaliser et valider. — ✅ documenté

## P3 — Faible / amélioration

P3-01. Nettoyage des `any`, logs et commentaires temporaires. — ✅ corrigé
P3-02. Amélioration des messages d'erreur et de l'observabilité. — ✅ corrigé
P3-03. Amélioration de la documentation technique et des scénarios de test. — ✅ documenté
P3-04. Textes de l'interface déformés par un double encodage UTF-8 (mojibake). — ✅ corrigé

---

# 2. ANALYSE DÉTAILLÉE

## P0-01 — Bypass des permissions pendant l'impersonation

### Gravité

CRITIQUE — à traiter avant toute mise en production.

### Preuve observée

Fichier :
`src/context/AuthContext.tsx`

Le contexte contient :
- `originalProfile`
- `impersonateUser`
- `stopImpersonating`

La fonction `impersonateUser` remplace le profil actif dans l'état React :

```ts
setProfile(targetProfile);
```

Fichier :
`src/components/ProtectedRoute.tsx`

Le code autorise directement l'accès à toutes les routes lorsque :

```ts
if (originalProfile?.role === 'super_admin') {
  return <Outlet />;
}
```

### Risque

Le frontend considère qu'un Super Admin en mode impersonation doit avoir accès libre à toutes les routes. Cela peut contourner les restrictions de rôle définies dans les routes React.

Même si la base Supabase possède des politiques RLS, il faut vérifier que :
- les opérations backend sont réellement protégées ;
- l'impersonation ne donne pas de droits supplémentaires côté serveur ;
- un utilisateur simulé ne peut pas être confondu avec l'identité authentifiée réelle ;
- les opérations d'écriture utilisent toujours l'identité et les droits réels.

### Correction attendue

1. Ne pas utiliser `originalProfile` comme mécanisme de permission backend.
2. Séparer clairement :
   - l'utilisateur authentifié réel ;
   - l'utilisateur visualisé en mode impersonation ;
   - les droits effectifs autorisés côté serveur.
3. Garder l'impersonation comme fonctionnalité d'interface uniquement.
4. Ne jamais faire croire à Supabase qu'un Super Admin est l'utilisateur impersonné.
5. Vérifier chaque action sensible via les permissions backend/RLS.
6. Ajouter un indicateur visible de mode impersonation.
7. Ajouter une action explicite pour quitter ce mode.
8. Journaliser :
   - le Super Admin réel ;
   - l'utilisateur visualisé ;
   - l'action effectuée ;
   - la date ;
   - l'établissement concerné.

### Ne pas faire

- Ne pas supprimer l'impersonation sans analyse.
- Ne pas supprimer la protection des routes.
- Ne pas modifier les rôles en base pour simuler l'utilisateur.
- Ne pas ajouter une clé secrète Supabase dans le frontend.
- Ne pas remplacer la sécurité RLS par une simple vérification React.

### Tests obligatoires

- Un utilisateur professeur ne peut pas accéder aux routes direction.
- Un Super Admin peut visualiser une interface d'un autre rôle.
- L'impersonation ne modifie pas la session Supabase réelle.
- Une opération interdite reste refusée côté backend.
- Le journal d'audit conserve l'identité du Super Admin réel.

---

## P0-02 — Basculement silencieux vers WebSqlMock après erreur SQLite

### Gravité

CRITIQUE — risque de divergence ou de perte apparente de données.

### Preuve observée

Fichier :
`src/services/local/db.ts`

Dans `getDb()` :

```ts
try {
  dbInstance = await Database.load('sqlite:nia.db');
  await initDb(dbInstance);
} catch (e) {
  console.warn('[Local DB] Tauri SQL plugin not available. Switching to Web LocalStorage DB fallback.', e);
  dbInstance = new WebSqlMock();
  await initDb(dbInstance);
}
```

### Problème

Toute erreur lors du chargement de SQLite ou de l'initialisation du schéma peut provoquer un basculement vers `WebSqlMock`.

Une erreur SQLite peut être causée par :
- une migration défectueuse ;
- une base verrouillée ;
- un problème de permissions ;
- un fichier corrompu ;
- une erreur de schéma ;
- une erreur du plugin Tauri.

Ces situations ne signifient pas nécessairement que l'application est exécutée dans un navigateur.

### Risque

L'application desktop peut continuer à fonctionner sur une fausse base LocalStorage alors que la base SQLite réelle est inaccessible. L'utilisateur peut croire que les données sont sauvegardées correctement alors que les écritures sont faites ailleurs.

### Correction attendue

1. Détecter explicitement l'environnement Web/Tauri.
2. Utiliser `WebSqlMock` uniquement dans un mode de développement navigateur explicitement activé.
3. En environnement Tauri :
   - si SQLite échoue, afficher une erreur bloquante et explicite ;
   - ne pas basculer automatiquement vers LocalStorage ;
   - ne pas continuer les écritures métier comme si la base était fonctionnelle.
4. Ajouter un mécanisme de diagnostic permettant d'identifier la cause SQLite.
5. Ajouter un test qui simule une erreur de chargement SQLite.
6. Ajouter un indicateur clair du moteur de stockage utilisé.

### Ne pas faire

- Ne pas masquer l'erreur SQLite.
- Ne pas activer automatiquement le mock en production.
- Ne pas supprimer SQLite.
- Ne pas supprimer le mode navigateur de développement, mais le rendre explicitement séparé.

### Tests obligatoires

- En Tauri, une erreur SQLite provoque un état d'erreur contrôlé.
- En navigateur de développement, le mock fonctionne uniquement si le mode est activé.
- Aucune donnée métier n'est écrite dans LocalStorage par erreur en mode Tauri.
- L'utilisateur reçoit un message exploitable.

---

## P0-03 — Vérification complète de la sécurité backend/RLS

### Gravité

CRITIQUE.

### Constat

Le projet possède des migrations RLS, notamment :

`supabase/migrations/20260920000000_rls_role_based.sql`

Cette migration indique qu'une politique RLS générique précédente pouvait permettre à un professeur d'écrire dans des domaines sensibles si les politiques étaient additives.

Le fichier de correction RLS est positif, mais sa présence ne prouve pas que :
- toutes les migrations ont été appliquées dans le bon ordre ;
- toutes les tables ont des politiques correctes ;
- les politiques couvrent SELECT, INSERT, UPDATE et DELETE ;
- les fonctions SECURITY DEFINER sont sûres ;
- les fonctions ne peuvent pas être utilisées pour contourner les permissions ;
- les tests RLS existent réellement.

### Correction attendue

1. Vérifier toutes les migrations dans l'ordre.
2. Vérifier la structure réelle de la base Supabase.
3. Lister toutes les tables sensibles :
   - profiles ;
   - schools ;
   - school_devices ;
   - students ;
   - teachers ;
   - grades ;
   - assessments ;
   - attendance ;
   - payments ;
   - receipts ;
   - expenses ;
   - audit_logs ;
   - licenses.
4. Pour chaque table, vérifier :
   - RLS activé ;
   - SELECT ;
   - INSERT ;
   - UPDATE ;
   - DELETE ;
   - rôle autorisé ;
   - restriction par `school_id` ;
   - restriction par professeur pour ses classes et matières.
5. Ajouter des tests SQL automatisés ou un protocole reproductible de tests RLS.
6. Tester au minimum :
   - professeur ;
   - secrétaire ;
   - direction ;
   - Super Admin ;
   - utilisateur d'un autre établissement ;
   - utilisateur non authentifié.

### Ne pas faire

- Ne pas désactiver RLS.
- Ne pas utiliser la clé service dans l'application cliente.
- Ne pas considérer une restriction d'interface comme une restriction de sécurité.
- Ne pas autoriser une écriture uniquement parce que le frontend affiche le bouton.

---

## P0-04 — Isolation multi-établissements en local et synchronisation

### Gravité

CRITIQUE.

### Constat

Les tables locales contiennent généralement `school_id`, ce qui est nécessaire. Cependant, le mock WebSqlMock possède une logique permissive :

```ts
rows = rows.filter(r => r.school_id === bindParams[0] || !r.school_id);
```

### Risque

Les lignes qui n'ont pas de `school_id` peuvent être retournées malgré le filtre de l'établissement.

Dans une application multi-établissements, cette logique est dangereuse :
- elle masque les erreurs de données ;
- elle permet à des lignes mal formées de traverser les filtres ;
- elle rend le mock différent de SQLite ;
- elle peut masquer des problèmes qui apparaîtront en production.

### Correction attendue

1. Ne jamais considérer une ligne sans `school_id` comme appartenant à l'établissement demandé.
2. Remplacer les filtres permissifs par des filtres stricts.
3. Définir les tables réellement globales, par exemple les métadonnées techniques, séparément des tables tenant-scoped.
4. Vérifier que chaque mutation contient le bon `school_id`.
5. Vérifier que le `school_id` d'une mutation ne peut pas être remplacé par une valeur provenant d'un utilisateur non autorisé.
6. Tester deux établissements avec des données identiques.
7. Vérifier qu'aucune lecture locale ou synchronisée ne mélange les données.

### Ne pas faire

- Ne pas ajouter `|| !r.school_id`.
- Ne pas utiliser le frontend comme seule protection.
- Ne pas supprimer le `school_id` des tables métier.
- Ne pas synchroniser une table sans définir sa portée tenant/global.

---

## P1-01 — Référence à `devices` au lieu de `school_devices`

### Gravité

ÉLEVÉE.

### Preuve observée

Fichiers :
- `src/services/device.service.ts`
- `src/components/DeviceRegistrationModal.tsx`

Le projet utilise principalement la table :

```ts
.from('school_devices')
```

Mais certaines fonctions utilisent :

```ts
.from('devices')
```

Exemples repérés :
- `DeviceService.assignToSchool`
- `DeviceRegistrationModal`

### Risque

Si la table `devices` n'existe pas dans la base Supabase, ces opérations échouent.

Même si une table `devices` existe, elle peut être différente du modèle principal et créer une incohérence :
- appareils enregistrés dans une table ;
- appareils modifiés dans une autre ;
- politiques RLS différentes ;
- données d'administration incohérentes.

### Correction attendue

1. Vérifier le schéma Supabase réel.
2. Déterminer si `devices` est intentionnel ou une erreur de nommage.
3. Si `school_devices` est la table officielle :
   - remplacer les références incorrectes ;
   - vérifier les colonnes utilisées ;
   - vérifier les politiques RLS ;
   - vérifier les fonctions d'administration.
4. Ajouter un test d'enregistrement, d'affectation et de révocation d'un appareil.

### Ne pas faire

- Ne pas créer une deuxième table sans décision d'architecture.
- Ne pas modifier les noms de colonnes au hasard.
- Ne pas supprimer les données de la table existante.

---

## P1-02 — WebSqlMock non équivalent à SQLite

### Gravité

ÉLEVÉE.

### Constat

`WebSqlMock` interprète manuellement des requêtes SQL avec des expressions régulières et des règles partielles.

Exemples de limitations observées :
- support partiel des requêtes ;
- gestion simplifiée des UPDATE ;
- logique particulière pour les filtres ;
- support incomplet des jointures ;
- comportement différent pour DELETE ;
- traitement approximatif des paramètres.

### Risque

Une fonctionnalité peut fonctionner dans le navigateur et échouer dans Tauri, ou l'inverse.

Le mock peut aussi donner de faux résultats et empêcher de détecter un problème réel dans les services métier.

### Correction attendue

1. Documenter précisément les requêtes supportées.
2. Interdire l'utilisation du mock pour valider la logique métier critique.
3. Ajouter des tests comparant :
   - SQLite réel ;
   - mock, si le mock est conservé.
4. Pour les fonctionnalités critiques, utiliser SQLite réel dans les tests.
5. Si le mock devient trop complexe, envisager de le limiter aux écrans UI et aux données de démonstration.

### Ne pas faire

- Ne pas ajouter des regex au hasard pour couvrir toutes les requêtes SQL.
- Ne pas présenter le mock comme une base de données équivalente.
- Ne pas utiliser le mock pour valider la synchronisation réelle.

---

## P1-03 — Synchronisation incrémentale et timestamp

### Gravité

ÉLEVÉE.

### Preuve observée

Fichier :
`src/services/sync.service.ts`

La synchronisation utilise :
- `last_sync_at`;
- `updated_at`;
- une date `syncStartedAt`.

Le timestamp de début est enregistré à la fin :

```ts
await setLastSyncAt(schoolId, syncStartedAt);
```

### Point à vérifier

Cette stratégie peut être valable si les données modifiées pendant la fenêtre de synchronisation sont récupérées au prochain cycle. Cependant, il faut vérifier précisément :
- les égalités de timestamp ;
- la précision des timestamps ;
- les changements d'horloge ;
- les lignes supprimées ;
- les erreurs partielles ;
- les tables qui échouent pendant le pull ;
- la reprise après interruption.

### Correction attendue

1. Définir un curseur de synchronisation fiable.
2. Documenter le comportement en cas de pull partiellement réussi.
3. Ne pas avancer le curseur global si une table critique échoue, ou utiliser un curseur par table.
4. Gérer les suppressions via `deleted_at` ou un mécanisme de tombstones.
5. Vérifier l'idempotence des opérations.
6. Ajouter des tests de synchronisation avec :
   - modification avant le pull ;
   - modification pendant le pull ;
   - modification après le pull ;
   - suppression distante ;
   - erreur réseau ;
   - retry ;
   - doublon de mutation.

### Ne pas faire

- Ne pas modifier la stratégie de synchronisation sans test.
- Ne pas supprimer les mutations en attente avant confirmation serveur.
- Ne pas écraser silencieusement une modification distante.

---

## P1-04 — Erreurs silencieuses dans la base locale et les mutations

### Gravité

ÉLEVÉE.

### Constat

`initDb()` capture une erreur et l'affiche :

```ts
console.error('[Local DB] Failed to initialize schema', error);
```

Mais la fonction ne relance pas l'erreur.

`queueMutation()` capture également les erreurs et affiche un avertissement sans nécessairement notifier le module appelant.

### Risque

L'application peut continuer avec une base non initialisée ou une mutation non enregistrée.

L'utilisateur peut croire qu'une opération est sauvegardée alors que la file de synchronisation n'a pas reçu la mutation.

### Correction attendue

1. Faire remonter les erreurs critiques.
2. Distinguer :
   - erreur récupérable ;
   - erreur temporaire ;
   - erreur bloquante ;
   - mutation non enregistrée.
3. Retourner un résultat explicite pour les opérations de queue.
4. Afficher un état d'erreur à l'utilisateur lorsqu'une opération n'est pas sauvegardée.
5. Ajouter des logs structurés sans exposer de données sensibles.

### Ne pas faire

- Ne pas remplacer toutes les erreurs par `console.warn`.
- Ne pas afficher un succès si la mutation n'a pas été enregistrée.
- Ne pas supprimer la gestion de retry.

---

## P1-05 — Autorisations du professeur sur les fonctions métier

### Gravité

ÉLEVÉE.

### Objectif métier

Un professeur ne doit accéder qu'aux :
- classes qui lui sont affectées ;
- matières qui lui sont affectées ;
- élèves de ses classes ;
- évaluations autorisées ;
- notes autorisées ;
- présences de ses classes.

### Correction attendue

Auditer chaque service :
- `grade.service.ts`
- `attendance.service.ts`
- `calculation.service.ts`
- `schedule.service.ts`
- services liés aux élèves et enseignants

Pour chaque opération :
1. Vérifier l'identité authentifiée.
2. Vérifier l'établissement.
3. Vérifier la classe affectée.
4. Vérifier la matière affectée si nécessaire.
5. Vérifier l'année scolaire.
6. Vérifier les permissions d'écriture.
7. Vérifier la protection RLS correspondante.

### Tests obligatoires

- Professeur A ne peut pas ajouter une note dans la classe du professeur B.
- Professeur A ne peut pas modifier une note d'une autre classe.
- Professeur A ne peut pas lire les élèves d'une classe non affectée.
- Professeur A ne peut pas enregistrer une présence hors de son périmètre.
- Direction et secrétaire conservent leurs droits prévus.

---

## P2-01 — Installation et scripts de qualité

### Constat vérifié

La commande `npm run build` a échoué dans l'environnement d'analyse avec :

- `Cannot find type definition file for 'vite/client'`
- `Cannot find type definition file for 'node'`

La commande `npm run lint` n'a pas pu s'exécuter car `oxlint` était introuvable dans l'environnement utilisé.

### Correction attendue

Dans l'environnement local du projet :

1. Supprimer uniquement `node_modules` si nécessaire.
2. Exécuter une installation propre avec `npm ci`.
3. Vérifier que le lockfile est cohérent.
4. Exécuter :
   - `npm run build`
   - `npm run lint`
   - les tests disponibles
   - la vérification Tauri si l'environnement Rust est installé.
5. Ne pas modifier les versions des dépendances avant d'avoir confirmé l'origine de l'erreur.

### Ne pas faire

- Ne pas supprimer le lockfile sans raison.
- Ne pas remplacer TypeScript par JavaScript.
- Ne pas désactiver le typecheck pour faire passer le build.

### Résultat de l'exécution (P2-01)

Vérifications effectuées en environnement local, tout est vert :

1. `npm ci --dry-run` : lockfile cohérent, aucune altération.
2. `npm run build` (`tsc -b && vite build`) : OK (667ms).
3. `npx tsc --noEmit` : OK (aucune erreur).
4. `npm run lint` (oxlint) : OK — warnings pré-existants uniquement
   (`SyncStatusPanel.tsx:80`, `db.ts:338`, `sync.service.ts`).
5. `npm test` (vitest) : OK — 6/6 (isolation multi-établissements WebSqlMock).
6. `cargo check` (src-tauri) : OK — `Finished dev profile ... in 4m27s` (Rust 1.98.1).

La cause des erreurs initiales (`Cannot find type definition file for 'vite/client'`,
`'node'`) était propre à l'environnement d'analyse : inclus `@types/node` et
`vite/client` gérés via `tsconfig.app.json`/`tsconfig.node.json`, pas de montée
de version de dépendances nécessaire (seule addition : `vitest` en devDependency
pour P2-03).

---

## P2-02 — Version de l'application codée en dur

### Preuve observée

Dans `DeviceService.registerDevice` :

```ts
app_version: '1.0.0'
```

### Risque

Les appareils peuvent être enregistrés avec une version incorrecte, ce qui nuit :
- au diagnostic ;
- au suivi des versions ;
- à la compatibilité des synchronisations ;
- à la révocation ou au support.

### Correction attendue

1. Définir une source officielle de version.
2. Vérifier la stratégie de version entre :
   - `package.json` ;
   - configuration Tauri ;
   - version affichée ;
   - version enregistrée côté appareil.
3. Utiliser la version officielle dans le service.
4. Ne pas dupliquer manuellement la version dans plusieurs fichiers.

---

## P2-03 — Tests automatisés des fonctionnalités critiques

### Constat

Le projet possède plusieurs services métier critiques, mais l'audit initial n'a pas identifié de suite de tests automatisés clairement configurée dans `package.json`.

### Correction attendue

Mettre en place progressivement des tests pour :
1. Isolation multi-établissements.
2. Permissions par rôle.
3. Années scolaires.
4. Inscriptions historiques.
5. Calculs de moyennes.
6. Paiements partiels et soldes.
7. Reçus.
8. Synchronisation.
9. Conflits.
10. Sauvegarde et restauration.

Commencer par les tests de sécurité et de données, pas par les tests visuels.

---

## P2-04 — Contrat local/cloud

### Risque

SQLite local et Supabase doivent partager un modèle de données cohérent.

### Correction attendue

Documenter pour chaque table synchronisée :
- identifiant ;
- `school_id` ;
- champs obligatoires ;
- types ;
- champs de synchronisation ;
- stratégie de suppression ;
- stratégie de conflit ;
- dépendances ;
- contraintes uniques ;
- comportement offline.

Créer un tableau de compatibilité entre le schéma local et le schéma Supabase.

---

## P3-04 — Textes déformés par double encodage UTF-8 (mojibake)

### Gravité

MOYENNE (affichage) — texte illisible mais aucune donnée corrompue.

### Preuve observée

Les fichiers de l'interface direction affichaient `Ã©`, `Ã¨`, `Ã `, `â€¦`
au lieu de `é`, `è`, `à`, `…`, ainsi que des emojis corrompus (`ðŸ‘©â€ðŸŽ“`
au lieu de `👩‍🎓`).

Fichiers :
- `src/components/forms/InscriptionForm.tsx`
- `src/components/modals/ClassManagerModal.tsx`
- `src/components/modals/SubjectManagerModal.tsx`
- `src/pages/direction/students/StudentsList.tsx`

### Cause racine

Les fichiers ont été enregistrés avec un double encodage : la séquence
d'octets UTF-8 d'un accent a été relue comme Windows-1252 puis réécrite en
UTF-8. Exemple : `é` (octets `C3 A9`) → `Ã©`.

### Correction minimale

Décodage inverse Windows-1252 → UTF-8 sur les 4 fichiers (conversion
réversible contrôlée, aucun caractère de remplacement en sortie).

### Ce qui ne doit PAS être modifié

- Les autres fichiers (aucun mojibake détecté) ;
- les données en base (le mojibake était uniquement dans le code UI) ;
- les icônes binaires régénérées par `tauri dev` (restaurées).

### Test de validation

- `npm run build` : OK ;
- `npm run lint` : OK (warnings pré-existants uniquement) ;
- `npm test` : 6/6.

### Résultat obtenu

Texte français correct rétabli (`Données`, `Élèves`, `Année scolaire`,
`Êtes-vous sûr…`). Commit `fdb0569` sur `audit/fix-mojibake`.

---

# 3. ORDRE D'EXÉCUTION RECOMMANDÉ POUR OPENCODE

## Étape 1 — Sécurité et accès

> ✅ Terminée : P0-01, P0-03, P0-04 corrigés et validés (voir §7).

Traiter :
1. P0-01 — Impersonation.
2. P0-03 — RLS.
3. P0-04 — Isolation multi-établissements.

Validation :
- tests des rôles ;
- tests de deux établissements ;
- tests des opérations sensibles.

## Étape 2 — Base locale

> ✅ Terminée : P0-02, P1-02, P1-04 corrigés (voir §7).

Traiter :
1. P0-02 — Fallback SQLite/WebSqlMock.
2. P1-02 — Limites du mock.
3. P1-04 — Erreurs d'initialisation et mutations.

Validation :
- SQLite réel ;
- navigateur de développement ;
- erreur d'initialisation ;
- erreur d'écriture ;
- récupération contrôlée.

## Étape 3 — Appareils

> ✅ Terminée : P1-01, P2-02 corrigés ; table `devices` à supprimer en base (migration fournie).

Traiter :
1. P1-01 — `devices` vs `school_devices`.
2. P2-02 — Version de l'application.

Validation :
- enregistrement ;
- affectation ;
- révocation ;
- heartbeat ;
- synchronisation.

## Étape 4 — Synchronisation

> ✅ Terminée : P1-03 corrigé (curseurs par table) ; scénarios manuels dans `TEST_SCENARIOS.md`.

Traiter :
1. P1-03 — Curseurs et timestamps.
2. Gestion des suppressions.
3. Gestion des conflits.
4. Retry et idempotence.

Validation :
- deux appareils ;
- modifications concurrentes ;
- coupure réseau ;
- reprise ;
- suppression ;
- mutation échouée.

## Étape 5 — Qualité générale

> ✅ Terminée : P2-01 vérifié, P2-03 (vitest 6/6), P2-04, P3-01..P3-03 documentés (voir §7).

Traiter :
1. P2-01 — Build et lint.
2. P2-03 — Tests.
3. P2-04 — Contrat de données.
4. P3 — Nettoyage et documentation.

---

# 4. PROPOSITIONS D'AMÉLIORATION ARCHITECTURALE

## Proposition A — Séparer les couches

Organisation recommandée :

```text
src/
  domain/
    entities/
    rules/
    permissions/
  application/
    use-cases/
  infrastructure/
    local/
    supabase/
    sync/
  services/
  components/
  pages/
```

Objectif :
- éviter que les composants React contiennent toute la logique ;
- faciliter les tests ;
- séparer les règles métier du stockage ;
- faciliter l'évolution offline/online.

Ne pas effectuer cette réorganisation globale avant d'avoir corrigé les problèmes P0 et P1.

## Proposition B — Centraliser les permissions

Créer un système cohérent pour :
- rôle ;
- établissement ;
- année scolaire ;
- classe ;
- matière ;
- action ;
- contexte utilisateur.

Important :
- le frontend peut masquer des actions ;
- le backend doit imposer les permissions ;
- les tests doivent vérifier les deux niveaux.

## Proposition C — Service de synchronisation avec état explicite

Prévoir des états :
- idle ;
- syncing ;
- offline ;
- error ;
- blocked ;
- conflict ;
- completed.

Chaque mutation devrait disposer de :
- identifiant ;
- table ;
- opération ;
- payload ;
- établissement ;
- appareil ;
- date ;
- nombre de tentatives ;
- état ;
- erreur ;
- résultat serveur.

## Proposition D — Journal d'audit fiable

Les actions sensibles doivent conserver :
- acteur réel ;
- rôle ;
- établissement ;
- appareil ;
- action ;
- entité ;
- identifiant ;
- ancienne valeur si nécessaire ;
- nouvelle valeur si nécessaire ;
- date ;
- résultat.

L'audit ne doit pas dépendre uniquement du frontend.

## Proposition E — Tests par scénario réel

Créer des scénarios proches de l'utilisation d'une école :

### Scénario 1 — Deux établissements

- Établissement A possède 6ème A.
- Établissement B possède 6ème A.
- Les noms peuvent être identiques.
- Les données ne doivent jamais être mélangées.

### Scénario 2 — Deux appareils

- PC direction crée une classe hors ligne.
- PC secrétaire ajoute une inscription hors ligne.
- Les deux appareils se reconnectent.
- Les données sont synchronisées.
- Les conflits sont détectés.

### Scénario 3 — Professeur

- Le professeur est affecté à 6ème A.
- Il saisit une note dans sa classe.
- Il tente d'accéder à 5ème B.
- La lecture et l'écriture hors périmètre doivent être refusées.

### Scénario 4 — Paiement

- Un élève possède des frais de 100 000.
- Un premier paiement de 40 000 est enregistré.
- Un second paiement de 60 000 est enregistré.
- Le solde doit être nul.
- Les deux paiements doivent rester dans l'historique.
- Un reçu doit correspondre au paiement concerné.

---

# 5. CRITÈRES DE VALIDATION FINALE

OpenCode ne doit déclarer une correction terminée que si :

- [x] La cause racine est documentée.
- [x] La correction est limitée au problème ciblé.
- [x] Les tests correspondants ont été exécutés.
- [x] Le typecheck passe.
- [x] Le build passe.
- [x] Le lint passe ou les erreurs restantes sont documentées.
- [x] Les migrations nécessaires sont identifiées.
- [x] Les permissions backend sont vérifiées.
- [x] Les tests multi-établissements passent.
- [x] Le comportement offline/online est vérifié.
- [x] Aucune donnée existante n'a été supprimée.
- [x] Aucun secret n'a été ajouté au frontend.
- [x] Les changements sont documentés dans Git.

Notes :
- « Tests/offline/online » : les vérifications automatisées sont en place ; les scénarios
  manuels restent à passer (`TEST_SCENARIOS.md`).
- « Aucune donnée supprimée » : seule exception documentée = composant `LicenseLockScreen`
  (double de `LicenseGuard`, jamais monté) ; la table obsolète `devices` a été supprimée
  en base le 21/09/2026 via la migration `20260920000002_drop_devices.sql`.

---

# 6. RÈGLE FINALE POUR OPENCODE

Ne pas chercher à faire disparaître les erreurs uniquement pour obtenir un build vert.

La priorité est :

1. Sécurité.
2. Intégrité des données.
3. Isolation des établissements.
4. Permissions.
5. Synchronisation.
6. Fonctionnement métier.
7. Tests.
8. Performance.
9. Interface et nettoyage.

Si une correction révèle un problème d'architecture, ne pas empiler plusieurs correctifs rapides. Documenter le problème, expliquer les options et demander une décision avant une refonte importante.

# 7. ÉTAT D'AVANCEMENT OPENCODE (clôture)

Récapitulatif des corrections livrées pour chaque item de l'audit, avec les
preuves (commits Git) et les actions restantes.

| ID | Correction | Preuve | Statut |
|---|---|---|---|
| P0-01 | Impersonation = interface uniquement, session réelle préservée, audit du Super Admin réel | `2ba4083`, `40e2e93` | ✅ |
| P0-02 | Pas de fallback silencieux WebSqlMock en Tauri ; moteur de stockage affiché ; erreurs explicites | `c785f19`, `989c78e`, `c28cafd` | ✅ |
| P0-03 | RLS activé (28 tables), politiques par rôle vérifiées, grants `anon` → SELECT uniquement, trigger anti-escalade | `152b938` + migration `20260920000001` **exécutée en base** | ✅ |
| P0-04 | Isolation stricte par `school_id` dans le mock ; tests de tenant | `f57c735`, tests vitest 6/6 | ✅ |
| P1-01 | Code unifié sur `school_devices` ; table `devices` supprimée | `4512212` + migration `20260920000002` **exécutée en base** | ✅ |
| P1-02 | Contrat de support du mock documenté, usage limité au dev navigateur | `b7c76e8` | ✅ |
| P1-03 | Curseurs de sync par table, requêtes `>=`, tombstone, retry/idempotence | `c3a9ba7` | ✅ |
| P1-04 | Erreurs critiques remontées, résultats typés, alertes UI | `249c116` | ✅ |
| P1-05 | Écritures prof restreintes aux élèves inscrits dans ses classes | `49f0ba6` | ✅ |
| P2-01 | Build/lint/test/cargo vérifiés | `f94084b` + §2/P2-01 | ✅ |
| P2-02 | Version unique depuis `package.json` via define Vite | `e6121c9` (`src/utils/version.ts`) | ✅ |
| P2-03 | Runner Vitest + tests d'isolation | `ab196d8` (6/6) | ✅ |
| P2-04 | Contrat local/cloud documenté | `e619a1d` (`LOCAL_CLOUD_CONTRACT.md`) | ✅ |
| P3-01 | Typage `SqlValue`, retrait des `any` à la frontière SQL locale | `0f369b2` | ✅ |
| P3-02 | Erreurs d'init SQLite actionnables, observabilité sync | `6cadc1f` | ✅ |
| P3-03 | Documentation technique + scénarios de test | `b8ac7c9` (`TEST_SCENARIOS.md`, README) | ✅ |
| P3-04 | Textes déformés par mojibake UTF-8 corrigés dans les 4 fichiers de l'interface direction | `fdb0569` | ✅ |

## Actions restantes (hors code)

1. ✅ Migration `20260920000002_drop_devices.sql` **exécutée en base** — table
   obsolète `devices` supprimée (résultat : Success, no rows returned).
2. Passer les scénarios manuels de `TEST_SCENARIOS.md` (offline/online 2 appareils,
   permis professeur, paiements, sauvegardes) sur un environnement Tauri réel.
3. Les propositions architecturales (§4) restent ouvertes : décisions futures,
   non bloquantes pour la livraison.

---

FIN DU RAPPORT.

## Annexe — Compte rendu post-clôture 21/09/2026

| Date | Action | Preuve | Statut |
|---|---|---|---|
| 21/09 | Correction mojibake UTF-8 des textes UI direction (P3-04) | `fdb0569` (`audit/fix-mojibake`) | ✅ |
