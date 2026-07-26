-- ============================================================
-- INSPECTION SCHÉMA — Toutes les tables existantes
-- QMS Smq-072026
-- ============================================================
-- À exécuter DANS SUPABASE DASHBOARD → SQL Editor → Run
--
-- Affiche la liste exacte des tables qui existent dans votre DB,
-- pour que le script de cleanup ne référence que des tables réelles.
-- ============================================================

SELECT '=== TOUTES LES TABLES EXISTANTES (schema public) ===' AS section;

SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- ============================================================
-- TABLES AYANT UNE FK VERS organizations.id
-- ============================================================
SELECT '=== TABLES AVEC FK VERS organizations.id ===' AS section;

SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table,
  ccu.column_name AS foreign_column,
  rc.delete_rule,    -- NO ACTION / CASCADE / SET NULL / RESTRICT
  rc.update_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON kcu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints rc ON rc.constraint_name = tc.constraint_name
JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = rc.unique_constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name = 'organizations'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- ============================================================
-- TOUTES LES FK DU SCHÉMA PUBLIC (pour voir les dépendances)
-- ============================================================
SELECT '=== TOUTES LES FK DU SCHÉMA PUBLIC ===' AS section;

SELECT
  tc.table_name AS child_table,
  kcu.column_name AS child_column,
  ccu.table_name AS parent_table,
  ccu.column_name AS parent_column,
  rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON kcu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints rc ON rc.constraint_name = tc.constraint_name
JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = rc.unique_constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY ccu.table_name, tc.table_name;

-- ============================================================
-- COMPTES PAR TABLE (pour voir ce qu'il y a à supprimer)
-- ============================================================
SELECT '=== COMPTES PAR TABLE ===' AS section;

SELECT 'organizations' AS table_name, count(*) AS total FROM organizations
UNION ALL SELECT 'profiles', count(*) FROM profiles
UNION ALL SELECT 'organization_members', count(*) FROM organization_members
UNION ALL SELECT 'sessions', count(*) FROM sessions
UNION ALL SELECT 'documents', count(*) FROM documents
UNION ALL SELECT 'capas', count(*) FROM capas
UNION ALL SELECT 'non_conformances', count(*) FROM non_conformances
UNION ALL SELECT 'deviations', count(*) FROM deviations
UNION ALL SELECT 'change_controls', count(*) FROM change_controls
UNION ALL SELECT 'audits', count(*) FROM audits
UNION ALL SELECT 'risks', count(*) FROM risks
UNION ALL SELECT 'training', count(*) FROM training
UNION ALL SELECT 'batch_records', count(*) FROM batch_records
UNION ALL SELECT 'suppliers', count(*) FROM suppliers
UNION ALL SELECT 'audit_trails', count(*) FROM audit_trails
UNION ALL SELECT 'record_type_definitions', count(*) FROM record_type_definitions
UNION ALL SELECT 'record_links', count(*) FROM record_links
UNION ALL SELECT 'electronic_signatures', count(*) FROM electronic_signatures
UNION ALL SELECT 'document_prerequisites', count(*) FROM document_prerequisites
UNION ALL SELECT 'document_triggers', count(*) FROM document_triggers
UNION ALL SELECT 'document_relationships', count(*) FROM document_relationships
UNION ALL SELECT 'document_code_sequences', count(*) FROM document_code_sequences
UNION ALL SELECT 'form_templates', count(*) FROM form_templates
UNION ALL SELECT 'form_instances', count(*) FROM form_instances
UNION ALL SELECT 'custom_field_definitions', count(*) FROM custom_field_definitions
UNION ALL SELECT 'departments', count(*) FROM departments
UNION ALL SELECT 'scheduled_reports', count(*) FROM scheduled_reports
UNION ALL SELECT 'notifications', count(*) FROM notifications;

-- (Les tables ci-dessus qui n'existent pas retourneront une erreur
-- pour cette UNION — c'est utile pour identifier ce qui existe.
-- Exécutez et regardez où l'erreur apparaît.)
