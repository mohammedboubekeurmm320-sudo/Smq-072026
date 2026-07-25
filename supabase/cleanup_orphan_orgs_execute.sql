-- ============================================================
-- CLEANUP ORGANS ORPHELINES — EXÉCUTION DIRECTE
-- QMS Smq-072026
-- ============================================================
-- À exécuter dans Supabase Dashboard → SQL Editor → Run
--
-- Ce script SUPPRIME DÉFINITIVEMENT les organizations orphelines
-- (sans members) et toutes les données liées en CASCADE.
-- ============================================================

-- ÉTAPE 1: Inventaire AVANT suppression (lecture seule)
SELECT '=== ORGANIZATIONS ORPHELINES À SUPPRIMER ===' AS section;
SELECT o.id, o.name, o.slug, o.created_at
FROM organizations o
LEFT JOIN organization_members om ON om.organization_id = o.id
WHERE om.id IS NULL
ORDER BY o.created_at DESC;

SELECT '=== PROFILES LIÉS (seront CASCADE-supprimés) ===' AS section;
SELECT p.id, p.email, p.full_name, p.organization_id
FROM profiles p
WHERE p.organization_id IN (
  SELECT o.id FROM organizations o
  LEFT JOIN organization_members om ON om.organization_id = o.id
  WHERE om.id IS NULL
)
ORDER BY p.created_at DESC;

SELECT '=== COUNTS ===' AS section;
SELECT
  (SELECT count(*) FROM organizations o LEFT JOIN organization_members om ON om.organization_id = o.id WHERE om.id IS NULL) AS orgs_to_delete,
  (SELECT count(*) FROM profiles p WHERE p.organization_id IN (SELECT o.id FROM organizations o LEFT JOIN organization_members om ON om.organization_id = o.id WHERE om.id IS NULL)) AS profiles_to_delete,
  (SELECT count(*) FROM sessions s WHERE s.profile_id IN (SELECT p.id FROM profiles p WHERE p.organization_id IN (SELECT o.id FROM organizations o LEFT JOIN organization_members om ON om.organization_id = o.id WHERE om.id IS NULL))) AS sessions_to_delete;

-- ============================================================
-- ÉTAPE 2: SUPPRESSION EFFECTIVE
-- ============================================================
-- Toutes les suppressions sont CASCADE via les FK ON DELETE CASCADE
-- configurées dans la migration 000_prisma_base_tables.sql.

BEGIN;

DELETE FROM organizations
WHERE id IN (
  SELECT o.id
  FROM organizations o
  LEFT JOIN organization_members om ON om.organization_id = o.id
  WHERE om.id IS NULL
);

-- ÉTAPE 3: Vérification APRÈS suppression
SELECT '=== APRÈS CLEANUP ===' AS section;
SELECT
  (SELECT count(*) FROM organizations) AS orgs_restantes,
  (SELECT count(*) FROM profiles) AS profiles_restant,
  (SELECT count(*) FROM organization_members) AS memberships_restant;

SELECT '=== ORGANIZATIONS LÉGITIMES RESTANTES ===' AS section;
SELECT o.id, o.name, o.slug, count(om.id) AS members_count
FROM organizations o
LEFT JOIN organization_members om ON om.organization_id = o.id
GROUP BY o.id, o.name, o.slug
ORDER BY o.created_at DESC;

SELECT '=== SESSIONS RESTANTES (liées aux profils valides) ===' AS section;
SELECT s.id, s.profile_id, p.email, s.expires_at, s.created_at
FROM sessions s
JOIN profiles p ON p.id = s.profile_id
ORDER BY s.created_at DESC
LIMIT 10;

COMMIT;

-- Si quelque chose cloche, exécutez: ROLLBACK;
