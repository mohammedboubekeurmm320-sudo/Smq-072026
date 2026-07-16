-- ============================================================================
-- QMS ISO 13485 Pro — DIAGNOSTIC COMPLET DE L'ÉTAT DES MIGRATIONS
-- ============================================================================
-- À exécuter dans le Supabase SQL Editor (Dashboard → SQL Editor → New query)
--
-- Ce script est LISIBLE SEULEMENT (aucune modification de la base).
-- Il vérifie l'existence et la validité de chaque objet créé par les 5
-- fichiers de migration (000 à 005) et affiche un rapport structuré.
-- ============================================================================

-- ============================================================================
-- RÉSUMÉ GÉNÉRAL
-- ============================================================================
SELECT '═══════════════════════════════════════════════════════════════════' AS "";
SELECT '  DIAGNOSTIC MIGRATIONS QMS ISO 13485 Pro' AS "DIAGNOSTIC";
SELECT '  Date exécution: ' || now()::text AS "";
SELECT '═══════════════════════════════════════════════════════════════════' AS "";

-- ============================================================================
-- 1. MIGRATION 000 — Tables de base (27 tables Prisma)
-- ============================================================================
SELECT '' AS "";
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' AS "";
SELECT '  MIGRATION 000 — Tables de base (27 tables attendues)' AS "SECTION";
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' AS "";

SELECT
  unnest(ARRAY[
    'organizations', 'profiles', 'organization_members', 'sessions',
    'departments', 'documents', 'electronic_signatures',
    'document_prerequisites', 'document_triggers', 'document_relationships',
    'document_code_sequences', 'form_templates', 'form_instances',
    'capas', 'non_conformances', 'deviations', 'change_controls',
    'audits', 'risks', 'training', 'batch_records', 'suppliers',
    'audit_trails', 'record_type_definitions', 'record_links',
    'custom_field_definitions', 'scheduled_reports'
  ]) AS table_name,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t.table_name)
    THEN '✅ OK'
    ELSE '❌ MANQUANTE'
  END AS status
FROM (SELECT unnest(ARRAY[
    'organizations', 'profiles', 'organization_members', 'sessions',
    'departments', 'documents', 'electronic_signatures',
    'document_prerequisites', 'document_triggers', 'document_relationships',
    'document_code_sequences', 'form_templates', 'form_instances',
    'capas', 'non_conformances', 'deviations', 'change_controls',
    'audits', 'risks', 'training', 'batch_records', 'suppliers',
    'audit_trails', 'record_type_definitions', 'record_links',
    'custom_field_definitions', 'scheduled_reports'
  ]) AS table_name) t
ORDER BY
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t.table_name)
    THEN 0 ELSE 1
  END,
  t.table_name;

-- Compteur résumé 000
SELECT
  (SELECT count(*) FROM (SELECT unnest(ARRAY[
    'organizations', 'profiles', 'organization_members', 'sessions',
    'departments', 'documents', 'electronic_signatures',
    'document_prerequisites', 'document_triggers', 'document_relationships',
    'document_code_sequences', 'form_templates', 'form_instances',
    'capas', 'non_conformances', 'deviations', 'change_controls',
    'audits', 'risks', 'training', 'batch_records', 'suppliers',
    'audit_trails', 'record_type_definitions', 'record_links',
    'custom_field_definitions', 'scheduled_reports'
  ]) AS tbl) sub
  WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=sub.tbl))
  AS tables_presentes,
  27 AS tables_attendues,
  CASE
    WHEN (SELECT count(*) FROM (SELECT unnest(ARRAY[
      'organizations', 'profiles', 'organization_members', 'sessions',
      'departments', 'documents', 'electronic_signatures',
      'document_prerequisites', 'document_triggers', 'document_relationships',
      'document_code_sequences', 'form_templates', 'form_instances',
      'capas', 'non_conformances', 'deviations', 'change_controls',
      'audits', 'risks', 'training', 'batch_records', 'suppliers',
      'audit_trails', 'record_type_definitions', 'record_links',
      'custom_field_definitions', 'scheduled_reports'
    ]) AS tbl) sub
    WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=sub.tbl)) = 27
    THEN '✅ COMPLÈTE'
    ELSE '❌ INCOMPLÈTE'
  END AS statut_000;


-- ============================================================================
-- 1b. TABLE CRITIQUE : audit_config (requise par 003)
-- ============================================================================
SELECT '' AS "";
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' AS "";
SELECT '  TABLE CRITIQUE — audit_config (requise par triggers audit)' AS "SECTION";
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' AS "";

SELECT
  'audit_config' AS table_name,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='audit_config')
    THEN '✅ OK'
    ELSE '❌ MANQUANTE — les fonctions de hash audit échoueront'
  END AS status;

-- Vérifier si la ligne singleton existe et a un signing_salt
SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM audit_config WHERE id='singleton')
    THEN '✅ Ligne singleton présente'
    ELSE '❌ Pas de ligne singleton — compute_audit_hash utilisera le sel par défaut'
  END AS audit_config_data;


