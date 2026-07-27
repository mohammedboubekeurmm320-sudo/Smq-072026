-- ============================================================
-- CLEANUP ORGANIZATIONS ORPHELINES — SANS TABLES TEMPORAIRES
-- QMS Smq-072026 — Version compatible Supabase SQL Editor (transaction pooler)
-- ============================================================
-- À exécuter dans Supabase Dashboard → SQL Editor → Run
--
-- PROBLÈME PRÉCÉDENT:
--   "relation _orphan_orgs does not exist"
--   Cause: Supabase SQL Editor utilise le pooler en mode transaction,
--   ce qui empêche les tables TEMP d'être visibles entre statements.
--
-- SOLUTION:
--   Ce script n'utilise AUCUNE table temporaire. Tout est inline.
--   Chaque DELETE contient sa propre sous-requête pour identifier
--   les IDs orphelins.
-- ============================================================

-- ============================================================
-- ÉTAPE 1: INVENTAIRE AVANT CLEANUP (lecture seule)
-- ============================================================

SELECT '=== INVENTAIRE AVANT CLEANUP ===' AS section;

SELECT 'organizations orphelines' AS item, count(*) AS total
FROM organizations o
LEFT JOIN organization_members om ON om.organization_id = o.id
WHERE om.id IS NULL
UNION ALL
SELECT 'profiles liés', count(*)
FROM profiles p
WHERE p.organization_id IN (
  SELECT o.id FROM organizations o
  LEFT JOIN organization_members om ON om.organization_id = o.id
  WHERE om.id IS NULL
)
UNION ALL
SELECT 'documents liés', count(*)
FROM documents d
WHERE d.organization_id IN (
  SELECT o.id FROM organizations o
  LEFT JOIN organization_members om ON om.organization_id = o.id
  WHERE om.id IS NULL
)
UNION ALL
SELECT 'sessions liées', count(*)
FROM sessions s
WHERE s.profile_id IN (
  SELECT p.id FROM profiles p
  WHERE p.organization_id IN (
    SELECT o.id FROM organizations o
    LEFT JOIN organization_members om ON om.organization_id = o.id
    WHERE om.id IS NULL
  )
);

-- Détail des organizations orphelines
SELECT '=== ORGANIZATIONS ORPHELINES (détail) ===' AS section;
SELECT o.id, o.name, o.slug, o.created_at
FROM organizations o
LEFT JOIN organization_members om ON om.organization_id = o.id
WHERE om.id IS NULL
ORDER BY o.created_at DESC;

-- ⚠️ ARRÊTEZ-VOUS ICI si l'inventaire semble anormal.
-- Si tout est OK, continuez avec ÉTAPE 2.


-- ============================================================
-- ÉTAPE 2: DELETE DYNAMIQUE via PL/pgSQL
-- ============================================================
-- Pour chaque table qui a une colonne `organization_id` (détectée
-- dynamiquement via information_schema), on exécute un DELETE.
-- Le bloc EXCEPTION garantit qu'une erreur sur une table ne stoppe
-- pas tout le script.
-- ============================================================

DO $$
DECLARE
  tbl TEXT;
  cnt INTEGER;
BEGIN
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
        'DELETE FROM %I WHERE organization_id IN (
           SELECT o.id FROM organizations o
           LEFT JOIN organization_members om ON om.organization_id = o.id
           WHERE om.id IS NULL
         )',
        tbl
      );
      GET DIAGNOSTICS cnt = ROW_COUNT;
      RAISE NOTICE '✓ Deleted % rows from %', cnt, tbl;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '⚠ Skipped %: %', tbl, SQLERRM;
    END;
  END LOOP;
END $$;

-- ============================================================
-- ÉTAPE 3: Sessions (FK vers profiles.id)
-- ============================================================
DELETE FROM sessions
WHERE profile_id IN (
  SELECT p.id FROM profiles p
  WHERE p.organization_id IN (
    SELECT o.id FROM organizations o
    LEFT JOIN organization_members om ON om.organization_id = o.id
    WHERE om.id IS NULL
  )
);

-- ============================================================
-- ÉTAPE 4: organization_members (FK vers organizations.id)
-- ============================================================
-- NOTE: on supprime les members des orgs orphelines, mais comme
-- ces orgs n'ont PAS de members (par définition), cette requête
-- ne supprimera probablement rien. On l'exécute quand même par sécurité.
DELETE FROM organization_members
WHERE organization_id IN (
  SELECT o.id FROM organizations o
  LEFT JOIN organization_members om ON om.organization_id = o.id
  WHERE om.id IS NULL
);

-- ============================================================
-- ÉTAPE 5: profiles (FK vers organizations.id)
-- ============================================================
DELETE FROM profiles
WHERE organization_id IN (
  SELECT o.id FROM organizations o
  LEFT JOIN organization_members om ON om.organization_id = o.id
  WHERE om.id IS NULL
);

-- ============================================================
-- ÉTAPE 6: Enfin, organizations
-- ============================================================
DELETE FROM organizations
WHERE id IN (
  SELECT o.id FROM organizations o
  LEFT JOIN organization_members om ON om.organization_id = o.id
  WHERE om.id IS NULL
);

-- ============================================================
-- ÉTAPE 7: VÉRIFICATION APRÈS CLEANUP
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

SELECT '=== SESSIONS RESTANTES ===' AS section;
SELECT s.id, s.profile_id, p.email, s.expires_at, s.created_at
FROM sessions s
JOIN profiles p ON p.id = s.profile_id
ORDER BY s.created_at DESC;
