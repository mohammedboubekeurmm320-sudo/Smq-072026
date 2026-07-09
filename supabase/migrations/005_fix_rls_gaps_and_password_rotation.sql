-- ============================================================================
-- Migration 005 : RLS Gap Fix + Password Rotation for Seeding Accounts
-- ============================================================================
-- Corrective action per Security Re-Audit #REAUDIT-2026-0627
--
-- PROBLEMS FIXED:
--   1. 10 tables from migrations 001/002 have NO RLS enabled:
--      organization_members, document_prerequisites, form_instances,
--      audit_trails, departments, document_triggers, document_relationships,
--      document_code_sequences, record_type_definitions, record_links
--   2. Migration 003 references 'audit_trail' (singular) but schema 001
--      creates 'audit_trails' (plural) — RLS was applied to wrong table
--   3. Migration 003 references phantom tables (audit_findings,
--      training_records) that don't exist in schema
--   4. Migration 003 tries ALTER TABLE on 'document_hierarchy' which is
--      a VIEW, not a TABLE
--   5. Initial seeding passwords must be rotated before production go-live
--
-- Prerequisite: Migrations 001-004 must be applied first.
-- Execute in Supabase SQL Editor with service_role key.
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART A: DIAGNOSTIC — Verify current RLS status on ALL public tables
-- ============================================================================

DO $$
DECLARE
  tbl TEXT;
  rls_on BOOLEAN;
  policy_count INT;
  missing_rls TEXT[] := '{}';
  no_policies TEXT[] := '{}';
  all_tables TEXT[] := ARRAY[
    'organizations', 'profiles', 'organization_members',
    'documents', 'electronic_signatures', 'document_prerequisites',
    'form_templates', 'form_instances',
    'capas', 'non_conformances', 'deviations', 'change_controls',
    'audits', 'training', 'risks', 'batch_records', 'suppliers',
    'audit_trails',
    'departments', 'document_triggers', 'document_relationships',
    'document_code_sequences',
    'record_type_definitions', 'record_links'
  ];
BEGIN
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'RLS STATUS DIAGNOSTIC — All public tables';
  RAISE NOTICE '============================================================';

  FOR tbl IN SELECT unnest(all_tables) LOOP
    -- Check if table actually exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = tbl AND table_schema = 'public') THEN
      SELECT rowsecurity INTO rls_on
      FROM pg_tables WHERE tablename = tbl AND schemaname = 'public';

      SELECT count(*) INTO policy_count
      FROM pg_policies WHERE tablename = tbl AND schemaname = 'public';

      IF NOT COALESCE(rls_on, false) THEN
        missing_rls := array_append(missing_rls, tbl);
        RAISE NOTICE '[FAIL] % — RLS DISABLED (policies: %)', tbl, policy_count;
      ELSIF policy_count = 0 THEN
        no_policies := array_append(no_policies, tbl);
        RAISE NOTICE '[WARN] % — RLS enabled but NO policies (policies: %)', tbl, policy_count;
      ELSE
        RAISE NOTICE '[OK]   % — RLS enabled, % policies', tbl, policy_count;
      END IF;
    ELSE
      RAISE NOTICE '[SKIP] % — table does not exist in public schema', tbl;
    END IF;
  END LOOP;

  RAISE NOTICE '------------------------------------------------------------';
  IF array_length(missing_rls, 1) > 0 THEN
    RAISE NOTICE 'TABLES WITH RLS DISABLED: %', array_to_string(missing_rls, ', ');
  END IF;
  IF array_length(no_policies, 1) > 0 THEN
    RAISE NOTICE 'TABLES WITH RLS BUT NO POLICIES: %', array_to_string(no_policies, ', ');
  END IF;
  RAISE NOTICE '============================================================';
END $$;

-- ============================================================================
-- PART B: FIX — Enable RLS on all 10 missing tables
-- ============================================================================

-- [1/10] organization_members
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_organization_members" ON organization_members
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_organization_members" ON organization_members
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_organization_members" ON organization_members
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_organization_members" ON organization_members
  FOR DELETE TO authenticated USING (true);

-- [2/10] document_prerequisites
ALTER TABLE document_prerequisites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_document_prerequisites" ON document_prerequisites
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_document_prerequisites" ON document_prerequisites
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_document_prerequisites" ON document_prerequisites
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_document_prerequisites" ON document_prerequisites
  FOR DELETE TO authenticated USING (true);

-- [3/10] form_instances
ALTER TABLE form_instances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_form_instances" ON form_instances
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_form_instances" ON form_instances
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_form_instances" ON form_instances
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_form_instances" ON form_instances
  FOR DELETE TO authenticated USING (true);

-- [4/10] audit_trails (CORRECT name — plural, as in migration 001)
ALTER TABLE audit_trails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_audit_trails" ON audit_trails
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_audit_trails" ON audit_trails
  FOR INSERT TO authenticated WITH CHECK (true);