-- ============================================================================
-- 2. MIGRATION 002 — Extension + Fonctions Helper
-- ============================================================================
SELECT '' AS "";
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' AS "";
SELECT '  MIGRATION 002 — Fonctions Helper (6 attendues)' AS "SECTION";
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' AS "";

SELECT
  unnest(ARRAY[
    'current_profile_id', 'is_org_member', 'is_org_admin',
    'current_org_id', 'create_std_rls', 'create_organization_for_user'
  ]) AS function_name,
  CASE
    WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
                 WHERE n.nspname='public' AND p.proname=f.function_name)
    THEN '✅ OK'
    ELSE '❌ MANQUANTE'
  END AS status
FROM (SELECT unnest(ARRAY[
    'current_profile_id', 'is_org_member', 'is_org_admin',
    'current_org_id', 'create_std_rls', 'create_organization_for_user'
  ]) AS function_name) f
ORDER BY
  CASE
    WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
                 WHERE n.nspname='public' AND p.proname=f.function_name)
    THEN 0 ELSE 1
  END,
  f.function_name;


-- ============================================================================
-- 2b. MIGRATION 002 — Extension pgcrypto
-- ============================================================================
SELECT '' AS "";
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' AS "";
SELECT '  EXTENSION — pgcrypto' AS "SECTION";
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' AS "";

SELECT
  'pgcrypto' AS extension_name,
  CASE
    WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname='pgcrypto')
    THEN '✅ INSTALLÉE'
    ELSE '❌ MANQUANTE — les fonctions crypto ne fonctionneront pas'
  END AS status;


-- ============================================================================
-- 2c. MIGRATION 002 — RLS activé sur 27 tables
-- ============================================================================
SELECT '' AS "";
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' AS "";
SELECT '  MIGRATION 002 — RLS activé (27 tables attendues)' AS "SECTION";
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' AS "";

SELECT
  t.table_name,
  CASE
    WHEN EXISTS (SELECT 1 FROM pg_policies WHERE tablename=t.table_name AND schemaname='public')
    THEN '✅ RLS ON + ' || (SELECT count(*) FROM pg_policies WHERE tablename=t.table_name AND schemaname='public') || ' politique(s)'
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t.table_name
                 AND rowsecurity=true)
    THEN '⚠️ RLS activé mais AUCUNE politique'
    ELSE '❌ RLS non activé'
  END AS rls_status
FROM (SELECT unnest(ARRAY[
    'organizations', 'profiles', 'organization_members', 'sessions',
    'departments', 'documents', 'electronic_signatures',
    'document_prerequisites', 'document_triggers', 'document_relationships',
    'document_code_sequences', 'form_templates', 'form_instances',
    'capas', 'non_conformances', 'deviations', 'change_controls',
    'audits', 'risks', 'training', 'batch_records', 'suppliers',
    'audit_trails', 'record_type_definitions', 'record_links',
    'custom_field_definitions', 'scheduled_reports'
  ]) AS table_name) t
ORDER BY
  CASE
    WHEN EXISTS (SELECT 1 FROM pg_policies WHERE tablename=t.table_name AND schemaname='public')
    THEN 0
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t.table_name
                 AND rowsecurity=true)
    THEN 1
    ELSE 2
  END,
  t.table_name;

-- Compteur RLS
SELECT
  (SELECT count(*) FROM (SELECT unnest(ARRAY[
    'organizations', 'profiles', 'organization_members', 'sessions',
    'departments', 'documents', 'electronic_signatures',
    'document_prerequisites', 'document_triggers', 'document_relationships',
    'document_code_sequences', 'form_templates', 'form_instances',
    'capas', 'non_conformances', 'deviations', 'change_controls',
    'audits', 'risks', 'training', 'batch_records', 'suppliers',
    'audit_trails', 'record_type_definitions', 'record_links',
    'custom_field_definitions', 'scheduled_reports'
  ]) AS tbl) sub
  WHERE EXISTS (SELECT 1 FROM pg_policies WHERE tablename=sub.tbl AND schemaname='public'))
  AS tables_avec_politiques,
  27 AS tables_attendues;


-- ============================================================================
-- 3. MIGRATION 003 — Fonctions Audit Blockchain
-- ============================================================================
SELECT '' AS "";
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' AS "";
SELECT '  MIGRATION 003 — Fonctions Audit (5 attendues)' AS "SECTION";
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' AS "";

SELECT
  unnest(ARRAY[
    'log_audit_trail', 'compute_audit_hash',
    'block_audit_trails_modification', 'verify_audit_integrity',
    'enforce_maker_checker'
  ]) AS function_name,
  CASE
    WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
                 WHERE n.nspname='public' AND p.proname=f.function_name)
    THEN '✅ OK'
    ELSE '❌ MANQUANTE'
  END AS status
FROM (SELECT unnest(ARRAY[
    'log_audit_trail', 'compute_audit_hash',
    'block_audit_trails_modification', 'verify_audit_integrity',
    'enforce_maker_checker'
  ]) AS function_name) f
ORDER BY
  CASE
    WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
                 WHERE n.nspname='public' AND p.proname=f.function_name)
    THEN 0 ELSE 1
  END,
  f.function_name;


