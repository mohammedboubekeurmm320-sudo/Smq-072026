-- ============================================================
-- PHASE 1C : FONCTIONS + TRIGGERS
-- CORRIGÉ v2: DROP explicite des anciennes fonctions,
--   simplification de log_audit_trail (retrait current_setting/v_user_email)
-- Exécuter dans Supabase SQL Editor APRÈS la Phase 1B
-- ============================================================

-- ==========================================
-- CLEANUP: supprimer anciennes fonctions et triggers résiduels
-- ==========================================
DROP FUNCTION IF EXISTS log_audit_trail() CASCADE;
DROP FUNCTION IF EXISTS compute_audit_hash() CASCADE;
DROP FUNCTION IF EXISTS block_audit_trails_modification() CASCADE;
DROP FUNCTION IF EXISTS enforce_maker_checker() CASCADE;
DROP FUNCTION IF EXISTS generate_custom_record_number() CASCADE;
DROP FUNCTION IF EXISTS protect_system_record_types() CASCADE;
DROP FUNCTION IF EXISTS verify_audit_integrity(TEXT) CASCADE;
DROP FUNCTION IF EXISTS verify_audit_integrity(UUID) CASCADE;
DROP FUNCTION IF EXISTS is_org_member(TEXT) CASCADE;
DROP FUNCTION IF EXISTS is_org_member(UUID) CASCADE;
DROP FUNCTION IF EXISTS is_org_admin(TEXT) CASCADE;
DROP FUNCTION IF EXISTS is_org_admin(UUID) CASCADE;
DROP FUNCTION IF EXISTS is_org_owner(TEXT) CASCADE;
DROP FUNCTION IF EXISTS is_org_owner(UUID) CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

BEGIN;