-- No UPDATE/DELETE — audit trails are immutable per ISO 13485 §4.2.4

-- [5/10] departments
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_departments" ON departments
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_departments" ON departments
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_departments" ON departments
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_departments" ON departments
  FOR DELETE TO authenticated USING (true);

-- [6/10] document_triggers
ALTER TABLE document_triggers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_document_triggers" ON document_triggers
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_document_triggers" ON document_triggers
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_document_triggers" ON document_triggers
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_document_triggers" ON document_triggers
  FOR DELETE TO authenticated USING (true);

-- [7/10] document_relationships
ALTER TABLE document_relationships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_document_relationships" ON document_relationships
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_document_relationships" ON document_relationships
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_document_relationships" ON document_relationships
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_document_relationships" ON document_relationships
  FOR DELETE TO authenticated USING (true);

-- [8/10] document_code_sequences
ALTER TABLE document_code_sequences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_document_code_sequences" ON document_code_sequences
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_document_code_sequences" ON document_code_sequences
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_document_code_sequences" ON document_code_sequences
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- [9/10] record_type_definitions
ALTER TABLE record_type_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_record_type_definitions" ON record_type_definitions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_record_type_definitions" ON record_type_definitions
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_record_type_definitions" ON record_type_definitions
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_record_type_definitions" ON record_type_definitions
  FOR DELETE TO authenticated USING (true);

-- [10/10] record_links
ALTER TABLE record_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_record_links" ON record_links
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_record_links" ON record_links
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_record_links" ON record_links
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_delete_record_links" ON record_links
  FOR DELETE TO authenticated USING (true);

-- ============================================================================
-- PART C: CLEANUP — Remove phantom table policies from 003
-- ============================================================================
-- Migration 003 created policies on tables that don't exist.
-- If those tables were somehow created (e.g., manually), drop those policies.
-- If the tables don't exist, these are no-ops.

DO $$
DECLARE
  phantom_policies RECORD;
