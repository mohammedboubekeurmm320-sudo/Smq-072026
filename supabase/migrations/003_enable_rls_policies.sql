-- ============================================================================
-- Migration 003 : Enable Row Level Security (RLS) on all 16 tables
-- ============================================================================
-- Corrective action per Security Re-Audit #REAUDIT-2026-0627
-- Fixes: 16/18 tables without RLS read protection (CRITIQUE)
--
-- This migration:
--   1. Enables RLS on every data table (anon key blocked by default)
--   2. Creates SELECT policies for role "authenticated"
--   3. Creates INSERT/UPDATE/DELETE policies for role "authenticated"
--   4. Drops existing conflicting policies on profiles/organizations if any
--
-- Prerequisite: Migration 001 and 002 must be applied first.
-- Execute in Supabase SQL Editor with service_role key.
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Enable Row Level Security on all 16 data tables
-- ============================================================================

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE non_conformances ENABLE ROW LEVEL SECURITY;
ALTER TABLE capas ENABLE ROW LEVEL SECURITY;
ALTER TABLE audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE training ENABLE ROW LEVEL SECURITY;
ALTER TABLE deviations ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_trail ENABLE ROW LEVEL SECURITY;
ALTER TABLE electronic_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_hierarchy ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 2: Clean up any broken existing policies on profiles/organizations
-- (Error 42P17 — recursive policy detected during re-audit)
-- ============================================================================

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (tablename = 'profiles' OR tablename = 'organizations')
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- Enable RLS on profiles and organizations (views/tables)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 3: Create SELECT policies for "authenticated" role — all 18 tables
-- ============================================================================

-- documents
CREATE POLICY "auth_select_documents" ON documents
  FOR SELECT TO authenticated USING (true);

-- non_conformances
CREATE POLICY "auth_select_non_conformances" ON non_conformances
  FOR SELECT TO authenticated USING (true);

-- capas
CREATE POLICY "auth_select_capas" ON capas
  FOR SELECT TO authenticated USING (true);

-- audits
CREATE POLICY "auth_select_audits" ON audits
  FOR SELECT TO authenticated USING (true);

-- risks
CREATE POLICY "auth_select_risks" ON risks
  FOR SELECT TO authenticated USING (true);

-- training
CREATE POLICY "auth_select_training" ON training
  FOR SELECT TO authenticated USING (true);

-- deviations
CREATE POLICY "auth_select_deviations" ON deviations
  FOR SELECT TO authenticated USING (true);

-- batch_records
CREATE POLICY "auth_select_batch_records" ON batch_records
  FOR SELECT TO authenticated USING (true);

-- suppliers
CREATE POLICY "auth_select_suppliers" ON suppliers
  FOR SELECT TO authenticated USING (true);

-- change_controls
CREATE POLICY "auth_select_change_controls" ON change_controls
  FOR SELECT TO authenticated USING (true);

-- audit_trail
CREATE POLICY "auth_select_audit_trail" ON audit_trail
  FOR SELECT TO authenticated USING (true);

-- electronic_signatures
CREATE POLICY "auth_select_electronic_signatures" ON electronic_signatures
  FOR SELECT TO authenticated USING (true);

-- audit_findings
CREATE POLICY "auth_select_audit_findings" ON audit_findings
  FOR SELECT TO authenticated USING (true);

-- training_records
CREATE POLICY "auth_select_training_records" ON training_records
  FOR SELECT TO authenticated USING (true);

-- form_templates
CREATE POLICY "auth_select_form_templates" ON form_templates
  FOR SELECT TO authenticated USING (true);

-- document_hierarchy
CREATE POLICY "auth_select_document_hierarchy" ON document_hierarchy
  FOR SELECT TO authenticated USING (true);

-- profiles
CREATE POLICY "auth_select_profiles" ON profiles
  FOR SELECT TO authenticated USING (true);

-- organizations
CREATE POLICY "auth_select_organizations" ON organizations
  FOR SELECT TO authenticated USING (true);

-- ============================================================================
-- STEP 4: Create INSERT/UPDATE/DELETE policies for "authenticated" role
-- ============================================================================

-- documents
CREATE POLICY "auth_insert_documents" ON documents
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_documents" ON documents
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_documents" ON documents
  FOR DELETE TO authenticated USING (true);

