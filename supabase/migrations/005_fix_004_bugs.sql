-- ============================================================
-- 005_fix_004_bugs.sql
-- Fixes column name mismatches in 004_missing_rpcs_views_triggers.sql
-- Adds missing audit_config table referenced by audit hash functions
--
-- BUGS FIXED:
--   1. document_trigger_graph: activated_document_id → target_document_id
--   2. validate_status_transition: status_flow_json → "statusFlowJson"
--   3. validate_instance_values: instance_values → values_json
--   4. validate_instance_values: form_template_id → template_id
--   5. validate_instance_values: fields_json → "fieldsJson"
--   6. enforce_maker_checker_qms: created_by → created_by_id
--   7. Maker-checker DO $$: column check created_by → created_by_id
--   8. record_type_usage: status_flow_json → "statusFlowJson"
--
-- Run this AFTER 004 to fix all broken objects.
-- ============================================================

BEGIN;

-- ============================================================================
-- 0. MISSING TABLE: audit_config
-- Referenced by compute_audit_hash() and verify_audit_integrity()
-- in 003/004 but never created. Singleton row stores HMAC signing salt.
-- ============================================================================

CREATE TABLE IF NOT EXISTS "audit_config" (
    "id"            TEXT NOT NULL DEFAULT 'singleton',
    "signing_salt"  TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"    TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audit_config_pkey" PRIMARY KEY ("id")
);

-- Ensure the singleton row exists
INSERT INTO "audit_config" ("id", "signing_salt")
VALUES ('singleton', gen_random_uuid()::text)
ON CONFLICT ("id") DO NOTHING;

-- ============================================================================
-- 1. FIX: validate_status_transition — "statusFlowJson" not status_flow_json
-- ============================================================================

DROP FUNCTION IF EXISTS public.validate_status_transition CASCADE;

CREATE OR REPLACE FUNCTION public.validate_status_transition(
  p_record_type_slug text,
  p_current_status text,
  p_new_status text,
  p_organization_id text
)
RETURNS boolean AS $$
DECLARE
  v_flow jsonb;
  v_status_list jsonb;
  v_found boolean;
BEGIN
  SELECT "statusFlowJson" INTO v_flow
  FROM record_type_definitions
  WHERE slug = p_record_type_slug
    AND organization_id = p_organization_id
    AND is_active = true
  LIMIT 1;

  IF v_flow IS NULL THEN
    RETURN true;
  END IF;

  v_status_list := v_flow->'linear';
  v_found := false;

  FOR i IN 0..jsonb_array_length(v_status_list)-1 LOOP
    IF v_status_list->>i = p_current_status AND i < jsonb_array_length(v_status_list)-1 THEN
      IF v_status_list->>(i+1) = p_new_status THEN
        v_found := true;
        EXIT;
      END IF;
    END IF;
  END LOOP;

  IF NOT v_found AND v_flow->'branches' ? p_current_status THEN
    v_found := (v_flow->'branches'->p_current_status) @> to_jsonb(p_new_status);
  END IF;

  RETURN v_found;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 2. FIX: enforce_maker_checker_qms — created_by_id not created_by
-- ============================================================================

DROP FUNCTION IF EXISTS public.enforce_maker_checker_qms CASCADE;