-- ==========================================
-- 1. Fonction updated_at automatique
-- ==========================================
CREATE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 2. Fonctions RLS helpers
-- ==========================================
CREATE FUNCTION is_org_member(p_org_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = p_org_id
          AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE FUNCTION is_org_admin(p_org_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = p_org_id
          AND role IN ('owner', 'admin')
          AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE FUNCTION is_org_owner(p_org_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = p_org_id
          AND role = 'owner'
          AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 3. Fonction audit trail (simplifiée)
-- ==========================================
CREATE FUNCTION log_audit_trail()
RETURNS TRIGGER AS $$
DECLARE
    v_org_id TEXT;
    v_audit_action audit_action;
    v_user_id TEXT;
    v_record_id TEXT;
    v_old_values JSONB;
    v_new_values JSONB;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_audit_action := 'CREATE'::audit_action;
        v_record_id := NEW.id;
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
    END IF;

    v_user_id := NULL;

    IF TG_OP IN ('INSERT','UPDATE') THEN
        v_org_id := NEW.organization_id;
    ELSIF TG_OP = 'DELETE' THEN
        v_org_id := OLD.organization_id;
    END IF;

    BEGIN
        INSERT INTO audit_trails (audit_action, table_name, record_id, user_id, old_values, new_values, organization_id)
        VALUES (v_audit_action, TG_TABLE_NAME, v_record_id, v_user_id, v_old_values, v_new_values, v_org_id);
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Audit trail insert failed for %.% (record %): %', TG_TABLE_SCHEMA, TG_TABLE_NAME, v_record_id, SQLERRM;
    END;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 4. Fonction hash blockchain HMAC-SHA256
-- ==========================================
CREATE FUNCTION compute_audit_hash()
RETURNS TRIGGER AS $$
DECLARE
    v_salt TEXT;
    v_org_id TEXT;
    v_prev_seq BIGINT;
    v_prev_hash TEXT;
    v_canonical TEXT;
BEGIN
    SELECT signing_salt INTO v_salt FROM audit_config WHERE id = 'singleton';
    IF v_salt IS NULL OR v_salt = 'fallback-dev-only-do-not-use-in-prod' THEN
        v_salt := 'fallback-dev-only-do-not-use-in-prod';
    END IF;

    v_org_id := NEW.organization_id;

    SELECT sequence_number, hash INTO v_prev_seq, v_prev_hash
    FROM audit_trails
    WHERE organization_id = v_org_id AND sequence_number IS NOT NULL
    ORDER BY sequence_number DESC LIMIT 1;

    NEW.sequence_number := COALESCE(v_prev_seq, 0) + 1;
    NEW.previous_hash := COALESCE(v_prev_hash, 'GENESIS');

    v_canonical := json_build_object(
        'seq', NEW.sequence_number,
        'action', NEW.audit_action,
        'table', NEW.table_name,
        'record_id', NEW.record_id,
        'user_id', NEW.user_id,
        'org_id', v_org_id,
        'prev_hash', NEW.previous_hash,
        'timestamp', NEW.created_at
    )::text;

    NEW.hash := encode(hmac(v_canonical::bytea, v_salt::bytea, 'sha256'), 'hex');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 5. Fonction blocage modification audit
-- ==========================================
CREATE FUNCTION block_audit_trails_modification()
RETURNS TRIGGER AS $$
BEGIN
    IF current_user = 'service_role' THEN
        RETURN OLD;
    END IF;
    RAISE EXCEPTION 'audit_trails is append-only: UPDATE and DELETE are forbidden (21 CFR Part 11 §11.10(e))';
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 6. Fonction maker-checker
-- ==========================================
CREATE FUNCTION enforce_maker_checker()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.approved_by IS NOT NULL THEN
        IF NEW.created_by IS NOT NULL AND NEW.approved_by = NEW.created_by THEN
            RAISE EXCEPTION 'Maker-checker violation: approver cannot be the same as creator (21 CFR Part 11)';
        END IF;
        IF NEW.approved_at IS NULL THEN
            NEW.approved_at := now();
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 7. Fonction auto-numbering form instances
-- ==========================================
CREATE FUNCTION generate_custom_record_number()
RETURNS TRIGGER AS $$
DECLARE
    v_prefix TEXT;
    v_year TEXT;
    v_next_seq INTEGER;
    v_ref TEXT;
BEGIN
    v_year := to_char(CURRENT_DATE, 'YYYY');

    SELECT code_prefix INTO v_prefix
    FROM record_type_definitions
    WHERE slug = COALESCE(NEW.record_type_slug, 'general')
      AND organization_id = NEW.organization_id
    LIMIT 1;

    IF v_prefix IS NULL THEN
        v_prefix := 'GEN';
    END IF;

    SELECT COALESCE(last_sequence, 0) INTO v_next_seq
    FROM document_code_sequences
    WHERE prefix = v_prefix
      AND department_suffix IS NULL
      AND organization_id = NEW.organization_id
    FOR UPDATE;

    v_next_seq := v_next_seq + 1;

    INSERT INTO document_code_sequences (prefix, department_suffix, last_sequence, organization_id)
    VALUES (v_prefix, NULL, v_next_seq, NEW.organization_id)
    ON CONFLICT (prefix, department_suffix, organization_id)
    DO UPDATE SET last_sequence = v_next_seq;

    v_ref := v_prefix || '-' || v_year || '-' || LPAD(v_next_seq::TEXT, 3, '0');
    NEW.reference_number := v_ref;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 8. Fonction protection record types système
-- ==========================================
CREATE FUNCTION protect_system_record_types()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' AND OLD.is_system = true THEN
        RAISE EXCEPTION 'Cannot delete system record type';
    END IF;
    IF TG_OP = 'UPDATE' AND OLD.is_system = true THEN
        IF NEW.is_active = false THEN
            RAISE EXCEPTION 'Cannot deactivate system record type';
        END IF;
        IF NEW.slug != OLD.slug THEN
            RAISE EXCEPTION 'Cannot change slug of system record type';
        END IF;
        IF NEW.is_system = false THEN
            RAISE EXCEPTION 'Cannot change system record type to non-system';
        END IF;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 9. Vérification intégrité audit trail
-- ==========================================
CREATE FUNCTION verify_audit_integrity(p_org_id TEXT)
RETURNS TABLE(is_valid BOOLEAN, broken_sequence BIGINT, total_entries BIGINT) AS $$
DECLARE
    v_prev_hash TEXT := 'GENESIS';
    v_entry RECORD;
    v_expected_hash TEXT;
    v_salt TEXT;
    v_canonical TEXT;
    v_count BIGINT;
BEGIN
    SELECT signing_salt INTO v_salt FROM audit_config WHERE id = 'singleton';
    IF v_salt IS NULL THEN v_salt := 'fallback-dev-only-do-not-use-in-prod'; END IF;

    SELECT COUNT(*) INTO v_count FROM audit_trails WHERE organization_id = p_org_id AND sequence_number IS NOT NULL;
    total_entries := v_count;

    FOR v_entry IN
        SELECT * FROM audit_trails
        WHERE organization_id = p_org_id AND sequence_number IS NOT NULL
        ORDER BY sequence_number ASC
    LOOP
        IF v_entry.previous_hash IS DISTINCT FROM v_prev_hash THEN
            is_valid := false;
            broken_sequence := v_entry.sequence_number;
            RETURN NEXT;
            RETURN;
        END IF;

        v_canonical := json_build_object(
            'seq', v_entry.sequence_number,
            'action', v_entry.audit_action,
            'table', v_entry.table_name,
            'record_id', v_entry.record_id,
            'user_id', v_entry.user_id,
            'org_id', v_entry.organization_id,
            'prev_hash', v_entry.previous_hash,
            'timestamp', v_entry.created_at
        )::text;

        v_expected_hash := encode(hmac(v_canonical::bytea, v_salt::bytea, 'sha256'), 'hex');

        IF v_entry.hash IS DISTINCT FROM v_expected_hash THEN
            is_valid := false;
            broken_sequence := v_entry.sequence_number;
            RETURN NEXT;
            RETURN;
        END IF;

        v_prev_hash := v_entry.hash;
    END LOOP;

    is_valid := true;
    broken_sequence := NULL;
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- TRIGGERS updated_at (14 tables)
-- ==========================================
DO $$ DECLARE
    tbl TEXT;
    trig_name TEXT;
BEGIN
    FOR tbl IN SELECT unnest(ARRAY[
        'organizations','profiles','documents','form_templates','form_instances',
        'capas','non_conformances','deviations','change_controls','audits',
        'training','risks','departments','record_type_definitions'
    ]) LOOP
        trig_name := 'trg_' || tbl || '_updated';
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', trig_name, tbl);
        EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', trig_name, tbl);
    END LOOP;
END $$;

-- ==========================================
-- TRIGGERS audit trail (23 tables)
-- ==========================================
DO $$ DECLARE
    tbl TEXT;
    trig_name TEXT;
BEGIN
    FOR tbl IN SELECT unnest(ARRAY[
        'organizations','profiles','organization_members','documents',
        'electronic_signatures','document_prerequisites','form_templates',
        'form_instances','capas','non_conformances','deviations',
        'change_controls','audits','training','risks','batch_records',
        'suppliers','document_triggers','record_type_definitions',
        'record_links','document_code_sequences','document_relationships',
        'departments'
    ]) LOOP
        trig_name := 'trg_audit_' || tbl;
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', trig_name, tbl);
        EXECUTE format('CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION log_audit_trail()', trig_name, tbl);
    END LOOP;
END $$;

-- ==========================================
-- TRIGGERS audit blockchain
-- ==========================================
DROP TRIGGER IF EXISTS trg_compute_audit_hash ON audit_trails;
CREATE TRIGGER trg_compute_audit_hash
BEFORE INSERT ON audit_trails
FOR EACH ROW EXECUTE FUNCTION compute_audit_hash();

DROP TRIGGER IF EXISTS trg_block_audit_update ON audit_trails;
CREATE TRIGGER trg_block_audit_update
BEFORE UPDATE ON audit_trails
FOR EACH ROW EXECUTE FUNCTION block_audit_trails_modification();

DROP TRIGGER IF EXISTS trg_block_audit_delete ON audit_trails;
CREATE TRIGGER trg_block_audit_delete
BEFORE DELETE ON audit_trails
FOR EACH ROW EXECUTE FUNCTION block_audit_trails_modification();

-- ==========================================
-- TRIGGERS spéciaux
-- ==========================================
DROP TRIGGER IF EXISTS trg_generate_custom_ref ON form_instances;
CREATE TRIGGER trg_generate_custom_ref
BEFORE INSERT ON form_instances
FOR EACH ROW EXECUTE FUNCTION generate_custom_record_number();

DROP TRIGGER IF EXISTS trg_protect_system_rtd ON record_type_definitions;
CREATE TRIGGER trg_protect_system_rtd
BEFORE UPDATE OR DELETE ON record_type_definitions
FOR EACH ROW EXECUTE FUNCTION protect_system_record_types();

-- ==========================================
-- Seed audit_config singleton
-- ==========================================
INSERT INTO audit_config (id, signing_salt)
VALUES ('singleton', 'fallback-dev-only-do-not-use-in-prod')
ON CONFLICT (id) DO NOTHING;

COMMIT;