-- ============================================================
-- Migration 011 : Fix audit trigger crash on tables without organization_id
-- ============================================================
-- Problem: log_audit_trail() directly accesses NEW.organization_id
-- which fails for the 'organizations' table (no such column).
-- The EXCEPTION block didn't catch it in all PG versions.
-- Fix: use to_jsonb(NEW)->>'organization_id' which returns NULL safely.
-- ============================================================

BEGIN;

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

  -- organization_id (safe access via jsonb for tables without this column)
  v_org_id := coalesce(
    to_jsonb(NEW)->>'organization_id',
    to_jsonb(OLD)->>'organization_id',
    current_org_id()
  );

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

COMMIT;