CREATE OR REPLACE FUNCTION public.enforce_maker_checker_qms()
RETURNS trigger AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status IN ('Approved', 'Closed', 'Released', 'Qualified', 'Completed', 'Effective') THEN
      IF NEW.approved_by_id IS NOT NULL AND NEW.approved_by_id = NEW.created_by_id THEN
        RAISE EXCEPTION 'Maker-checker violation: l''approbateur ne peut pas etre le createur du record (21 CFR Part 11 SS11.10)';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Re-attach maker-checker triggers with CORRECT column name (created_by_id)
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'capas', 'non_conformances', 'deviations', 'change_controls',
    'audits', 'risks', 'suppliers', 'batch_records', 'documents'
  ]) LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = tbl AND column_name = 'approved_by_id'
    ) AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = tbl AND column_name = 'created_by_id'
    ) THEN
      EXECUTE format('
        DROP TRIGGER IF EXISTS trg_maker_checker_%s ON %I;
        CREATE TRIGGER trg_maker_checker_%s
          BEFORE UPDATE ON %I
          FOR EACH ROW EXECUTE FUNCTION enforce_maker_checker_qms();
      ', tbl, tbl, tbl);
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- 3. FIX: validate_instance_values — correct all 3 column names
--    instance_values   → values_json
--    form_template_id  → template_id
--    fields_json       → "fieldsJson"
-- ============================================================================

DROP FUNCTION IF EXISTS public.validate_instance_values CASCADE;

CREATE OR REPLACE FUNCTION public.validate_instance_values()
RETURNS trigger AS $$
DECLARE
  v_template_id text;
  v_fields jsonb;
  v_values jsonb;
  v_field jsonb;
  v_key text;
  v_required boolean;
  v_type text;
BEGIN
  IF NEW.values_json IS NULL THEN
    RETURN NEW;
  END IF;

  v_template_id := NEW.template_id;
  IF v_template_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT "fieldsJson" INTO v_fields
  FROM form_templates
  WHERE id = v_template_id;

  IF v_fields IS NULL THEN
    RETURN NEW;
  END IF;

  v_values := NEW.values_json;

  FOR v_field IN SELECT * FROM jsonb_array_elements(v_fields)
  LOOP
    v_key := v_field->>'name';
    v_required := COALESCE((v_field->>'required')::boolean, false);
    v_type := v_field->>'type';

    IF v_required AND (v_values->>v_key IS NULL OR (v_values->>v_key) = '') THEN
      RAISE EXCEPTION 'Champ requis manquant: %', v_field->>'label';
    END IF;

    IF v_values->>v_key IS NOT NULL THEN
      CASE v_type
        WHEN 'number' THEN
          IF (v_values->>v_key)::numeric IS NULL THEN
            RAISE EXCEPTION 'Champ numerique invalide: %', v_field->>'label';
          END IF;
        WHEN 'date' THEN
          IF (v_values->>v_key)::date IS NULL THEN
            RAISE EXCEPTION 'Champ date invalide: %', v_field->>'label';
          END IF;
      END CASE;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_instance_values ON form_instances;
CREATE TRIGGER trg_validate_instance_values
  BEFORE INSERT OR UPDATE ON form_instances
  FOR EACH ROW EXECUTE FUNCTION validate_instance_values();

-- ============================================================================
-- 4. FIX: document_trigger_graph view — target_document_id not activated_document_id
-- ============================================================================

CREATE OR REPLACE VIEW public.document_trigger_graph AS
SELECT
  d.id AS document_id,
  d.document_number,
  d.title,
  dp.prerequisite_document_id,
  pd.document_number AS prerequisite_doc_number,
  pd.title AS prerequisite_title,
  dt.target_document_id,
  ad.document_number AS target_doc_number,
  ad.title AS target_title
FROM documents d
LEFT JOIN document_prerequisites dp ON dp.document_id = d.id
LEFT JOIN documents pd ON pd.id = dp.prerequisite_document_id
LEFT JOIN document_triggers dt ON dt.source_document_id = d.id
LEFT JOIN documents ad ON ad.id = dt.target_document_id;

-- ============================================================================
-- 5. FIX: record_type_usage view — "statusFlowJson" not status_flow_json
-- ============================================================================

CREATE OR REPLACE VIEW public.record_type_usage AS
SELECT
  rtd.id AS definition_id,
  rtd.slug,
  rtd.name,
  rtd.organization_id,
  o.name AS organization_name,
  rtd.is_system,
  rtd.is_active,
  rtd.requires_esig,
  COALESCE(cnt.record_count, 0) AS record_count,
  rtd.created_at,
  rtd.updated_at
FROM record_type_definitions rtd
LEFT JOIN organizations o ON o.id = rtd.organization_id
LEFT JOIN LATERAL (
  SELECT count(*) AS record_count
  FROM capas WHERE organization_id = rtd.organization_id AND rtd.slug = 'capa'
  UNION ALL
  SELECT count(*) FROM non_conformances WHERE organization_id = rtd.organization_id AND rtd.slug = 'ncr'
  UNION ALL
  SELECT count(*) FROM deviations WHERE organization_id = rtd.organization_id AND rtd.slug = 'deviation'
  UNION ALL
  SELECT count(*) FROM change_controls WHERE organization_id = rtd.organization_id AND rtd.slug = 'change_control'
  UNION ALL
  SELECT count(*) FROM audits WHERE organization_id = rtd.organization_id AND rtd.slug = 'audit'
  UNION ALL
  SELECT count(*) FROM risks WHERE organization_id = rtd.organization_id AND rtd.slug = 'risk'
  UNION ALL
  SELECT count(*) FROM training WHERE organization_id = rtd.organization_id AND rtd.slug = 'training'
  UNION ALL
  SELECT count(*) FROM suppliers WHERE organization_id = rtd.organization_id AND rtd.slug = 'supplier'
  UNION ALL
  SELECT count(*) FROM batch_records WHERE organization_id = rtd.organization_id AND rtd.slug = 'batch_record'
) cnt ON true;

-- ============================================================================
-- 6. NO CHANGE NEEDED: set_user_context, get_upcoming_deadlines,
--    get_org_compliance_score, v_current_user, v_org_dashboard,
--    document_hierarchy — these were already correct in 004.
--    They are listed here for documentation completeness.
-- ============================================================================

COMMIT;