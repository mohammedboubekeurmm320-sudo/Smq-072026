-- ============================================================
-- CLEANUP COMPLET — SUPPRESSION DES ORGANIZATIONS ORPHELINES
-- QMS Smq-072026
-- ============================================================
-- À exécuter dans Supabase Dashboard → SQL Editor → Run
--
-- CONTEXTE:
--   Le script précédent a échoué avec l'erreur:
--   "violates foreign key constraint documents_organization_id_fkey"
--   Cela signifie que les FK constraints en DB réelle ne sont PAS
--   CASCADE (contrairement à ce que disent les migrations SQL).
--
-- SOLUTION:
--   Supprimer EXPLICITEMENT toutes les tables enfants qui ont une FK
--   vers organizations, dans le bon ordre (feuilles d'abord, puis nœuds
--   parents), avant de supprimer les organizations.
--
-- SÉCURITÉ:
--   - Transaction BEGIN/COMMIT
--   - Inventaire AVANT/APRÈS
--   - À tout moment: ROLLBACK; pour annuler
-- ============================================================

-- ============================================================
-- ÉTAPE 1: Inventaire AVANT suppression
-- ============================================================

SELECT '=== INVENTAIRE AVANT CLEANUP ===' AS section;

SELECT
  (SELECT count(*) FROM organizations o
   LEFT JOIN organization_members om ON om.organization_id = o.id
   WHERE om.id IS NULL) AS orgs_orphelines,
  (SELECT count(*) FROM profiles p
   WHERE p.organization_id IN (
     SELECT o.id FROM organizations o
     LEFT JOIN organization_members om ON om.organization_id = o.id
     WHERE om.id IS NULL
   )) AS profiles_lies,
  (SELECT count(*) FROM documents d
   WHERE d.organization_id IN (
     SELECT o.id FROM organizations o
     LEFT JOIN organization_members om ON om.organization_id = o.id
     WHERE om.id IS NULL
   )) AS documents_lies,
  (SELECT count(*) FROM sessions s
   WHERE s.profile_id IN (
     SELECT p.id FROM profiles p
     WHERE p.organization_id IN (
       SELECT o.id FROM organizations o
       LEFT JOIN organization_members om ON om.organization_id = o.id
       WHERE om.id IS NULL
     )
   )) AS sessions_lies;

-- Détail des organizations orphelines à supprimer
SELECT '=== ORGANIZATIONS ORPHELINES ===' AS section;
SELECT o.id, o.name, o.slug, o.created_at
FROM organizations o
LEFT JOIN organization_members om ON om.organization_id = o.id
WHERE om.id IS NULL
ORDER BY o.created_at DESC;

-- ============================================================
-- ÉTAPE 2: SUPPRESSION EFFECTIVE (transaction)
-- ============================================================

BEGIN;

-- Sauvegarder les IDs des orgs orphelines dans une CTE temporaire
-- (PostgreSQL ne permet pas de réutiliser une CTE entre plusieurs statements,
-- donc on utilise une table temporaire)
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

-- 2a. Tables enfants de documents (FK vers documents.id)
DELETE FROM document_versions WHERE document_id IN (SELECT doc_id FROM _orphan_doc_ids);
DELETE FROM document_prerequisites WHERE document_id IN (SELECT doc_id FROM _orphan_doc_ids);
DELETE FROM document_prerequisites WHERE prerequisite_document_id IN (SELECT doc_id FROM _orphan_doc_ids);
DELETE FROM document_triggers WHERE document_id IN (SELECT doc_id FROM _orphan_doc_ids);
DELETE FROM document_relationships WHERE source_document_id IN (SELECT doc_id FROM _orphan_doc_ids);
DELETE FROM document_relationships WHERE target_document_id IN (SELECT doc_id FROM _orphan_doc_ids);
DELETE FROM electronic_signatures WHERE document_id IN (SELECT doc_id FROM _orphan_doc_ids);

-- 2b. Tables enfants des entités métier (FK vers capas/audits/etc.)
DELETE FROM audit_findings WHERE audit_id IN (
  SELECT id FROM audits WHERE organization_id IN (SELECT org_id FROM _orphan_orgs)
);
DELETE FROM batch_steps WHERE batch_record_id IN (
  SELECT id FROM batch_records WHERE organization_id IN (SELECT org_id FROM _orphan_orgs)
);
DELETE FROM capas_five_why WHERE capa_id IN (
  SELECT id FROM capas WHERE organization_id IN (SELECT org_id FROM _orphan_orgs)
);
DELETE FROM record_links WHERE source_record_id IN (
  SELECT id FROM record_type_definitions WHERE organization_id IN (SELECT org_id FROM _orphan_orgs)
) OR target_record_id IN (
  SELECT id FROM record_type_definitions WHERE organization_id IN (SELECT org_id FROM _orphan_orgs)
);