-- ============================================================================
-- 3b. MIGRATION 003 — Triggers Audit
-- ============================================================================
SELECT '' AS "";
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' AS "";
SELECT '  MIGRATION 003 — Triggers Audit' AS "SECTION";
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' AS "";

-- Triggers d'audit sur les 25 tables métier
SELECT
  t.table_name || ': trg_audit_' || t.table_name AS trigger_name,
  CASE
    WHEN EXISTS (SELECT 1 FROM pg_trigger t2 JOIN pg_class c ON c.oid=t2.tgrelid
                 JOIN pg_namespace n ON n.oid=c.relnamespace
                 WHERE n.nspname='public' AND c.relname=t.table_name
                   AND t2.tgname='trg_audit_' || t.table_name)
    THEN '✅ OK'
    ELSE '❌ MANQUANT'
  END AS status
FROM (SELECT unnest(ARRAY[
    'organizations', 'profiles', 'organization_members',
    'departments', 'documents', 'electronic_signatures',
    'document_prerequisites', 'document_triggers', 'document_relationships',
    'document_code_sequences', 'form_templates', 'form_instances',
    'capas', 'non_conformances', 'deviations', 'change_controls',
    'audits', 'risks', 'training', 'batch_records', 'suppliers',
    'record_type_definitions', 'record_links',
    'custom_field_definitions', 'scheduled_reports'
  ]) AS table_name) t
ORDER BY
  CASE
    WHEN EXISTS (SELECT 1 FROM pg_trigger t2 JOIN pg_class c ON c.oid=t2.tgrelid
                 JOIN pg_namespace n ON n.oid=c.relnamespace
                 WHERE n.nspname='public' AND c.relname=t.table_name
                   AND t2.tgname='trg_audit_' || t.table_name)
    THEN 0 ELSE 1
  END;

-- Triggers spéciaux d'audit (hash + immuabilité)
SELECT '' AS "";
SELECT 'Triggers spéciaux audit:' AS "";

SELECT
  unnest(ARRAY[
    'trg_compute_audit_hash',
    'trg_block_audit_update',
    'trg_block_audit_delete'
  ]) AS trigger_name,
  CASE
    WHEN EXISTS (SELECT 1 FROM pg_trigger t2 JOIN pg_class c ON c.oid=t2.tgrelid
                 JOIN pg_namespace n ON n.oid=c.relnamespace
                 WHERE n.nspname='public' AND t2.tgname=tr.trigger_name)
    THEN '✅ OK'
    ELSE '❌ MANQUANT'
  END AS status
FROM (SELECT unnest(ARRAY[
    'trg_compute_audit_hash',
    'trg_block_audit_update',
    'trg_block_audit_delete'
  ]) AS trigger_name) tr;


-- ============================================================================
-- 4. MIGRATION 004 — Fonctions RPC (4 attendues)
-- ============================================================================
SELECT '' AS "";
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' AS "";
SELECT '  MIGRATION 004 — Fonctions RPC (4 attendues)' AS "SECTION";
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' AS "";

SELECT
  unnest(ARRAY[
    'set_user_context', 'validate_status_transition',
    'get_upcoming_deadlines', 'get_org_compliance_score'
  ]) AS function_name,
  CASE
    WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
                 WHERE n.nspname='public' AND p.proname=f.function_name)
    THEN '✅ OK'
    ELSE '❌ MANQUANTE'
  END AS status
FROM (SELECT unnest(ARRAY[
    'set_user_context', 'validate_status_transition',
    'get_upcoming_deadlines', 'get_org_compliance_score'
  ]) AS function_name) f
ORDER BY
  CASE
    WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
                 WHERE n.nspname='public' AND p.proname=f.function_name)
    THEN 0 ELSE 1
  END,
  f.function_name;


-- ============================================================================
-- 4b. MIGRATION 004 — Vues (5 attendues)
-- ============================================================================
SELECT '' AS "";
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' AS "";
SELECT '  MIGRATION 004 — Vues (5 attendues)' AS "SECTION";
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' AS "";

SELECT
  unnest(ARRAY[
    'v_current_user', 'v_org_dashboard', 'document_hierarchy',
    'document_trigger_graph', 'record_type_usage'
  ]) AS view_name,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.views
                 WHERE table_schema='public' AND table_name=v.view_name)
    THEN '✅ OK'
    ELSE '❌ MANQUANTE'
  END AS status
FROM (SELECT unnest(ARRAY[
    'v_current_user', 'v_org_dashboard', 'document_hierarchy',
    'document_trigger_graph', 'record_type_usage'
  ]) AS view_name) v
ORDER BY
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.views
                 WHERE table_schema='public' AND table_name=v.view_name)
    THEN 0 ELSE 1
  END,
  v.view_name;

-- Vérifier si les vues sont VALIDES (pas cassées par un nom de colonne incorrect)
SELECT '' AS "";
SELECT 'Validité des vues (test de compilation):' AS "";

