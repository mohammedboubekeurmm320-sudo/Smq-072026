-- ============================================================================
-- Migration 007 (CORRIGÉE) : Audit Blockchain Fix + Trigger Restoration
-- ============================================================================

BEGIN;

-- ============================================================================
-- FIX SPÉCIAL : Dropper les fonctions orphelines qui ont un type de retour différent
-- ============================================================================
DROP FUNCTION IF EXISTS verify_audit_integrity(uuid) CASCADE;
DROP FUNCTION IF EXISTS current_user_org_ids() CASCADE;
DROP FUNCTION IF EXISTS user_is_org_member(uuid) CASCADE;
DROP FUNCTION IF EXISTS update_updated_at() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS enforce_maker_checker() CASCADE;
DROP FUNCTION IF EXISTS compute_audit_hash() CASCADE;
DROP FUNCTION IF EXISTS block_audit_trails_modification() CASCADE;


-- ============================================================================
-- PARTIE A : AJOUTER LES COLONNES MANQUANTES A audit_trails
-- ============================================================================

ALTER TABLE audit_trails ADD COLUMN IF NOT EXISTS sequence_number BIGINT;
ALTER TABLE audit_trails ADD COLUMN IF NOT EXISTS previous_hash TEXT;
ALTER TABLE audit_trails ADD COLUMN IF NOT EXISTS hash TEXT;

CREATE INDEX IF NOT EXISTS idx_audit_trails_org_seq
  ON audit_trails(organization_id, sequence_number);

DROP INDEX IF EXISTS idx_audit_trails_org_seq_unique;
CREATE UNIQUE INDEX IF NOT EXISTS idx_audit_trails_org_seq_unique
  ON audit_trails(organization_id, sequence_number)
  WHERE sequence_number IS NOT NULL;


-- ============================================================================
-- PARTIE B : VERIFIER/CREER LA TABLE audit_config
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_config (
  id TEXT PRIMARY KEY DEFAULT 'singleton',
  signing_salt TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT audit_config_singleton CHECK (id = 'singleton')
);

INSERT INTO audit_config (id, signing_salt)
SELECT 'singleton', 'fallback-dev-only-do-not-use-in-prod'
WHERE NOT EXISTS (SELECT 1 FROM audit_config WHERE id = 'singleton');

COMMENT ON TABLE audit_config IS 'Singleton table holding the HMAC signing salt for audit_trails hashing. UPDATE the signing_salt in production with gen_random_bytes(32).';


-- ============================================================================
-- PARTIE C : REECRIRE log_audit_trail
-- ============================================================================

