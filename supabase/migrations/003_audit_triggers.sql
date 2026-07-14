-- ============================================================================
-- Migration 003 : Audit Trail Triggers — Blockchain HMAC-SHA256
-- ============================================================================
-- Conformite: ISO 13485 4.2.4 / 21 CFR Part 11 11.10(e)
--
-- 1. log_audit_trail: trigger generique sur toutes les tables metier
-- 2. compute_audit_hash: hash HMAC-SHA256 chaine (blockchain)
-- 3. block_audit_trails_modification: immuabilite (UPDATE/DELETE bloques)
-- 4. verify_audit_integrity: verification de la chaine
-- 5. enforce_maker_checker: separation des taches (21 CFR Part 11 11.10(g))
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. log_audit_trail
-- ============================================================================
CREATE OR REPLACE FUNCTION log_audit_trail()
RETURNS TRIGGER AS $$
DECLARE
  v_org_id      TEXT;
  v_action      TEXT;
  v_user_id     TEXT;
  v_user_email  TEXT;
  v_record_id   TEXT;
  v_old_vals    JSONB;
  v_new_vals    JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'CREATE'; v_record_id := NEW.id;
    v_old_vals := NULL; v_new_vals := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'UPDATE'; v_record_id := NEW.id;
    v_old_vals := to_jsonb(OLD); v_new_vals := to_jsonb(NEW);
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'DELETE'; v_record_id := OLD.id;
    v_old_vals := to_jsonb(OLD); v_new_vals := NULL;
  ELSE
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- organization_id
  BEGIN v_org_id := NEW.organization_id; EXCEPTION WHEN OTHERS THEN
    BEGIN v_org_id := OLD.organization_id; EXCEPTION WHEN OTHERS THEN
      v_org_id := current_org_id();
    END;
  END;

  -- user
  v_user_id := current_profile_id();
  IF v_user_id IS NOT NULL THEN
    SELECT email INTO v_user_email FROM profiles WHERE id = v_user_id;
  END IF;

  BEGIN
    INSERT INTO audit_trails (
      audit_action, table_name, record_id,
      user_id, user_email, old_values_json, new_values_json, organization_id
    ) VALUES (
      v_action, TG_TABLE_NAME, v_record_id,
      v_user_id, v_user_email, v_old_vals, v_new_vals, v_org_id
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Audit trail insert failed for %.%: %', TG_TABLE_SCHEMA, TG_TABLE_NAME, SQLERRM;
  END;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 2. compute_audit_hash
-- ============================================================================
CREATE OR REPLACE FUNCTION compute_audit_hash()
RETURNS TRIGGER AS $$
DECLARE
  v_salt       TEXT;
  v_prev_hash  TEXT;
  v_prev_seq   BIGINT;
  v_canonical  TEXT;
  v_hash       TEXT;
BEGIN
  SELECT signing_salt INTO v_salt FROM audit_config WHERE id = 'singleton';
  IF v_salt IS NULL THEN v_salt := 'FALLBACK-DEV-ONLY-CHANGE-IN-PRODUCTION'; END IF;

  SELECT sequence_number, hash INTO v_prev_seq, v_prev_hash
  FROM audit_trails WHERE organization_id = NEW.organization_id
  ORDER BY sequence_number DESC NULLS LAST LIMIT 1;

  NEW.sequence_number := COALESCE(v_prev_seq, 0) + 1;
  NEW.previous_hash   := COALESCE(v_prev_hash, 'GENESIS');

  v_canonical := json_build_object(
    'seq', NEW.sequence_number, 'action', NEW.audit_action,
    'table', NEW.table_name, 'record_id', NEW.record_id,
    'user_id', NEW.user_id, 'org_id', NEW.organization_id,
    'prev_hash', NEW.previous_hash, 'timestamp', NEW.created_at
  )::text;

  v_hash := encode(hmac(v_canonical::bytea, v_salt::bytea, 'sha256'), 'hex');
  NEW.hash := v_hash;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_compute_audit_hash ON audit_trails;
CREATE TRIGGER trg_compute_audit_hash
  BEFORE INSERT ON audit_trails FOR EACH ROW EXECUTE FUNCTION compute_audit_hash();

-- ============================================================================
-- 3. Immuabilite audit_trails
-- ============================================================================
CREATE OR REPLACE FUNCTION block_audit_trails_modification()
RETURNS TRIGGER AS $$
BEGIN
  IF current_user = 'supabase_admin' OR current_user = 'postgres' THEN RETURN OLD; END IF;
  RAISE EXCEPTION 'audit_trails est en lecture seule (21 CFR Part 11 11.10(e))';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_block_audit_update ON audit_trails;
DROP TRIGGER IF EXISTS trg_block_audit_delete ON audit_trails;
CREATE TRIGGER trg_block_audit_update
  BEFORE UPDATE ON audit_trails FOR EACH ROW EXECUTE FUNCTION block_audit_trails_modification();
CREATE TRIGGER trg_block_audit_delete
  BEFORE DELETE ON audit_trails FOR EACH ROW EXECUTE FUNCTION block_audit_trails_modification();

-- ============================================================================
-- Attacher log_audit_trail aux 25 tables metier
-- ============================================================================
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'organizations','profiles','organization_members',
    'departments','documents','electronic_signatures',
    'document_prerequisites','document_triggers','document_relationships',
    'document_code_sequences','form_templates','form_instances',
    'capas','non_conformances','deviations','change_controls',
    'audits','risks','training','batch_records','suppliers',
    'record_type_definitions','record_links',
    'custom_field_definitions','scheduled_reports'
  ]) LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_audit_%I ON %I; '||
      'CREATE TRIGGER trg_audit_%I AFTER INSERT OR UPDATE OR DELETE ON %I '||
      'FOR EACH ROW EXECUTE FUNCTION log_audit_trail();',
      t, t, t, t
    );
  END LOOP;