SELECT
  v.view_name,
  CASE
    WHEN v.view_name IN (
      SELECT c.relname::text
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relkind = 'v'
        AND NOT EXISTS (
          SELECT 1 FROM pg_depend d
          JOIN pg_rewrite r ON r.oid = d.objid
          JOIN pg_class rc ON rc.oid = r.ev_class
          WHERE d.refobjid = c.oid
        )
    ) THEN '⚠️ Dépendances cassées possible'
    ELSE CASE
      WHEN EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = v.view_name AND c.relkind = 'v'
      ) THEN '✅ Existe (requiert un SELECT pour valider)'
      ELSE '❌ Inexistant'
    END
  END AS validity
FROM (SELECT unnest(ARRAY[
    'v_current_user', 'v_org_dashboard', 'document_hierarchy',
    'document_trigger_graph', 'record_type_usage'
  ]) AS view_name) v;


-- ============================================================================
-- 4c. MIGRATION 004 — Triggers Maker-Checker + Validation Formulaires
-- ============================================================================
SELECT '' AS "";
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' AS "";
SELECT '  MIGRATION 004 — Triggers Maker-Checker (9 tables)' AS "SECTION";
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' AS "";

SELECT
  t.table_name,
  'trg_maker_checker_' || t.table_name AS expected_trigger,
  CASE
    WHEN EXISTS (SELECT 1 FROM pg_trigger tg
                 JOIN pg_class c ON c.oid=tg.tgrelid
                 JOIN pg_namespace n ON n.oid=c.relnamespace
                 WHERE n.nspname='public'
                   AND c.relname=t.table_name
                   AND tg.tgname = 'trg_maker_checker_' || t.table_name)
    THEN '✅ OK'
    ELSE '❌ MANQUANT'
  END AS status,
  CASE
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns
                     WHERE table_name=t.table_name AND column_name='approved_by_id')
    THEN '⚠️ Pas de colonne approved_by_id — trigger impossible'
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns
                     WHERE table_name=t.table_name AND column_name='created_by_id')
    THEN '⚠️ Pas de colonne created_by_id — trigger impossible'
    ELSE ''
  END AS note
FROM (SELECT unnest(ARRAY[
    'capas', 'non_conformances', 'deviations', 'change_controls',
    'audits', 'risks', 'suppliers', 'batch_records', 'documents'
  ]) AS table_name) t
ORDER BY t.table_name;

-- Trigger validation formulaires
SELECT '' AS "";
SELECT 'Trigger validation formulaires:' AS "";

SELECT
  'trg_validate_instance_values' AS trigger_name,
  CASE
    WHEN EXISTS (SELECT 1 FROM pg_trigger tg
                 JOIN pg_class c ON c.oid=tg.tgrelid
                 JOIN pg_namespace n ON n.oid=c.relnamespace
                 WHERE n.nspname='public'
                   AND c.relname='form_instances'
                   AND tg.tgname='trg_validate_instance_values')
    THEN '✅ OK'
    ELSE '❌ MANQUANT'
  END AS status;

-- Fonctions trigger 004
SELECT '' AS "";
SELECT 'Fonctions trigger 004:' AS "";

SELECT
  unnest(ARRAY['enforce_maker_checker_qms', 'validate_instance_values']) AS function_name,
  CASE
    WHEN EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
                 WHERE n.nspname='public' AND p.proname=f.function_name)
    THEN '✅ OK'
    ELSE '❌ MANQUANTE'
  END AS status
FROM (SELECT unnest(ARRAY['enforce_maker_checker_qms', 'validate_instance_values']) AS function_name) f;


-- ============================================================================
-- 5. VÉRIFICATION DES BUGS 005 — Noms de colonnes critiques
-- ============================================================================
SELECT '' AS "";
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' AS "";
SELECT '  VÉRIFICATION COLONNES CRITIQUES (bugs 005)' AS "SECTION";
SELECT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' AS "";

-- Les colonnes camelCase attendues par Prisma (dans le SQL 000)
-- Si 004 a été exécuté AVANT correction, les fonctions/vues peuvent pointer
-- vers de mauvais noms de colonnes

SELECT
  'record_type_definitions' AS table_name,
  'statusFlowJson' AS expected_column,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='record_type_definitions' AND column_name='statusFlowJson')
    THEN '✅ Présente (camelCase Prisma)'
    WHEN EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='record_type_definitions' AND column_name='status_flow_json')
    THEN '⚠️ Présente en snake_case — incohérent avec 004'
    ELSE '❌ ABSENTE'
  END AS status;

SELECT
  'record_type_definitions' AS table_name,
  'defaultFieldsJson' AS expected_column,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='record_type_definitions' AND column_name='defaultFieldsJson')
    THEN '✅ OK'
    ELSE '❌ ABSENTE'
  END AS status;

SELECT
  'form_templates' AS table_name,
  'fieldsJson' AS expected_column,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='form_templates' AND column_name='fieldsJson')
    THEN '✅ Présente (camelCase Prisma)'
    WHEN EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='form_templates' AND column_name='fields_json')
    THEN '⚠️ Présente en snake_case — validate_instance_values échouera'
    ELSE '❌ ABSENTE'
  END AS status;