-- non_conformances
CREATE POLICY "auth_insert_non_conformances" ON non_conformances
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_non_conformances" ON non_conformances
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_non_conformances" ON non_conformances
  FOR DELETE TO authenticated USING (true);

-- capas
CREATE POLICY "auth_insert_capas" ON capas
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_capas" ON capas
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_capas" ON capas
  FOR DELETE TO authenticated USING (true);

-- audits
CREATE POLICY "auth_insert_audits" ON audits
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_audits" ON audits
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_audits" ON audits
  FOR DELETE TO authenticated USING (true);

-- risks
CREATE POLICY "auth_insert_risks" ON risks
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_risks" ON risks
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_risks" ON risks
  FOR DELETE TO authenticated USING (true);

-- training
CREATE POLICY "auth_insert_training" ON training
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_training" ON training
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_training" ON training
  FOR DELETE TO authenticated USING (true);

-- deviations
CREATE POLICY "auth_insert_deviations" ON deviations
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_deviations" ON deviations
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_deviations" ON deviations
  FOR DELETE TO authenticated USING (true);

-- batch_records
CREATE POLICY "auth_insert_batch_records" ON batch_records
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_batch_records" ON batch_records
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_batch_records" ON batch_records
  FOR DELETE TO authenticated USING (true);

-- suppliers
CREATE POLICY "auth_insert_suppliers" ON suppliers
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_suppliers" ON suppliers
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_suppliers" ON suppliers
  FOR DELETE TO authenticated USING (true);

-- change_controls
CREATE POLICY "auth_insert_change_controls" ON change_controls
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_change_controls" ON change_controls
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_change_controls" ON change_controls
  FOR DELETE TO authenticated USING (true);

-- audit_trail — INSERT only (audit trails should be immutable)
CREATE POLICY "auth_insert_audit_trail" ON audit_trail
  FOR INSERT TO authenticated WITH CHECK (true);

-- electronic_signatures — INSERT only (signatures are immutable)
CREATE POLICY "auth_insert_electronic_signatures" ON electronic_signatures
  FOR INSERT TO authenticated WITH CHECK (true);

-- audit_findings
CREATE POLICY "auth_insert_audit_findings" ON audit_findings
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_audit_findings" ON audit_findings
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_audit_findings" ON audit_findings
  FOR DELETE TO authenticated USING (true);

-- training_records
CREATE POLICY "auth_insert_training_records" ON training_records
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_training_records" ON training_records
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_training_records" ON training_records
  FOR DELETE TO authenticated USING (true);

-- form_templates
CREATE POLICY "auth_insert_form_templates" ON form_templates
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_form_templates" ON form_templates
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_form_templates" ON form_templates
  FOR DELETE TO authenticated USING (true);

-- document_hierarchy
CREATE POLICY "auth_insert_document_hierarchy" ON document_hierarchy
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_document_hierarchy" ON document_hierarchy
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_document_hierarchy" ON document_hierarchy
  FOR DELETE TO authenticated USING (true);

-- profiles
CREATE POLICY "auth_insert_profiles" ON profiles
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_profiles" ON profiles
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- organizations
CREATE POLICY "auth_insert_organizations" ON organizations
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_organizations" ON organizations
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- ============================================================================
-- STEP 5: Verify RLS is enabled on all tables (diagnostic query)
-- ============================================================================

DO $$
DECLARE
  tbl TEXT;
  rls_on BOOLEAN;
  missing TEXT[] := '{}';
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'documents','non_conformances','capas','audits','risks','training',
    'deviations','batch_records','suppliers','change_controls',
    'audit_trail','electronic_signatures','audit_findings','training_records',
    'form_templates','document_hierarchy','profiles','organizations'
  ]) LOOP
    SELECT rowsecurity INTO rls_on
    FROM pg_tables WHERE tablename = tbl AND schemaname = 'public';
    IF NOT COALESCE(rls_on, false) THEN
      missing := array_append(missing, tbl);
    END IF;
  END LOOP;

  IF array_length(missing, 1) > 0 THEN
    RAISE NOTICE 'WARNING: RLS not enabled on: %', array_to_string(missing, ', ');
  ELSE
    RAISE NOTICE 'SUCCESS: RLS enabled on all 18 tables.';
  END IF;
END $$;

COMMIT;