END $$;

-- ============================================================================
-- 4. verify_audit_integrity
-- ============================================================================
CREATE OR REPLACE FUNCTION verify_audit_integrity(p_org_id TEXT)
RETURNS TABLE(is_valid BOOLEAN, broken_sequence BIGINT, total_entries BIGINT) AS $$
DECLARE
  v_salt      TEXT;
  v_prev_hash TEXT := 'GENESIS';
  v_entry     RECORD;
  v_canonical TEXT;
  v_expected  TEXT;
  v_count     BIGINT := 0;
BEGIN
  SELECT signing_salt INTO v_salt FROM audit_config WHERE id = 'singleton';

  FOR v_entry IN
    SELECT sequence_number, hash, previous_hash, audit_action, table_name,
           record_id, user_id, created_at
    FROM audit_trails WHERE organization_id = p_org_id
    ORDER BY sequence_number ASC
  LOOP
    v_count := v_count + 1;
    IF v_entry.previous_hash != v_prev_hash THEN
      RETURN QUERY SELECT false, v_entry.sequence_number, v_count; RETURN;
    END IF;
    v_canonical := json_build_object(
      'seq', v_entry.sequence_number, 'action', v_entry.audit_action,
      'table', v_entry.table_name, 'record_id', v_entry.record_id,
      'user_id', v_entry.user_id, 'org_id', p_org_id,
      'prev_hash', v_entry.previous_hash, 'timestamp', v_entry.created_at
    )::text;
    v_expected := encode(hmac(v_canonical::bytea, v_salt::bytea, 'sha256'), 'hex');
    IF v_entry.hash != v_expected THEN
      RETURN QUERY SELECT false, v_entry.sequence_number, v_count; RETURN;
    END IF;
    v_prev_hash := v_entry.hash;
  END LOOP;

  RETURN QUERY SELECT true, NULL::BIGINT, v_count; RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. enforce_maker_checker
-- ============================================================================
CREATE OR REPLACE FUNCTION enforce_maker_checker()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.approved_by_id IS NOT NULL AND NEW.created_by_id IS NOT NULL
     AND NEW.approved_by_id = NEW.created_by_id THEN
    RAISE EXCEPTION 'Violation maker-checker: approbateur = createur (21 CFR Part 11 11.10(g))';
  END IF;
  IF NEW.approved_by_id IS NOT NULL AND NEW.approved_at IS NULL THEN
    NEW.approved_at := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMIT;