SELECT
  'form_instances' AS table_name,
  'values_json' AS expected_column,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='form_instances' AND column_name='values_json')
    THEN '✅ OK'
    WHEN EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='form_instances' AND column_name='instance_values')
    THEN '⚠️ Nom alternatif instance_values — 004 attend values_json'
    ELSE '❌ ABSENTE'
  END AS status;

SELECT
  'form_instances' AS table_name,
  'template_id' AS expected_column,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='form_instances' AND column_name='template_id')
    THEN '✅ OK'
    WHEN EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='form_instances' AND column_name='form_template_id')
    THEN '⚠️ Nom alternatif form_template_id — 004 attend template_id'
    ELSE '❌ ABSENTE'
  END AS status;

SELECT
  'document_triggers' AS table_name,
  'target_document_id' AS expected_column,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='document_triggers' AND column_name='target_document_id')
    THEN '✅ OK'
    WHEN EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='document_triggers' AND column_name='activated_document_id')
    THEN '⚠️ Ancien nom activated_document_id — vue document_trigger_graph cassée'
    ELSE '❌ ABSENTE'
  END AS status;

-- Vérification critique: est-ce que les fonctions 004 référencent les bons noms de colonnes ?
SELECT '' AS "";
SELECT '───────────────────────────────────────────────────────────────────────' AS "";
SELECT 'TEST DE VALIDATION DES FONCTIONS 004 (test d''appel)' AS "";
SELECT '───────────────────────────────────────────────────────────────────────' AS "";

-- Test: la vue record_type_usage peut-elle être queryée ?
DO $$
DECLARE
  v_err TEXT;
  v_count INT;
BEGIN
  BEGIN
    EXECUTE 'SELECT count(*) FROM record_type_usage' INTO v_count;
    RAISE NOTICE '✅ record_type_usage: VALID (count=%)', v_count;
  EXCEPTION WHEN OTHERS THEN
    v_err := SQLERRM;
    RAISE NOTICE '❌ record_type_usage: ERREUR — %', v_err;
  END;
END $$;

-- Test: la vue document_trigger_graph peut-elle être queryée ?
DO $$
DECLARE
  v_err TEXT;
  v_count INT;
BEGIN
  BEGIN
    EXECUTE 'SELECT count(*) FROM document_trigger_graph' INTO v_count;
    RAISE NOTICE '✅ document_trigger_graph: VALID (count=%)', v_count;
  EXCEPTION WHEN OTHERS THEN
    v_err := SQLERRM;
    RAISE NOTICE '❌ document_trigger_graph: ERREUR — %', v_err;
  END;
END $$;

-- Test: la vue document_hierarchy peut-elle être queryée ?
DO $$
DECLARE
  v_err TEXT;
  v_count INT;
BEGIN
  BEGIN
    EXECUTE 'SELECT count(*) FROM document_hierarchy' INTO v_count;
    RAISE NOTICE '✅ document_hierarchy: VALID (count=%)', v_count;
  EXCEPTION WHEN OTHERS THEN
    v_err := SQLERRM;
    RAISE NOTICE '❌ document_hierarchy: ERREUR — %', v_err;
  END;
END $$;

-- Test: la vue v_org_dashboard peut-elle être queryée ?
DO $$
DECLARE
  v_err TEXT;
  v_count INT;
BEGIN
  BEGIN
    EXECUTE 'SELECT count(*) FROM v_org_dashboard' INTO v_count;
    RAISE NOTICE '✅ v_org_dashboard: VALID (count=%)', v_count;
  EXCEPTION WHEN OTHERS THEN
    v_err := SQLERRM;
    RAISE NOTICE '❌ v_org_dashboard: ERREUR — %', v_err;
  END;
END $$;

-- Test: la vue v_current_user peut-elle être queryée ?
DO $$
DECLARE
  v_err TEXT;
  v_count INT;
BEGIN
  BEGIN
    EXECUTE 'SELECT count(*) FROM v_current_user' INTO v_count;
    RAISE NOTICE '✅ v_current_user: VALID (count=%)', v_count;
  EXCEPTION WHEN OTHERS THEN
    v_err := SQLERRM;
    RAISE NOTICE '❌ v_current_user: ERREUR — %', v_err;
  END;
END $$;

-- Test: la fonction get_org_compliance_score peut-elle être appelée ?
DO $$
DECLARE
  v_err TEXT;
  v_score NUMERIC;
BEGIN
  BEGIN
    -- Appel avec un UUID factice — on s'attend à 0 résultats, pas à une erreur de compilation
    PERFORM get_org_compliance_score('00000000-0000-0000-0000-000000000000');
    RAISE NOTICE '✅ get_org_compliance_score: FONCTION VALID (compilation OK)';
  EXCEPTION WHEN OTHERS THEN
    v_err := SQLERRM;
    -- Différencier erreur de compilation vs erreur de données
    IF v_err LIKE '%does not exist%' OR v_err LIKE '%column%' OR v_err LIKE '%relation%' THEN
      RAISE NOTICE '❌ get_org_compliance_score: ERREUR DE STRUCTURE — %', v_err;
    ELSE
      RAISE NOTICE '✅ get_org_compliance_score: FONCTION VALIDE (erreur données normale: %)', v_err;
    END IF;
  END;