BEGIN
  FOR phantom_policies IN (
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('audit_trail', 'audit_findings', 'training_records', 'document_hierarchy')
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', phantom_policies.policyname, phantom_policies.tablename);
    RAISE NOTICE 'Cleaned up phantom policy "%" on "%"', phantom_policies.policyname, phantom_policies.tablename;
  END LOOP;
END $$;

-- ============================================================================
-- PART D: PASSWORD ROTATION for all 6 seeding accounts
-- ============================================================================
-- SECURITY: This rotates ALL 6 initial passwords with unique strong passwords.
-- Each user MUST change their password again after first login.
--
-- IMPORTANT: Replace the passwords below with your own secure passwords
-- before running this script. The passwords below are EXAMPLES only.
--
-- Password requirements (Supabase default):
--   - Minimum 8 characters
--   - Recommended: 16+ chars with mixed case, numbers, symbols
-- ============================================================================

DO $$
DECLARE
  rotation_log TEXT := '';
  affected_rows INT;
BEGIN
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'PASSWORD ROTATION — 6 seeding accounts';
  RAISE NOTICE '============================================================';

  -- [1/6] admin@votre-entreprise.com
  UPDATE auth.users
  SET encrypted_password = crypt('R0t@te_Adm1n!_S3cur3#2026', gen_salt('bf')),
      updated_at = now()
  WHERE email = 'admin@votre-entreprise.com';
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  rotation_log := rotation_log || format('[%] admin@votre-entreprise.com — %s%n', affected_rows, CASE WHEN affected_rows > 0 THEN 'ROTATED' ELSE 'NOT FOUND' END);

  -- [2/6] responsable-qualite@votre-entreprise.com
  UPDATE auth.users
  SET encrypted_password = crypt('R0t@te_RQ!_Qu@l1ty#2026', gen_salt('bf')),
      updated_at = now()
  WHERE email = 'responsable-qualite@votre-entreprise.com';
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  rotation_log := rotation_log || format('[%] responsable-qualite@votre-entreprise.com — %s%n', affected_rows, CASE WHEN affected_rows > 0 THEN 'ROTATED' ELSE 'NOT FOUND' END);

  -- [3/6] auditeur@votre-entreprise.com
  UPDATE auth.users
  SET encrypted_password = crypt('R0t@te_Aud!t_Int3rn3#2026', gen_salt('bf')),
      updated_at = now()
  WHERE email = 'auditeur@votre-entreprise.com';
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  rotation_log := rotation_log || format('[%] auditeur@votre-entreprise.com — %s%n', affected_rows, CASE WHEN affected_rows > 0 THEN 'ROTATED' ELSE 'NOT FOUND' END);

  -- [4/6] controleur-docs@votre-entreprise.com
  UPDATE auth.users
  SET encrypted_password = crypt('R0t@te_CD!_D0cContr0l#2026', gen_salt('bf')),
      updated_at = now()
  WHERE email = 'controleur-docs@votre-entreprise.com';
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  rotation_log := rotation_log || format('[%] controleur-docs@votre-entreprise.com — %s%n', affected_rows, CASE WHEN affected_rows > 0 THEN 'ROTATED' ELSE 'NOT FOUND' END);

  -- [5/6] approbateur@votre-entreprise.com
  UPDATE auth.users
  SET encrypted_password = crypt('R0t@te_Ex3c!_Appr0b#2026', gen_salt('bf')),
      updated_at = now()
  WHERE email = 'approbateur@votre-entreprise.com';
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  rotation_log := rotation_log || format('[%] approbateur@votre-entreprise.com — %s%n', affected_rows, CASE WHEN affected_rows > 0 THEN 'ROTATED' ELSE 'NOT FOUND' END);

  -- [6/6] operateur@votre-entreprise.com
  UPDATE auth.users
  SET encrypted_password = crypt('R0t@te_0p!_Pr0duct10n#2026', gen_salt('bf')),
      updated_at = now()
  WHERE email = 'operateur@votre-entreprise.com';
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  rotation_log := rotation_log || format('[%] operateur@votre-entreprise.com — %s%n', affected_rows, CASE WHEN affected_rows > 0 THEN 'ROTATED' ELSE 'NOT FOUND' END);

  RAISE NOTICE '%', rotation_log;
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'REMINDER: Each user MUST change their password on first login.';
  RAISE NOTICE 'Enable "Confirm email" and "Secure password change" in';
  RAISE NOTICE 'Supabase Dashboard -> Authentication -> Settings.';
  RAISE NOTICE '============================================================';
END $$;

-- ============================================================================
-- PART E: FINAL VERIFICATION
-- ============================================================================

DO $$
DECLARE
  tbl TEXT;
  rls_on BOOLEAN;
  policy_count INT;
  all_protected INT := 0;
  total INT := 0;
  all_tables TEXT[] := ARRAY[
    'organizations', 'profiles', 'organization_members',
    'documents', 'electronic_signatures', 'document_prerequisites',
    'form_templates', 'form_instances',
    'capas', 'non_conformances', 'deviations', 'change_controls',
    'audits', 'training', 'risks', 'batch_records', 'suppliers',
    'audit_trails',
    'departments', 'document_triggers', 'document_relationships',
    'document_code_sequences',
    'record_type_definitions', 'record_links'
  ];
BEGIN
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'FINAL RLS VERIFICATION';
  RAISE NOTICE '============================================================';

  FOR tbl IN SELECT unnest(all_tables) LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = tbl AND table_schema = 'public' AND table_type = 'BASE TABLE') THEN
      total := total + 1;
      SELECT rowsecurity INTO rls_on
      FROM pg_tables WHERE tablename = tbl AND schemaname = 'public';

      SELECT count(*) INTO policy_count
      FROM pg_policies WHERE tablename = tbl AND schemaname = 'public';

      IF COALESCE(rls_on, false) AND policy_count > 0 THEN
        all_protected := all_protected + 1;
      ELSE
        RAISE NOTICE 'UNPROTECTED: % (RLS=%, policies=%)', tbl, rls_on, policy_count;
      END IF;
    END IF;
  END LOOP;

  RAISE NOTICE '------------------------------------------------------------';
  RAISE NOTICE 'Protected tables: % / %', all_protected, total;
  IF all_protected = total THEN
    RAISE NOTICE 'RESULT: ALL TABLES PROTECTED — RLS VERIFICATION PASSED';
  ELSE
    RAISE EXCEPTION 'RESULT: % TABLES UNPROTECTED — RLS VERIFICATION FAILED', total - all_protected;
  END IF;
  RAISE NOTICE '============================================================';
END $$;

COMMIT;

-- ============================================================================
-- POST-EXECUTION CHECKLIST
-- ============================================================================
-- [ ] 1. Run this script in Supabase SQL Editor (service_role key)
-- [ ] 2. Check the diagnostic output — all tables should show [OK]
-- [ ] 3. Verify all 6 password rotations show "ROTATED"
-- [ ] 4. Communicate new temporary passwords to each user via SECURE channel
--    (NOT email — use password manager sharing or encrypted messaging)
-- [ ] 5. Each user logs in and changes their password immediately
-- [ ] 6. Enable "Confirm email" in Supabase Dashboard -> Auth -> Settings
-- [ ] 7. Configure password minimum length (recommend 12+ chars)
-- [ ] 8. Enable 2FA for admin and quality_manager accounts
-- [ ] 9. Delete this script from migrations/ after verification
--    (or keep it as 005 but do NOT re-run the password section)
-- [ ] 10. Update netlify.toml / environment to point to production Supabase
-- ============================================================================