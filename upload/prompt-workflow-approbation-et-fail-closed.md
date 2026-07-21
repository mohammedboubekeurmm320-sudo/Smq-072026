# PROMPT — Fail-closed sur la révocation de session + Workflow d'approbation documentaire à séparation des tâches
**Projet :** Smq-072026 (QMS SaaS, ISO 13485 / 21 CFR Part 11)
**Destinataire :** Agent de code GLM 5.0
**Priorité :** Haute

---

## TÂCHE 1 — Basculer la vérification de révocation de session en fail-closed

**Fichier concerné :** `src/middleware.ts`

**Contexte :** la vérification de révocation de session (table `sessions`) est actuellement en fail-open : `catch { /* fail-open for availability */ }` — si la requête vers Supabase échoue (indisponibilité, timeout réseau), la session est considérée comme valide par défaut. En environnement 21 CFR Part 11, une panne ne doit jamais se traduire par un accès non contrôlé.

**Exigences :**
1. Remplacer le comportement fail-open par fail-closed : si la vérification de révocation échoue (erreur réseau, timeout, erreur Supabase), traiter la session comme invalide (redirection `/login` ou 401 sur `/api/*`, comportement déjà en place pour une session explicitement invalide).
2. Ajouter un log serveur explicite (`console.error` ou équivalent déjà utilisé dans le projet) distinguant ce cas (« session revocation check failed — denying access ») d'un rejet pour signature invalide, pour faciliter le diagnostic en cas d'incident de disponibilité.
3. Ne pas modifier le reste du flux de vérification JWT (`verifySession`) — ce point est déjà correct.

**Critère d'acceptation :** simuler une erreur de la requête de révocation (ex. mocker un throw) → la requête doit être rejetée (401/redirection), pas laissée passer.

---

## TÂCHE 2 — Workflow d'approbation documentaire à séparation des tâches

**Contexte :** `documents.status` accepte aujourd'hui n'importe quelle transition libre (`Draft → Approved` directement possible, sans passer par `Under Review`, et rien n'empêche l'auteur d'un document de l'approuver lui-même). C'est le point le plus visible qui distingue un vrai QMS (Veeva, MasterControl) d'un simple statut de champ : la séparation auteur/réviseur/approbateur et la preuve de chaque étape par signature électronique.

Le schéma existant contient déjà `documents.author_id`, `documents.created_by_id`, `documents.approver_id`, et la table `electronic_signatures` (avec `record_id`, `record_type`, `signature_type`, `signed_by_id`). Pas de refonte de schéma lourde nécessaire — un champ manque et une logique de contrôle est à ajouter.

### 2.1 — Migration

**Nouveau fichier :** `supabase/migrations/009_document_review_workflow.sql`

- Ajouter `reviewer_id TEXT` à `documents` (FK vers `profiles`, `ON DELETE SET NULL`), distinct de `approver_id`.
- Ajouter un index sur `electronic_signatures(record_type, record_id, signature_type)` si absent, pour accélérer les vérifications de la Tâche 2.2.

### 2.2 — Fonction de garde de transition de statut

**Nouveau fichier :** `src/lib/document-workflow-guard.ts`

Exporter `checkDocumentStatusTransition(client, organizationId, documentId, currentStatus, newStatus, requestingProfileId)` qui retourne `{ allowed: boolean, reason?: string }`.

Règles à appliquer :
1. `Draft → Under Review` : autorisé sans condition particulière (l'auteur soumet son propre document pour revue — c'est normal).
2. `Under Review → Approved` :
   - Doit exister une ligne `electronic_signatures` avec `record_type = 'documents'`, `record_id = documentId`, `signature_type = 'approval'`, `revoked = false`.
   - Le `signed_by_id` de cette signature **doit être différent** de `documents.author_id` et `documents.created_by_id` — séparation des tâches : l'auteur ne peut pas s'auto-approuver.
   - Si l'une des deux conditions échoue → `{ allowed: false, reason: '...' }` avec un message explicite (« Ce document doit être approuvé par un signataire distinct de son auteur, via une signature électronique de type approbation »).
3. `Approved → Effective` : `documents.effective_date` doit être renseignée (non nulle) et `<=` maintenant. Sinon rejeter.
4. Toute transition qui saute une étape (ex. `Draft → Approved` ou `Draft → Effective` directement) → rejetée avec un message indiquant l'étape manquante.
5. Transitions vers `Obsolete`/`Withdrawn` : autorisées depuis n'importe quel statut, sans condition (retrait toujours possible).
6. Si `currentStatus === newStatus` (pas de changement de statut dans la requête `update`) → ne pas appliquer ces règles, laisser passer (elles ne concernent que les changements de statut).

### 2.3 — Brancher le garde dans `update()`

**Fichier concerné :** `src/lib/crud-service.ts`, fonction `update()`

- Si `entity === 'documents'` et que `body.status` est présent et différent du statut actuel en base : récupérer le document actuel (`select status, author_id, created_by_id`), appeler `checkDocumentStatusTransition(...)`.
- Si `allowed === false` → retourner `{ data: null, error: reason }` **sans exécuter l'update**, même format d'erreur que le garde-fou de prérequis documentaire déjà en place (cohérence avec le prompt précédent).
- Ne pas appliquer cette logique aux autres entités dans ce prompt (`form_templates` a son propre cycle de vie, à traiter séparément si besoin).

### 2.4 — Retour UI

**Fichier concerné :** page de détail document (`src/app/(dashboard)/documents/page.tsx` ou la page de détail dédiée si elle existe séparément — vérifier l'arborescence avant de choisir le fichier)

- Afficher le message d'erreur du garde-fou de façon claire lors d'une tentative de changement de statut refusée (même pattern que la Tâche 3 du prompt précédent sur les prérequis).
- Si le document est en attente d'approbation (`Under Review`) et que l'utilisateur connecté est l'auteur, désactiver ou masquer le bouton « Approuver » côté UI (защита UX, pas une mesure de sécurité — le vrai contrôle reste côté serveur en 2.3).

---

## CRITÈRES D'ACCEPTATION GLOBAUX

1. `Draft → Under Review` : fonctionne sans signature préalable.
2. `Under Review → Approved` sans signature d'approbation existante → rejeté avec message clair.
3. `Under Review → Approved` avec signature d'approbation signée par l'auteur lui-même → rejeté (séparation des tâches).
4. `Under Review → Approved` avec signature d'approbation signée par un profil distinct de l'auteur → accepté.
5. `Approved → Effective` sans `effective_date` renseignée → rejeté.
6. `Draft → Approved` directement (saut d'étape) → rejeté.
7. Aucune régression sur le garde-fou de prérequis documentaire déjà en place (`document-prerequisite-guard.ts`, non modifié par ce prompt).
8. Simulation d'échec réseau sur la vérification de révocation de session (Tâche 1) → accès refusé, pas accepté par défaut.

## LIVRABLE ATTENDU

- `supabase/migrations/009_document_review_workflow.sql`
- `src/lib/document-workflow-guard.ts`
- Diff ciblé sur `src/middleware.ts` (Tâche 1), `src/lib/crud-service.ts` (Tâche 2.3), et la page de détail document concernée (Tâche 2.4).
- Ne pas toucher à `document-prerequisite-guard.ts`, `session.ts`, `verify-signature/route.ts` dans ce commit — chantiers déjà stabilisés.