END $$;

-- Test: la fonction validate_status_transition compile-t-elle ?
DO $$
DECLARE
  v_err TEXT;
  v_result BOOLEAN;
BEGIN
  BEGIN
    PERFORM validate_status_transition('capa', 'Open', 'In Progress', '00000000-0000-0000-0000-000000000000');
    RAISE NOTICE '✅ validate_status_transition: FONCTION VALID (compilation OK)';
  EXCEPTION WHEN OTHERS THEN
    v_err := SQLERRM;
    IF v_err LIKE '%does not exist%' OR v_err LIKE '%column%' OR v_err LIKE '%relation%' THEN
      RAISE NOTICE '❌ validate_status_transition: ERREUR DE STRUCTURE — %', v_err;
    ELSE
      RAISE NOTICE '✅ validate_status_transition: FONCTION VALIDE (erreur données normale: %)', v_err;
    END IF;
  END;
END $$;


-- ============================================================================
-- 6. RÉSUMÉ FINAL — SCORE PAR MIGRATION
-- ============================================================================
SELECT '' AS "";
SELECT '═══════════════════════════════════════════════════════════════════' AS "";
SELECT '  RÉSUMÉ FINAL PAR MIGRATION' AS "RÉSUMÉ";
SELECT '═══════════════════════════════════════════════════════════════════' AS "";

-- 000: Tables
SELECT
  '000 — Tables de base' AS migration,
  (SELECT count(*) FROM (SELECT unnest(ARRAY[
    'organizations', 'profiles', 'organization_members', 'sessions',
    'departments', 'documents', 'electronic_signatures',
    'document_prerequisites', 'document_triggers', 'document_relationships',
    'document_code_sequences', 'form_templates', 'form_instances',
    'capas', 'non_conformances', 'deviations', 'change_controls',
    'audits', 'risks', 'training', 'batch_records', 'suppliers',
    'audit_trails', 'record_type_definitions', 'record_links',
    'custom_field_definitions', 'scheduled_reports'
  ]) AS tbl) sub
  WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=sub.tbl))
  || '/27 tables' AS detail,
  CASE
    WHEN (SELECT count(*) FROM (SELECT unnest(ARRAY[
      'organizations', 'profiles', 'organization_members', 'sessions',
      'departments', 'documents', 'electronic_signatures',
      'document_prerequisites', 'document_triggers', 'document_relationships',
      'document_code_sequences', 'form_templates', 'form_instances',
      'capas', 'non_conformances', 'deviations', 'change_controls',
      'audits', 'risks', 'training', 'batch_records', 'suppliers',
      'audit_trails', 'record_type_definitions', 'record_links',
      'custom_field_definitions', 'scheduled_reports'
    ]) AS tbl) sub
    WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=sub.tbl)) = 27
    THEN '✅ COMPLÈTE'
    ELSE '❌ INCOMPLÈTE'
  END AS statut;

-- 000b: audit_config
SELECT
  '000b — audit_config' AS migration,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='audit_config')
  THEN '✅ Présente'
  ELSE '❌ MANQUANTE' END AS detail,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='audit_config')
  THEN '✅'
  ELSE '❌ CRITIQUE' END AS statut;

-- 002: Helper functions
SELECT
  '002 — Fonctions Helper' AS migration,
  (SELECT count(*) FROM (SELECT unnest(ARRAY[
    'current_profile_id', 'is_org_member', 'is_org_admin',
    'current_org_id', 'create_std_rls', 'create_organization_for_user'
  ]) AS fn) sub
  WHERE EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
               WHERE n.nspname='public' AND p.proname=sub.fn))
  || '/6 fonctions' AS detail,
  CASE
    WHEN (SELECT count(*) FROM (SELECT unnest(ARRAY[
      'current_profile_id', 'is_org_member', 'is_org_admin',
      'current_org_id', 'create_std_rls', 'create_organization_for_user'
    ]) AS fn) sub
    WHERE EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
                 WHERE n.nspname='public' AND p.proname=sub.fn)) = 6
    THEN '✅ COMPLÈTE'
    ELSE '❌ INCOMPLÈTE'
  END AS statut;