-- 2c. Sessions (FK vers profiles.id)
DELETE FROM sessions WHERE profile_id IN (SELECT profile_id FROM _orphan_profile_ids);

-- 2d. Audit trails (peut référencer n'importe quelle table)
DELETE FROM audit_trails WHERE organization_id IN (SELECT org_id FROM _orphan_orgs);

-- 2e. Tables métier avec FK directe vers organizations
DELETE FROM documents WHERE organization_id IN (SELECT org_id FROM _orphan_orgs);
DELETE FROM electronic_signatures WHERE organization_id IN (SELECT org_id FROM _orphan_orgs);
DELETE FROM document_prerequisites WHERE organization_id IN (SELECT org_id FROM _orphan_orgs);
DELETE FROM document_triggers WHERE organization_id IN (SELECT org_id FROM _orphan_orgs);
DELETE FROM document_relationships WHERE organization_id IN (SELECT org_id FROM _orphan_orgs);
DELETE FROM document_code_sequences WHERE organization_id IN (SELECT org_id FROM _orphan_orgs);
DELETE FROM form_templates WHERE organization_id IN (SELECT org_id FROM _orphan_orgs);
DELETE FROM form_instances WHERE organization_id IN (SELECT org_id FROM _orphan_orgs);
DELETE FROM capas WHERE organization_id IN (SELECT org_id FROM _orphan_orgs);
DELETE FROM non_conformances WHERE organization_id IN (SELECT org_id FROM _orphan_orgs);
DELETE FROM deviations WHERE organization_id IN (SELECT org_id FROM _orphan_orgs);
DELETE FROM change_controls WHERE organization_id IN (SELECT org_id FROM _orphan_orgs);
DELETE FROM audits WHERE organization_id IN (SELECT org_id FROM _orphan_orgs);
DELETE FROM risks WHERE organization_id IN (SELECT org_id FROM _orphan_orgs);
DELETE FROM training WHERE organization_id IN (SELECT org_id FROM _orphan_orgs);
DELETE FROM batch_records WHERE organization_id IN (SELECT org_id FROM _orphan_orgs);
DELETE FROM suppliers WHERE organization_id IN (SELECT org_id FROM _orphan_orgs);
DELETE FROM record_type_definitions WHERE organization_id IN (SELECT org_id FROM _orphan_orgs);
DELETE FROM record_links WHERE organization_id IN (SELECT org_id FROM _orphan_orgs);
DELETE FROM custom_field_definitions WHERE organization_id IN (SELECT org_id FROM _orphan_orgs);
DELETE FROM scheduled_reports WHERE organization_id IN (SELECT org_id FROM _orphan_orgs);
DELETE FROM departments WHERE organization_id IN (SELECT org_id FROM _orphan_orgs);

-- 2f. organization_members (FK vers organizations.id)
DELETE FROM organization_members WHERE organization_id IN (SELECT org_id FROM _orphan_orgs);

-- 2g. profiles (FK vers organizations.id)
DELETE FROM profiles WHERE organization_id IN (SELECT org_id FROM _orphan_orgs);

-- 2h. Enfin: organizations
DELETE FROM organizations WHERE id IN (SELECT org_id FROM _orphan_orgs);

-- Nettoyage des tables temporaires
DROP TABLE _orphan_doc_ids;
DROP TABLE _orphan_profile_ids;
DROP TABLE _orphan_orgs;

-- ============================================================
-- ÉTAPE 3: Vérification APRÈS suppression
-- ============================================================

SELECT '=== APRÈS CLEANUP ===' AS section;
SELECT
  (SELECT count(*) FROM organizations) AS orgs_restantes,
  (SELECT count(*) FROM profiles) AS profiles_restant,
  (SELECT count(*) FROM organization_members) AS memberships_restant,
  (SELECT count(*) FROM sessions) AS sessions_restantes,
  (SELECT count(*) FROM documents) AS documents_restant;

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

COMMIT;

-- ❌ Si erreur ou anomalie: ROLLBACK;
