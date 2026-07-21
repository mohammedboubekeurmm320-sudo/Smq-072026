# PROMPT — Correction du garde-fou de workflow documentaire (bug silencieux) + nettoyage du dépôt
**Projet :** Smq-072026 (QMS SaaS, ISO 13485 / 21 CFR Part 11)
**Destinataire :** Agent de code GLM 5.0
**Priorité :** CRITIQUE — le garde-fou censé être livré ne s'exécute jamais actuellement

---

## CONTEXTE

Le commit précédent a implémenté le workflow d'approbation documentaire à séparation des tâches (`document-workflow-guard.ts`, migration `010_document_review_workflow.sql`, branchement dans `crud-service.ts`). La logique métier est correcte, **mais une erreur de nom de colonne rend le contrôle totalement inopérant, silencieusement**.

**Ne refaites pas la conception** (les règles de transition, la séparation des tâches auteur/approbateur sont bien pensées). Ce prompt corrige uniquement le bug et le nettoyage.

---

## ⚠️ TÂCHE 0 — Corriger la colonne inexistante (bloquant, priorité absolue)

**Le bug exact :** la table `documents` a une colonne `created_by_id`, **pas** `created_by`. Le code référence `created_by` à plusieurs endroits, ce qui fait échouer les requêtes concernées silencieusement.

**Fichiers et lignes à corriger :**

1. **`src/lib/crud-service.ts`**, dans `update()` :
   ```ts
   .select('status, author_id, created_by')
   ```
   → remplacer par :
   ```ts
   .select('status, author_id, created_by_id')
   ```
   **Et surtout** : le résultat de ce `select` (`currentDoc`) est utilisé sans jamais vérifier l'`error` retourné. Si la requête échoue pour une raison quelconque à l'avenir, `currentDoc` est `null` et **le garde-fou entier est silencieusement sauté** — la mise à jour continue sans aucun contrôle. Corriger le pattern pour qu'une erreur sur ce `select` **bloque la mise à jour** (fail-closed) au lieu de la laisser passer :
   ```ts
   const { data: currentDoc, error: docFetchError } = await client
     .from('documents')
     .select('status, author_id, created_by_id')
     .eq('id', id)
     .single()

   if (docFetchError) {
     return { data: null, error: 'Impossible de vérifier le statut actuel du document — mise à jour refusée par sécurité.' }
   }

   if (currentDoc && body.status !== currentDoc.status) {
     // ... suite inchangée ...
   }
   ```

2. **`src/lib/document-workflow-guard.ts`**, fonction `checkApprovalTransition` :
   ```ts
   .select('author_id, created_by')
   ```
   → `.select('author_id, created_by_id')`, et adapter les variables locales (`doc.created_by` → `doc.created_by_id`) en conséquence.

3. **`supabase/migrations/010_document_review_workflow.sql`**, fonction `validate_document_transition` :
   ```sql
   SELECT author_id, created_by, approver_id, effective_date
   ```
   → `SELECT author_id, created_by_id, approver_id, effective_date`, et adapter `v_doc.created_by` → `v_doc.created_by_id` partout dans la fonction (variables `v_author_id`, `v_creator_id`).
   - Cette fonction RPC n'est actuellement pas appelée par l'application (le contrôle passe par la fonction TypeScript). La corriger quand même pour cohérence, mais ne pas la brancher dans ce prompt — la logique applicative (Tâche 0, points 1-2) suffit comme contrôle actif.

**Critère d'acceptation (à tester impérativement avant de considérer la tâche terminée) :**
1. Créer un document en `Draft`, le faire passer en `Under Review` par son auteur → doit fonctionner.
2. Tenter de le faire passer en `Approved` **sans** signature électronique de type `approval` → doit être **rejeté** avec le message explicite (pas un passage silencieux).
3. Ajouter une signature d'approbation signée par l'auteur lui-même, puis tenter `Under Review → Approved` → doit être **rejeté** (séparation des tâches).
4. Ajouter une signature d'approbation signée par un profil distinct de l'auteur → la transition doit **réussir**.
5. Vérifier explicitement, avant/après ce correctif, qu'une requête `select('status, author_id, created_by_id')` sur `documents` ne renvoie pas d'erreur (au lieu de juste vérifier que l'update aboutit — le point 2 du test précédent aurait dû échouer aussi avant ce correctif à cause du bug, donc bien confirmer que le comportement observé change réellement).

---

## TÂCHE 1 — Nettoyer la pollution du dépôt

**Contexte :** le commit précédent a ajouté ~1060 fichiers hors sujet (+258 983 lignes) sous un répertoire `skills/` à la racine — des skills génériques d'agent IA (docx, pptx, design, gaokao, quiz, etc.) qui n'ont aucun rapport avec ce projet QMS. C'est probablement un artefact de l'environnement de l'agent committé par erreur.

**Exigences :**
1. `git rm -r --cached skills/` puis committer la suppression.
2. Ajouter `skills/` au `.gitignore` pour éviter une réintroduction future.
3. Ne toucher à aucun autre fichier du projet dans ce commit de nettoyage — le séparer du correctif de la Tâche 0 pour garder l'historique lisible.

**Critère d'acceptation :** `git ls-files | grep ^skills/` ne doit plus rien retourner après ce commit.

---

## ORDRE D'EXÉCUTION IMPOSÉ

1. Tâche 0 — corriger le bug de colonne, tester les 5 scénarios listés, committer.
2. Tâche 1 — nettoyage du dépôt, commit séparé.

**Ne touchez à aucun autre fichier fonctionnel** (pas de nouveaux modules, pas de refactor). Ce correctif doit rester minimal et facilement revuable.

## LIVRABLE ATTENDU

- Diff limité à `src/lib/crud-service.ts`, `src/lib/document-workflow-guard.ts`, `supabase/migrations/010_document_review_workflow.sql` pour la Tâche 0.
- Un commit distinct supprimant `skills/` pour la Tâche 1.
- Confirmation explicite (log ou description du test manuel effectué) que les 5 critères d'acceptation de la Tâche 0 ont été vérifiés un par un, pas juste "ça compile".