-- 002: RLS
SELECT
  '002 — RLS Policies' AS migration,
  (SELECT count(*) FROM (SELECT unnest(ARRAY[
    'organizations', 'profiles', 'organization_members', 'sessions',
    'departments', 'documents', 'electronic_signatures',
    'document_prerequisites', 'document_triggers', 'document_relationships',
    'document_code_sequences', 'form_templates', 'form_instances',
    'capas', 'non_conformances', 'deviations', 'change_controls',
    'audits', 'risks', 'training', 'batch_records', 'suppliers',
    'audit_trails', 'record_type_definitions', 'record_links',
    'custom_field_definitions', 'scheduled_reports'
  ]) AS tbl) sub
  WHERE EXISTS (SELECT 1 FROM pg_policies WHERE tablename=sub.tbl AND schemaname='public'))
  || '/27 tables protégées' AS detail,
  CASE
    WHEN (SELECT count(*) FROM (SELECT unnest(ARRAY[
      'organizations', 'profiles', 'organization_members', 'sessions',
      'departments', 'documents', 'electronic_signatures',
      'document_prerequisites', 'document_triggers', 'document_relationships',
      'document_code_sequences', 'form_templates', 'form_instances',
      'capas', 'non_conformances', 'deviations', 'change_controls',
      'audits', 'risks', 'training', 'batch_records', 'suppliers',
      'audit_trails', 'record_type_definitions', 'record_links',
      'custom_field_definitions', 'scheduled_reports'
    ]) AS tbl) sub
    WHERE EXISTS (SELECT 1 FROM pg_policies WHERE tablename=sub.tbl AND schemaname='public')) = 27
    THEN '✅ COMPLÈTE'
    ELSE '❌ INCOMPLÈTE'
  END AS statut;

-- 003: Audit functions
SELECT
  '003 — Fonctions Audit' AS migration,
  (SELECT count(*) FROM (SELECT unnest(ARRAY[
    'log_audit_trail', 'compute_audit_hash',
    'block_audit_trails_modification', 'verify_audit_integrity',
    'enforce_maker_checker'
  ]) AS fn) sub
  WHERE EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
               WHERE n.nspname='public' AND p.proname=sub.fn))
  || '/5 fonctions' AS detail,
  CASE
    WHEN (SELECT count(*) FROM (SELECT unnest(ARRAY[
      'log_audit_trail', 'compute_audit_hash',
      'block_audit_trails_modification', 'verify_audit_integrity',
      'enforce_maker_checker'
    ]) AS fn) sub
    WHERE EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
                 WHERE n.nspname='public' AND p.proname=sub.fn)) = 5
    THEN '✅ COMPLÈTE'
    ELSE '❌ INCOMPLÈTE'
  END AS statut;

-- 003: Audit triggers
SELECT
  '003 — Triggers Audit (25 tables + 3 spéciaux)' AS migration,
  (SELECT count(*) FROM (SELECT unnest(ARRAY[
    'organizations', 'profiles', 'organization_members',
    'departments', 'documents', 'electronic_signatures',
    'document_prerequisites', 'document_triggers', 'document_relationships',
    'document_code_sequences', 'form_templates', 'form_instances',
    'capas', 'non_conformances', 'deviations', 'change_controls',
    'audits', 'risks', 'training', 'batch_records', 'suppliers',
    'record_type_definitions', 'record_links',
    'custom_field_definitions', 'scheduled_reports'
  ]) AS tbl) sub
  WHERE EXISTS (SELECT 1 FROM pg_trigger tg
               JOIN pg_class c ON c.oid=tg.tgrelid
               JOIN pg_namespace n ON n.oid=c.relnamespace
               WHERE n.nspname='public' AND c.relname=sub.tbl
                 AND tg.tgname='trg_audit_' || sub.tbl))
  || '/25 triggers tables + ' ||
  (SELECT count(*) FROM (SELECT unnest(ARRAY[
    'trg_compute_audit_hash', 'trg_block_audit_update', 'trg_block_audit_delete'
  ]) AS tr) sub
  WHERE EXISTS (SELECT 1 FROM pg_trigger tg
               JOIN pg_class c ON c.oid=tg.tgrelid
               JOIN pg_namespace n ON n.oid=c.relnamespace
               WHERE n.nspname='public' AND tg.tgname=sub.tr))
  || '/3 spéciaux' AS detail,
  CASE
    WHEN (SELECT count(*) FROM (SELECT unnest(ARRAY[
      'organizations', 'profiles', 'organization_members',
      'departments', 'documents', 'electronic_signatures',
      'document_prerequisites', 'document_triggers', 'document_relationships',
      'document_code_sequences', 'form_templates', 'form_instances',
      'capas', 'non_conformances', 'deviations', 'change_controls',
      'audits', 'risks', 'training', 'batch_records', 'suppliers',
      'record_type_definitions', 'record_links',
      'custom_field_definitions', 'scheduled_reports'
    ]) AS tbl) sub
    WHERE EXISTS (SELECT 1 FROM pg_trigger tg
                 JOIN pg_class c ON c.oid=tg.tgrelid
                 JOIN pg_namespace n ON n.oid=c.relnamespace
                 WHERE n.nspname='public' AND c.relname=sub.tbl
                   AND tg.tgname='trg_audit_' || sub.tbl)) = 25
    AND (SELECT count(*) FROM (SELECT unnest(ARRAY[
      'trg_compute_audit_hash', 'trg_block_audit_update', 'trg_block_audit_delete'
    ]) AS tr) sub
    WHERE EXISTS (SELECT 1 FROM pg_trigger tg
                 JOIN pg_class c ON c.oid=tg.tgrelid
                 JOIN pg_namespace n ON n.oid=c.relnamespace
                 WHERE n.nspname='public' AND tg.tgname=sub.tr)) = 3
    THEN '✅ COMPLÈTE'
    ELSE '❌ INCOMPLÈTE'
  END AS statut;