CREATE OR REPLACE FUNCTION log_audit_trail()
RETURNS TRIGGER AS $$ DECLARE
  v_org_id UUID;
  v_audit_action audit_action;
  v_user_id UUID;
  v_user_email TEXT;
  v_record_id UUID;
  v_old_values JSONB;
  v_new_values JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_audit_action := 'CREATE'::audit_action;
    v_record_id := NEW.id;
    v_old_values := NULL;
    v_new_values := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    v_audit_action := 'UPDATE'::audit_action;
    v_record_id := NEW.id;
    v_old_values := to_jsonb(OLD);
    v_new_values := to_jsonb(NEW);
  ELSIF TG_OP = 'DELETE' THEN
    v_audit_action := 'DELETE'::audit_action;
    v_record_id := OLD.id;
    v_old_values := to_jsonb(OLD);
    v_new_values := NULL;
  ELSE
    RETURN NULL;
  END IF;

  BEGIN
    v_org_id := NEW.organization_id;
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      v_org_id := OLD.organization_id;
    EXCEPTION WHEN OTHERS THEN
      v_org_id := NULL;
    END;
  END;

  IF v_org_id IS NULL THEN
    BEGIN
      v_org_id := current_user_org_id();
    EXCEPTION WHEN OTHERS THEN
      v_org_id := NULL;
    END;
  END IF;

  BEGIN
    v_user_id := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_user_id := NULL;
  END;

  IF v_user_id IS NOT NULL THEN
    BEGIN
      SELECT email INTO v_user_email FROM profiles WHERE id = v_user_id;
    EXCEPTION WHEN OTHERS THEN
      v_user_email := NULL;
    END;
  END IF;

  BEGIN
    INSERT INTO audit_trails (
      audit_action,
      table_name,
      record_id,
      user_id,
      user_email,
      old_values,
      new_values,
      organization_id
    ) VALUES (
      v_audit_action,
      TG_TABLE_NAME,
      v_record_id,
      v_user_id,
      v_user_email,
      v_old_values,
      v_new_values,
      v_org_id
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Audit trail insert failed for %.% (record %): %',
      TG_TABLE_SCHEMA, TG_TABLE_NAME, v_record_id, SQLERRM;
  END;

  RETURN COALESCE(NEW, OLD);
END;
 $$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================================
-- PARTIE D : ACTIVER compute_audit_hash
-- ============================================================================

CREATE OR REPLACE FUNCTION compute_audit_hash()
RETURNS TRIGGER AS $$ DECLARE
  v_salt          TEXT;
  v_prev_hash     TEXT;
  v_prev_seq      BIGINT;
  v_org_id        UUID;
  v_canonical     TEXT;
  v_computed_hash TEXT;
BEGIN
  SELECT signing_salt INTO v_salt FROM public.audit_config WHERE id = 'singleton';
  IF v_salt IS NULL OR v_salt = 'CHANGE_ME_IN_PRODUCTION_USE_OPENSSL_RAND_HEX_32' THEN
    v_salt := 'fallback-dev-only-do-not-use-in-prod';
  END IF;

  v_org_id := NEW.organization_id;

  SELECT sequence_number, hash
    INTO v_prev_seq, v_prev_hash
    FROM public.audit_trails
    WHERE organization_id = v_org_id
    ORDER BY sequence_number DESC
    LIMIT 1;

  NEW.sequence_number := COALESCE(v_prev_seq, 0) + 1;
  NEW.previous_hash   := COALESCE(v_prev_hash, 'GENESIS');

  v_canonical := json_build_object(
    'seq',         NEW.sequence_number,
    'action',      NEW.audit_action,
    'table',       NEW.table_name,
    'record_id',   NEW.record_id,
    'user_id',     NEW.user_id,
    'org_id',      v_org_id,
    'prev_hash',   NEW.previous_hash,
    'timestamp',   NEW.created_at
  )::text;

  v_computed_hash := encode(
    hmac(v_canonical::bytea, v_salt::bytea, 'sha256'),
    'hex'
  );

  NEW.hash := v_computed_hash;

  RETURN NEW;
END;
 $$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_compute_audit_hash ON audit_trails;
CREATE TRIGGER trg_compute_audit_hash
  BEFORE INSERT ON audit_trails
  FOR EACH ROW EXECUTE FUNCTION compute_audit_hash();


-- ============================================================================
-- PARTIE E : ACTIVER block_audit_trails_modification
-- ============================================================================

CREATE OR REPLACE FUNCTION block_audit_trails_modification()
RETURNS TRIGGER AS $$ BEGIN
  IF current_user = 'service_role' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'audit_trails is append-only: UPDATE and DELETE are forbidden (21 CFR Part 11 §11.10(e))';
END;
 $$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_block_audit_update ON audit_trails;
CREATE TRIGGER trg_block_audit_update
  BEFORE UPDATE ON audit_trails
  FOR EACH ROW EXECUTE FUNCTION block_audit_trails_modification();

DROP TRIGGER IF EXISTS trg_block_audit_delete ON audit_trails;
CREATE TRIGGER trg_block_audit_delete
  BEFORE DELETE ON audit_trails
  FOR EACH ROW EXECUTE FUNCTION block_audit_trails_modification();


-- ============================================================================
-- PARTIE F : AJOUTER LES TRIGGERS MANQUANTS
-- ============================================================================

DROP TRIGGER IF EXISTS trg_audit_organizations ON organizations;
CREATE TRIGGER trg_audit_organizations
  AFTER INSERT OR UPDATE OR DELETE ON organizations
  FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

DROP TRIGGER IF EXISTS trg_audit_profiles ON profiles;
CREATE TRIGGER trg_audit_profiles
  AFTER INSERT OR UPDATE OR DELETE ON profiles
  FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

DROP TRIGGER IF EXISTS trg_audit_organization_members ON organization_members;
CREATE TRIGGER trg_audit_organization_members
  AFTER INSERT OR UPDATE OR DELETE ON organization_members
  FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

DROP TRIGGER IF EXISTS trg_audit_electronic_signatures ON electronic_signatures;
CREATE TRIGGER trg_audit_electronic_signatures
  AFTER INSERT OR UPDATE OR DELETE ON electronic_signatures
  FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

DROP TRIGGER IF EXISTS trg_audit_departments ON departments;
CREATE TRIGGER trg_audit_departments
  AFTER INSERT OR UPDATE OR DELETE ON departments
  FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

DROP TRIGGER IF EXISTS trg_audit_document_prerequisites ON document_prerequisites;
CREATE TRIGGER trg_audit_document_prerequisites
  AFTER INSERT OR UPDATE OR DELETE ON document_prerequisites
  FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

DROP TRIGGER IF EXISTS trg_audit_document_code_sequences ON document_code_sequences;
CREATE TRIGGER trg_audit_document_code_sequences
  AFTER INSERT OR UPDATE OR DELETE ON document_code_sequences
  FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

DROP TRIGGER IF EXISTS trg_audit_document_relationships ON document_relationships;
CREATE TRIGGER trg_audit_document_relationships
  AFTER INSERT OR UPDATE OR DELETE ON document_relationships
  FOR EACH ROW EXECUTE FUNCTION log_audit_trail();


-- ============================================================================
-- PARTIE G : NETTOYER LE TRIGGER ORPHELIN SUR audit_findings
-- ============================================================================

DROP TRIGGER IF EXISTS trg_audit_findings_updated_at ON audit_findings;


-- ============================================================================
-- PARTIE H : RECREER LES FONCTIONS ORPHELINES
-- ============================================================================

-- H1. verify_audit_integrity
CREATE OR REPLACE FUNCTION verify_audit_integrity(p_org_id UUID)
RETURNS TABLE(is_valid BOOLEAN, broken_sequence BIGINT, total_entries BIGINT) AS $$ DECLARE
  v_salt         TEXT;
  v_prev_hash    TEXT := 'GENESIS';
  v_entry        RECORD;
  v_canonical    TEXT;
  v_expected     TEXT;
  v_count        BIGINT := 0;
BEGIN
  SELECT signing_salt INTO v_salt FROM public.audit_config WHERE id = 'singleton';
  IF v_salt IS NULL OR v_salt = 'CHANGE_ME_IN_PRODUCTION_USE_OPENSSL_RAND_HEX_32' THEN
    v_salt := 'fallback-dev-only-do-not-use-in-prod';
  END IF;

  FOR v_entry IN
    SELECT sequence_number, hash, previous_hash, audit_action, table_name,
           record_id, user_id, created_at
      FROM public.audit_trails
      WHERE organization_id = p_org_id
      ORDER BY sequence_number ASC
  LOOP
    v_count := v_count + 1;

    IF v_entry.previous_hash != v_prev_hash THEN
      RETURN QUERY SELECT false, v_entry.sequence_number, v_count;
      RETURN;
    END IF;

    v_canonical := json_build_object(
      'seq',         v_entry.sequence_number,
      'action',      v_entry.audit_action,
      'table',       v_entry.table_name,
      'record_id',   v_entry.record_id,
      'user_id',     v_entry.user_id,
      'org_id',      p_org_id,
      'prev_hash',   v_entry.previous_hash,
      'timestamp',   v_entry.created_at
    )::text;

    v_expected := encode(
      hmac(v_canonical::bytea, v_salt::bytea, 'sha256'),
      'hex'
    );

    IF v_entry.hash != v_expected THEN
      RETURN QUERY SELECT false, v_entry.sequence_number, v_count;
      RETURN;
    END IF;

    v_prev_hash := v_entry.hash;
  END LOOP;

  RETURN QUERY SELECT true, NULL::BIGINT, v_count;
  RETURN;
END;
 $$ LANGUAGE plpgsql SECURITY DEFINER;

-- H2. enforce_maker_checker
CREATE OR REPLACE FUNCTION enforce_maker_checker()
RETURNS TRIGGER AS $$ BEGIN
  IF NEW.approved_by_id IS NOT NULL THEN
    IF NEW.created_by_id IS NOT NULL AND NEW.approved_by_id = NEW.created_by_id THEN
      RAISE EXCEPTION 'Maker-checker violation: approver (approved_by_id=%) cannot be the same as creator (created_by_id=%). Segregation of duties required by 21 CFR Part 11 §11.10(g).',
        NEW.approved_by_id, NEW.created_by_id;
    END IF;

    IF NEW.approved_at IS NULL THEN
      NEW.approved_at := now();
    END IF;
  END IF;

  RETURN NEW;
END;
 $$ LANGUAGE plpgsql;

-- H3. handle_new_user
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$ DECLARE
  v_default_org UUID;
BEGIN
  v_default_org := (NEW.raw_user_meta_data->>'organization_id')::UUID;
  IF v_default_org IS NULL THEN
    SELECT id INTO v_default_org FROM public.organizations ORDER BY created_at LIMIT 1;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role, organization_id)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'operator'::public.user_role),
    v_default_org
  );

  IF v_default_org IS NOT NULL THEN
    INSERT INTO public.organization_members (organization_id, user_id, role, status)
    VALUES (v_default_org, NEW.id, 'owner', 'active')
    ON CONFLICT (organization_id, user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
 $$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- H4. current_user_org_ids
CREATE OR REPLACE FUNCTION current_user_org_ids()
RETURNS SETOF UUID AS $$   SELECT organization_id
  FROM public.organization_members
  WHERE user_id = auth.uid()
    AND status = 'active';
 $$ LANGUAGE sql SECURITY DEFINER STABLE;

-- H5. user_is_org_member
CREATE OR REPLACE FUNCTION user_is_org_member(p_org_id UUID)
RETURNS BOOLEAN AS $$   SELECT EXISTS(
    SELECT 1 FROM public.organization_members
    WHERE user_id = auth.uid()
      AND organization_id = p_org_id
      AND status = 'active'
  );
 $$ LANGUAGE sql SECURITY DEFINER STABLE;

-- H6. update_updated_at (alias)
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$ BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
 $$ LANGUAGE plpgsql;


-- ============================================================================
-- PARTIE I : VERIFICATION FINALE
-- ============================================================================

DO $$ DECLARE
  v_trigger_count INT;
  v_function_count INT;
  v_audit_count INT;
  v_test_org_id UUID;
  v_audit_entry_count INT;
BEGIN
  RAISE NOTICE '============================================================';
  RAISE NOTICE '  VERIFICATION FINALE — Migration 007';
  RAISE NOTICE '============================================================';

  SELECT count(DISTINCT trigger_name) INTO v_trigger_count
  FROM information_schema.triggers
  WHERE trigger_schema = 'public'
    AND trigger_name LIKE 'trg_audit%'
    AND trigger_name NOT LIKE '%updated%';

  RAISE NOTICE 'Triggers daudit (trg_audit_*) : % (attendu : 19)', v_trigger_count;

  SELECT count(*) INTO v_function_count
  FROM information_schema.routines
  WHERE routine_schema = 'public'
    AND routine_name IN (
      'is_org_member','log_audit_trail','compute_audit_hash',
      'verify_audit_integrity','block_audit_trails_modification',
      'enforce_maker_checker','handle_new_user','current_user_org_ids',
      'user_is_org_member','update_updated_at','update_updated_at_column',
      'current_user_org_id','current_user_email','is_org_admin','is_org_owner',
      'protect_system_record_types','validate_instance_values',
      'generate_custom_record_number','check_rtd_deactivation_safety',
      'create_organization_for_user'
    );

  RAISE NOTICE 'Fonctions attendues presentes : % / 20', v_function_count;

  SELECT count(*) INTO v_audit_count FROM audit_trails;
  RAISE NOTICE 'Audit trails AVANT test : % entrees', v_audit_count;

  RAISE NOTICE '--- Test dinsertion dorg ---';
  INSERT INTO organizations (name, slug, subscription_status)
  VALUES ('TEST AUDIT 007', 'test-audit-007-' || extract(epoch from now())::bigint::text, 'trial')
  RETURNING id INTO v_test_org_id;

  RAISE NOTICE 'Org de test cree : %', v_test_org_id;

  SELECT count(*) INTO v_audit_entry_count
  FROM audit_trails
  WHERE table_name = 'organizations' AND record_id = v_test_org_id;

  IF v_audit_entry_count > 0 THEN
    RAISE NOTICE 'SUCCES : % entree(s) audit cree(s) pour lorg de test', v_audit_entry_count;

    SELECT count(*) INTO v_audit_entry_count
    FROM audit_trails
      WHERE table_name = 'organizations'
      AND record_id = v_test_org_id
      AND hash IS NOT NULL
      AND sequence_number IS NOT NULL;

    IF v_audit_entry_count > 0 THEN
      RAISE NOTICE 'Hash + sequence_number popules correctement';
    ELSE
      RAISE NOTICE 'ATTENTION Hash ou sequence_number NULL';
    END IF;

    DELETE FROM organizations WHERE id = v_test_org_id;
    RAISE NOTICE 'Org de test supprimee';
  ELSE
    RAISE NOTICE 'ECHEC : aucune entree audit cree';
    DELETE FROM organizations WHERE id = v_test_org_id;
  END IF;

  SELECT count(*) INTO v_audit_count FROM audit_trails;
  RAISE NOTICE 'Audit trails APRES test : % entrees', v_audit_count;

  RAISE NOTICE '============================================================';
  IF v_audit_entry_count > 0 THEN
    RAISE NOTICE 'MIGRATION 007 APPLIQUEE AVEC SUCCES';
  ELSE
    RAISE NOTICE 'MIGRATION 007 APPLIQUEE MAIS AUDIT TRAIL NON FONCTIONNEL';
  END IF;
  RAISE NOTICE '============================================================';
END $$;

COMMIT;