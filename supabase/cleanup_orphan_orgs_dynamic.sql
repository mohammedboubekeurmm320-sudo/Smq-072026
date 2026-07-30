-- ============================================================
-- CLEANUP DYNAMIQUE — SUPPRESSION DES ORGANIZATIONS ORPHELINES
-- QMS Smq-072026 — Version adaptive
-- ============================================================
-- À exécuter dans Supabase Dashboard → SQL Editor → Run
--
-- PRINCIPE: ce script utilise DO $$ ... $$ (PL/pgSQL) pour:
-- 1. Lister dynamiquement toutes les tables qui ont une colonne
--    organization_id (en interrogeant information_schema)
-- 2. Pour chacune, exécuter un DELETE WHERE organization_id IN (...)
-- 3. Pareil pour les tables ayant une FK vers profiles.id
-- 4. Supprimer les organizations orphelines à la fin
--
-- AVANTAGE: ne casse pas si certaines tables n'existent pas.
-- ============================================================

BEGIN;

-- ============================================================
-- ÉTAPE 1: Stocker les IDs cibles dans des tables temporaires
-- ============================================================

DROP TABLE IF EXISTS _orphan_orgs;
DROP TABLE IF EXISTS _orphan_profile_ids;
DROP TABLE IF EXISTS _orphan_doc_ids;

CREATE TEMP TABLE _orphan_orgs AS
SELECT o.id AS org_id
FROM organizations o
LEFT JOIN organization_members om ON om.organization_id = o.id
WHERE om.id IS NULL;

CREATE TEMP TABLE _orphan_profile_ids AS
SELECT p.id AS profile_id
FROM profiles p
WHERE p.organization_id IN (SELECT org_id FROM _orphan_orgs);

CREATE TEMP TABLE _orphan_doc_ids AS
SELECT d.id AS doc_id
FROM documents d
WHERE d.organization_id IN (SELECT org_id FROM _orphan_orgs);

SELECT '=== INVENTAIRE AVANT CLEANUP ===' AS section;
SELECT
  (SELECT count(*) FROM _orphan_orgs) AS orgs_to_delete,
  (SELECT count(*) FROM _orphan_profile_ids) AS profiles_to_delete,
  (SELECT count(*) FROM _orphan_doc_ids) AS documents_to_delete;

-- ============================================================
-- ÉTAPE 2: DELETE dynamique via PL/pgSQL DO block
-- ============================================================
-- Pour chaque table qui a une colonne `organization_id`,
-- on exécute un DELETE WHERE organization_id IN (orphans).
-- Le code est résistant: si une table n'existe pas, il ignore.

DO $$
DECLARE
  tbl TEXT;
  cnt INTEGER;
  deleted_rows INTEGER := 0;
BEGIN
  -- Boucler sur toutes les tables qui ont une colonne organization_id
  FOR tbl IN
    SELECT DISTINCT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables t ON t.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND c.column_name = 'organization_id'
      AND t.table_type = 'BASE TABLE'
      AND c.table_name NOT IN ('organizations', 'organization_members', 'profiles')
    ORDER BY c.table_name
  LOOP
    BEGIN
      EXECUTE format(
        'DELETE FROM %I WHERE organization_id IN (SELECT org_id FROM _orphan_orgs)',
        tbl
      );
      GET DIAGNOSTICS cnt = ROW_COUNT;
      deleted_rows := deleted_rows + cnt;
      RAISE NOTICE '✓ Deleted % rows from %', cnt, tbl;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '⚠ Skipped % (FK constraint or other): %', tbl, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE 'Total rows deleted from organization_id tables: %', deleted_rows;
END $$;

-- ============================================================
-- ÉTAPE 3: Sessions (FK vers profiles.id)
-- ============================================================
DELETE FROM sessions WHERE profile_id IN (SELECT profile_id FROM _orphan_profile_ids);

-- ============================================================
-- ÉTAPE 4: organization_members (FK vers organizations.id)
-- ============================================================
DELETE FROM organization_members WHERE organization_id IN (SELECT org_id FROM _orphan_orgs);

-- ============================================================
-- ÉTAPE 5: profiles (FK vers organizations.id)
-- ============================================================
DELETE FROM profiles WHERE organization_id IN (SELECT org_id FROM _orphan_orgs);

-- ============================================================
-- ÉTAPE 6: Enfin, organizations
-- ============================================================
DELETE FROM organizations WHERE id IN (SELECT org_id FROM _orphan_orgs);

-- ============================================================
-- ÉTAPE 7: Vérification APRÈS cleanup
-- ============================================================

SELECT '=== APRÈS CLEANUP ===' AS section;
SELECT
  (SELECT count(*) FROM organizations) AS orgs_restantes,
  (SELECT count(*) FROM profiles) AS profiles_restant,
  (SELECT count(*) FROM organization_members) AS memberships_restant,
  (SELECT count(*) FROM sessions) AS sessions_restantes;

SELECT '=== ORGANIZATIONS LÉGITIMES RESTANTES ===' AS section;
SELECT o.id, o.name, o.slug, count(om.id) AS members_count
FROM organizations o
LEFT JOIN organization_members om ON om.organization_id = o.id
GROUP BY o.id, o.name, o.slug
ORDER BY o.created_at DESC;

SELECT '=== PROFILES LÉGITIMES RESTANTS ===' AS section;
SELECT p.id, p.email, p.full_name, p.role, p.organization_id, p.last_login_at
FROM profiles p
ORDER BY p.created_at DESC;

-- Nettoyage des tables temporaires
DROP TABLE _orphan_doc_ids;
DROP TABLE _orphan_profile_ids;
DROP TABLE _orphan_orgs;

COMMIT;

-- ❌ Si erreur ou anomalie: ROLLBACK;