-- 004: RPCs
SELECT
  '004 — Fonctions RPC' AS migration,
  (SELECT count(*) FROM (SELECT unnest(ARRAY[
    'set_user_context', 'validate_status_transition',
    'get_upcoming_deadlines', 'get_org_compliance_score'
  ]) AS fn) sub
  WHERE EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
               WHERE n.nspname='public' AND p.proname=sub.fn))
  || '/4 fonctions' AS detail,
  CASE
    WHEN (SELECT count(*) FROM (SELECT unnest(ARRAY[
      'set_user_context', 'validate_status_transition',
      'get_upcoming_deadlines', 'get_org_compliance_score'
    ]) AS fn) sub
    WHERE EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
                 WHERE n.nspname='public' AND p.proname=sub.fn)) = 4
    THEN '✅ COMPLÈTE'
    ELSE '❌ INCOMPLÈTE'
  END AS statut;

-- 004: Vues
SELECT
  '004 — Vues' AS migration,
  (SELECT count(*) FROM (SELECT unnest(ARRAY[
    'v_current_user', 'v_org_dashboard', 'document_hierarchy',
    'document_trigger_graph', 'record_type_usage'
  ]) AS v) sub
  WHERE EXISTS (SELECT 1 FROM information_schema.views
               WHERE table_schema='public' AND table_name=sub.v))
  || '/5 vues (existance seule)' AS detail,
  CASE
    WHEN (SELECT count(*) FROM (SELECT unnest(ARRAY[
      'v_current_user', 'v_org_dashboard', 'document_hierarchy',
      'document_trigger_graph', 'record_type_usage'
    ]) AS v) sub
    WHERE EXISTS (SELECT 1 FROM information_schema.views
                 WHERE table_schema='public' AND table_name=sub.v)) = 5
    THEN '⚠️ VÉRIFIER les tests SELECT ci-dessus'
    ELSE '❌ INCOMPLÈTE'
  END AS statut;

-- 004: Triggers maker-checker
SELECT
  '004 — Triggers Maker-Checker' AS migration,
  'Créé dynamiquement (seulement si colonnes présentes)' AS detail,
  'Voir détail section 4c ci-dessus' AS statut;

-- ============================================================================
-- FIN — Message d'action
-- ============================================================================
SELECT '' AS "";
SELECT '═══════════════════════════════════════════════════════════════════' AS "";
SELECT '  ACTION RECOMMANDÉE' AS "";
SELECT '═══════════════════════════════════════════════════════════════════' AS "";

SELECT
  CASE
    -- Si tout est OK
    WHEN
      (SELECT count(*) FROM (SELECT unnest(ARRAY[
        'organizations', 'profiles', 'organization_members', 'sessions',
        'departments', 'documents', 'electronic_signatures',
        'document_prerequisites', 'document_triggers', 'document_relationships',
        'document_code_sequences', 'form_templates', 'form_instances',
        'capas', 'non_conformances', 'deviations', 'change_controls',
        'audits', 'risks', 'training', 'batch_records', 'suppliers',
        'audit_trails', 'record_type_definitions', 'record_links',
        'custom_field_definitions', 'scheduled_reports'
      ]) AS tbl) sub
      WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=sub.tbl)) = 27
      AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='audit_config')
      AND (SELECT count(*) FROM (SELECT unnest(ARRAY[
        'current_profile_id', 'is_org_member', 'is_org_admin',
        'current_org_id', 'create_std_rls', 'create_organization_for_user'
      ]) AS fn) sub
      WHERE EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
                   WHERE n.nspname='public' AND p.proname=sub.fn)) = 6
      AND (SELECT count(*) FROM (SELECT unnest(ARRAY[
        'log_audit_trail', 'compute_audit_hash',
        'block_audit_trails_modification', 'verify_audit_integrity',
        'enforce_maker_checker'
      ]) AS fn) sub
      WHERE EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
                   WHERE n.nspname='public' AND p.proname=sub.fn)) = 5
      AND (SELECT count(*) FROM (SELECT unnest(ARRAY[
        'set_user_context', 'validate_status_transition',
        'get_upcoming_deadlines', 'get_org_compliance_score'
      ]) AS fn) sub
      WHERE EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
                   WHERE n.nspname='public' AND p.proname=sub.fn)) = 4
      AND (SELECT count(*) FROM (SELECT unnest(ARRAY[
        'v_current_user', 'v_org_dashboard', 'document_hierarchy',
        'document_trigger_graph', 'record_type_usage'
      ]) AS v) sub
      WHERE EXISTS (SELECT 1 FROM information_schema.views
                   WHERE table_schema='public' AND table_name=sub.v)) = 5
    THEN '✅ Toutes les migrations semblent appliquées. Vérifier les tests SELECT de vues.'
    ELSE '❌ Des éléments manquent. Référez-vous aux sections ❌ ci-dessus pour identifier les fichiers à réexécuter.'
  END AS recommandation;