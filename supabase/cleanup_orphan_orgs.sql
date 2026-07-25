-- ============================================================
-- CLEANUP ORGANS ORPHELINES — QMS Smq-072026
-- À exécuter dans Supabase Dashboard → SQL Editor
-- ============================================================
-- CONTEXTE:
--   Suite à des tests automatisés (23 juillet 2026), 19+ organizations
--   orphelines (sans members) polluent la DB de production.
--   Elles peuvent bloquer l'inscription de nouveaux comptes réels
--   à cause des contraintes UNIQUE sur organizations.slug et profiles.email.
--
-- SÉCURITÉ:
--   - Le script est entièrement dans une transaction (BEGIN/COMMIT)
--   - Il affiche d'abord ce qui sera supprimé
--   - Si quelque chose cloche, exécutez ROLLBACK; au lieu de COMMIT
--   - Toutes les suppressions sont CASCADE (FK configurées pour)
-- ============================================================

BEGIN;

-- ============================================================
-- ÉTAPE 1: Inventaire AVANT suppression
-- ============================================================

-- 1a. Organizations orphelines (sans members) à supprimer
SELECT 'ORGANIZATIONS ORPHELINES À SUPPRIMER' AS section, count(*) AS total
FROM organizations o
LEFT JOIN organization_members om ON om.organization_id = o.id
WHERE om.id IS NULL;

-- 1b. Détail de ces organizations
SELECT o.id, o.name, o.slug, o.created_at
FROM organizations o
LEFT JOIN organization_members om ON om.organization_id = o.id
WHERE om.id IS NULL
ORDER BY o.created_at DESC;

-- 1c. Profiles liés à ces organizations orphelines (seront CASCADE-supprimés)
SELECT 'PROFILES LIÉS À SUPPRIMER' AS section, count(*) AS total
FROM profiles p
WHERE p.organization_id IN (
  SELECT o.id FROM organizations o
  LEFT JOIN organization_members om ON om.organization_id = o.id
  WHERE om.id IS NULL
);

-- 1d. Sessions liées à ces profiles (seront CASCADE-supprimées)
SELECT 'SESSIONS LIÉES À SUPPRIMER' AS section, count(*) AS total
FROM sessions s
WHERE s.profile_id IN (
  SELECT p.id FROM profiles p
  WHERE p.organization_id IN (
    SELECT o.id FROM organizations o
    LEFT JOIN organization_members om ON om.organization_id = o.id
    WHERE om.id IS NULL
  )
);

-- 1e. Autres entités liées qui seront CASCADE-supprimées
SELECT 'DOCUMENTS LIÉS' AS section, count(*) AS total
FROM documents d
WHERE d.organization_id IN (
  SELECT o.id FROM organizations o
  LEFT JOIN organization_members om ON om.organization_id = o.id
  WHERE om.id IS NULL
);

-- ============================================================
-- ÉTAPE 2: Vérification visuelle
-- ============================================================
-- ⚠️ ARRÊTEZ-VOUS ICI si les chiffres ci-dessus sont surprenants.
-- Si tout semble correct, continuez avec ÉTAPE 3.
-- Sinon, exécutez: ROLLBACK;
-- ============================================================


-- ============================================================
-- ÉTAPE 3: Suppression effective (décommentez pour exécuter)
-- ============================================================

-- ATTENTION: Décommentez le bloc ci-dessous pour réellement supprimer.
-- Une fois exécuté, c'est irréversible.

/*
DELETE FROM organizations
WHERE id IN (
  SELECT o.id
  FROM organizations o
  LEFT JOIN organization_members om ON om.organization_id = o.id
  WHERE om.id IS NULL
);
*/

-- ============================================================
-- ÉTAPE 4: Vérification APRÈS suppression
-- ============================================================

-- 4a. Ne doit retourner AUCUNE ligne
SELECT 'ORGANIZATIONS ORPHELINES RESTANTES' AS section, count(*) AS total
FROM organizations o
LEFT JOIN organization_members om ON om.organization_id = o.id
WHERE om.id IS NULL;

-- 4b. Vérifier qu'il reste bien des organizations légitimes
SELECT 'ORGANIZATIONS LÉGITIMES RESTANTES' AS section, count(*) AS total
FROM organizations o
JOIN organization_members om ON om.organization_id = o.id;

-- 4c. Lister les organizations légitimes restantes (avec leur member count)
SELECT o.id, o.name, o.slug, count(om.id) AS members_count
FROM organizations o
JOIN organization_members om ON om.organization_id = o.id
GROUP BY o.id, o.name, o.slug
ORDER BY o.created_at DESC;


-- ============================================================
-- ÉTAPE 5: COMMIT ou ROLLBACK
-- ============================================================
-- ✅ Si les vérifications ci-dessus sont correctes:
COMMIT;

-- ❌ Si quelque chose cloche (annule TOUTE la transaction):
-- ROLLBACK;
