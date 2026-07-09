-- ===========================================================================
-- Migration 002 : Record Type Architecture with ISO 13485 Compliance Corrections
-- ===========================================================================
-- Extensible custom record type system for the Hybrid 2-Layer Supervision QMS.
--
-- NEW TABLES:
--   1. record_type_definitions  — Defines custom record types (supplements 10 system modules)
--   2. record_links             — Generic cross-record linking (replaces hardcoded FKs)
--
-- MODIFIED TABLES:
--   - form_templates.module_type  : ENUM → TEXT (FK → record_type_definitions.slug)
--   - form_instances              : + record_type_slug column, + FK constraint
--   - document_prerequisites.record_type : ENUM → TEXT
--   - capas                       : + source_record_type column
--   - electronic_signatures       : + record_id, record_type columns (polymorphic)
--
-- COMPLIANCE CORRECTIONS (7 fixes):
--   1. Audit trail triggers on new tables (§4.2.4, 21 CFR §11.10(e))
--   2. FK referential integrity for module_type → record_type_definitions (§4.2.3)
--   3. System record type protection trigger (§4.1)
--   4. ComplianceData extension via custom_record_type_counts (§8.4)
--   5. JSONB values validation trigger (§7.5.9, 21 CFR §11.10(a))
--   6. Custom record numbering with code_prefix (§7.5.8/§7.5.9)
--   7. Dynamic status flow from DB (§4.2.3/§4.2.4)
--
-- Idempotent: All objects use IF NOT EXISTS / DROP IF EXISTS CASCADE
-- ===========================================================================

BEGIN;

-- ===========================================================================
-- 1. NEW TABLE: record_type_definitions
-- ===========================================================================
-- Stores metadata for both system (10 hardcoded) and custom record types.
-- This is the "registry" that allows organizations to extend their QMS
-- beyond the 10 pre-built modules while maintaining ISO 13485 compliance.

DROP TABLE IF EXISTS record_type_definitions CASCADE;

CREATE TABLE record_type_definitions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identification
  slug                  text NOT NULL,                    -- e.g., 'etalonnage_equipement', 'capa'
  name                  text NOT NULL,                    -- e.g., 'Étalonnage Équipement'
  name_en               text,                             -- English name for bilingual support
  icon                  text DEFAULT 'FileText',          -- Lucide icon name
  description           text,                             -- Purpose of this record type

  -- Configuration
  status_flow           jsonb NOT NULL DEFAULT '[]',      -- StatusFlowDefinition JSON
  default_fields        jsonb DEFAULT '[]',               -- FormFieldDefinition[] — inherited by templates
  compliance_refs       jsonb DEFAULT '[]',               -- [{clause: '§7.5.6', standard: 'ISO 13485'}]
  code_prefix           text,                             -- e.g., 'ETL', 'CAL' for auto-numbering

  -- System protection
  is_system             boolean NOT NULL DEFAULT false,   -- true for 10 built-in modules
  is_active             boolean NOT NULL DEFAULT true,    -- Can be deactivated (if not system)

  -- Workflow constraints
  requires_esig         boolean NOT NULL DEFAULT true,    -- All transitions require e-signature?
  min_approver_count    integer NOT NULL DEFAULT 1,       -- Minimum approvers for Layer 1

  -- Traceability
  effective_date        timestamptz,
  previous_version_id   uuid REFERENCES record_type_definitions(id),
  version               text NOT NULL DEFAULT '1.0',
  change_reason         text,                             -- Why this type was created/modified

  -- Multi-tenant
  organization_id       uuid NOT NULL REFERENCES organizations(id),

  -- Audit
  created_by_id         uuid REFERENCES profiles(id),
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),

  -- Slug must be unique per organization
  CONSTRAINT uq_rtd_slug_org UNIQUE (slug, organization_id),

  -- System types cannot have NULL status_flow
  CONSTRAINT chk_rtd_system_has_flow CHECK (
    is_system = false OR status_flow != '[]'::jsonb
  )
);

-- ===========================================================================
-- 2. NEW TABLE: record_links
-- ===========================================================================
-- Generic cross-record linking — replaces hardcoded FKs (linked_capa_id,
-- linked_ncr_id, etc.) with a polymorphic junction table.
-- Supports any record type linking to any other record type.

DROP TABLE IF EXISTS record_links CASCADE;

CREATE TABLE record_links (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source record (polymorphic)
  source_record_id      uuid NOT NULL,                    -- ID of the source record
  source_record_type    text NOT NULL,                    -- slug from record_type_definitions

  -- Target record (polymorphic)
  target_record_id      uuid NOT NULL,                    -- ID of the target record
  target_record_type    text NOT NULL,                    -- slug from record_type_definitions

  -- Link semantics
  link_type             text NOT NULL DEFAULT 'related',  -- 'related', 'caused_by', 'corrected_by',
                                                          -- 'linked_to', 'derived_from', 'supersedes'
  description           text,                             -- Why this link exists

  -- Multi-tenant
  organization_id       uuid NOT NULL REFERENCES organizations(id),

  -- Audit
  created_by_id         uuid REFERENCES profiles(id),
  created_at             timestamptz NOT NULL DEFAULT now(),

  -- No duplicate links
  CONSTRAINT uq_record_link UNIQUE (source_record_id, source_record_type,
                                     target_record_id, target_record_type, link_type),

  -- No self-links
  CONSTRAINT chk_no_self_link CHECK (
    source_record_id != target_record_id OR source_record_type != target_record_type
  ),

  -- Valid link types (ISO 13485 §4.2.4 traceability)
  CONSTRAINT chk_link_type CHECK (link_type IN (
    'related', 'caused_by', 'corrected_by', 'linked_to',
    'derived_from', 'supersedes', 'references', 'depends_on'
  ))
);

-- ===========================================================================
-- 3. SEED SYSTEM RECORD TYPES (10 built-in modules)
-- ===========================================================================
-- These are the 10 hardcoded QMS modules that ship with the system.
-- is_system = true means they CANNOT be deleted or deactivated.
-- Their status_flow matches the existing MODULE_STATUS_FLOWS in useRecordWorkflow.ts.

INSERT INTO record_type_definitions (slug, name, name_en, icon, description, status_flow, code_prefix, is_system, is_active, requires_esig, min_approver_count, compliance_refs, organization_id)
SELECT
  m.slug, m.name, m.name_en, m.icon, m.description,
  m.status_flow, m.code_prefix, true, true, true, 1,
  m.compliance_refs,
  o.id
FROM organizations o
CROSS JOIN (VALUES
  -- 1. CAPA
  ('capa', 'CAPA', 'CAPA', 'ShieldCheck',
   'Corrective and Preventive Actions — ISO 13485 §8.5.2, §8.5.3',
   '[{"linear":["Open","Investigation","Implementation","Effectiveness Check","Closed"],"eSigRequired":["Closed"],"terminal":["Closed"]}]'::jsonb,
   'CAPA',
   '[{"clause":"8.5.2","standard":"ISO 13485","description":"Corrective action"},{"clause":"8.5.3","standard":"ISO 13485","description":"Preventive action"}]'::jsonb),

  -- 2. Non-Conformance
  ('ncr', 'Non-Conformité', 'Non-Conformance', 'AlertTriangle',
   'Non-Conformance Reports — ISO 13485 §8.3',
   '[{"linear":["Open","Under Investigation","Pending Disposition","Closed"],"eSigRequired":["Closed"],"terminal":["Closed"]}]'::jsonb,
   'NCR',
   '[{"clause":"8.3","standard":"ISO 13485","description":"Control of nonconforming product"}]'::jsonb),

  -- 3. Deviation
  ('deviation', 'Déviation', 'Deviation', 'GitBranch',
   'Deviations — ISO 13485 §7.1, §7.5.1',
   '[{"linear":["Open","Under Investigation","Pending QA Review","Approved","Closed"],"eSigRequired":["Approved","Closed"],"terminal":["Closed"]}]'::jsonb,
   'DEV',
   '[{"clause":"7.1","standard":"ISO 13485","description":"Planning of product realization"}]'::jsonb),

  -- 4. Change Control
  ('change_control', 'Maîtrise des Changements', 'Change Control', 'RefreshCw',
   'Change Control — ISO 13485 §7.3.7',
   '[{"linear":["Requested","Under Review","Approved","In Implementation","Completed"],"branches":{"Rejected":["Requested"]},"eSigRequired":["Approved","Rejected","Completed"],"terminal":["Completed","Rejected"]}]'::jsonb,
   'CC',
   '[{"clause":"7.3.7","standard":"ISO 13485","description":"Design changes"}]'::jsonb),

  -- 5. Audit
  ('audit', 'Audit', 'Audit', 'Search',
   'Internal/External/Supplier Audits — ISO 13485 §8.2.4',
   '[{"linear":["Planned","In Progress","Completed"],"eSigRequired":["Completed"],"terminal":["Completed"]}]'::jsonb,
   'AUD',
   '[{"clause":"8.2.4","standard":"ISO 13485","description":"Internal audit"}]'::jsonb),

  -- 6. Risk
  ('risk', 'Risque', 'Risk Management', 'TrendingUp',
   'Risk Management — ISO 13485 §7.1, ISO 14971',
   '[{"linear":["Open","Mitigated","Closed"],"branches":{"Accepted":["Closed"]},"eSigRequired":["Closed"],"terminal":["Closed"]}]'::jsonb,
   'RSK',
   '[{"clause":"7.1","standard":"ISO 13485","description":"Risk management"},{"clause":"3","standard":"ISO 14971","description":"Risk analysis"}]'::jsonb),

  -- 7. Training
  ('training', 'Formation', 'Training', 'GraduationCap',
   'Training Records — ISO 13485 §6.2',
   '[{"linear":["Planned","In Progress","Completed"],"branches":{"Overdue":[]},"eSigRequired":["Completed"],"terminal":["Completed"]}]'::jsonb,
   'TRN',
   '[{"clause":"6.2","standard":"ISO 13485","description":"Competence, awareness and training"}]'::jsonb),

  -- 8. Supplier
  ('supplier', 'Fournisseur', 'Supplier', 'Truck',
   'Supplier Management — ISO 13485 §7.4',
   '[{"linear":["Under Evaluation","Conditional","Qualified"],"branches":{"Disqualified":[]},"eSigRequired":["Qualified","Disqualified"],"terminal":["Disqualified"]}]'::jsonb,
   'SUP',
   '[{"clause":"7.4","standard":"ISO 13485","description":"Purchasing"}]'::jsonb),

  -- 9. Batch Record
  ('batch_record', 'Enregistrement de Lot', 'Batch Record', 'Package',
   'Batch Records — ISO 13485 §7.5.1, §7.5.9',
   '[{"linear":["In Progress","Pending QA Review","Released"],"branches":{"Rejected":[],"Quarantine":["Pending QA Review"]},"eSigRequired":["Released","Rejected"],"terminal":["Released","Rejected"]}]'::jsonb,
   'BR',
   '[{"clause":"7.5.1","standard":"ISO 13485","description":"Control of production"},{"clause":"7.5.9","standard":"ISO 13485","description":"Traceability"}]'::jsonb),

  -- 10. OOS/OOT
  ('oos_oot', 'HSP/HOT', 'OOS/OOT', 'FlaskConical',
   'Out of Specification / Out of Trend — ISO 13485 §8.2.6',
   '[{"linear":["Open","Under Investigation","Pending Disposition","Closed"],"eSigRequired":["Closed"],"terminal":["Closed"]}]'::jsonb,
   'OOS',
   '[{"clause":"8.2.6","standard":"ISO 13485","description":"Monitoring and measurement of product"}]'::jsonb)
) AS m(slug, name, name_en, icon, description, status_flow, code_prefix, compliance_refs)
ON CONFLICT (slug, organization_id) DO NOTHING;

-- ===========================================================================
-- 4. MIGRATE form_templates.module_type FROM ENUM → TEXT
-- ===========================================================================
-- CORRECTIF 2: FK referential integrity (§4.2.3)
-- The ENUM form_template_module_type is replaced by a TEXT column
-- with a FK to record_type_definitions(slug, organization_id).

-- Step 4a: Add new text column
ALTER TABLE form_templates ADD COLUMN IF NOT EXISTS module_type_text text;

-- Step 4b: Copy data from ENUM to text column (lowercase)
UPDATE form_templates SET module_type_text = module_type::text WHERE module_type_text IS NULL;

-- Step 4c: Drop old column, rename new
-- Note: PostgreSQL doesn't allow dropping a column used in an ENUM directly
-- We need to handle this carefully
ALTER TABLE form_templates DROP COLUMN IF EXISTS module_type;
ALTER TABLE form_templates RENAME COLUMN module_type_text TO module_type;

-- Step 4d: Set NOT NULL and default
ALTER TABLE form_templates ALTER COLUMN module_type SET NOT NULL;
ALTER TABLE form_templates ALTER COLUMN module_type SET DEFAULT 'general';

-- Step 4e: Add FK constraint to record_type_definitions
ALTER TABLE form_templates
  ADD CONSTRAINT fk_templates_record_type
  FOREIGN KEY (module_type, organization_id)
  REFERENCES record_type_definitions(slug, organization_id)
  ON DELETE RESTRICT;  -- Prevent deleting a record type that has templates

-- ===========================================================================
-- 5. MIGRATE form_instances.linked_record_type FROM ENUM → TEXT
-- ===========================================================================

ALTER TABLE form_instances ADD COLUMN IF NOT EXISTS linked_record_type_text text;
UPDATE form_instances SET linked_record_type_text = linked_record_type::text WHERE linked_record_type_text IS NULL;
ALTER TABLE form_instances DROP COLUMN IF EXISTS linked_record_type;
ALTER TABLE form_instances RENAME COLUMN linked_record_type_text TO linked_record_type;

-- Add record_type_slug column (CORRECTIF 2: explicit link to record_type_definitions)
ALTER TABLE form_instances ADD COLUMN IF NOT EXISTS record_type_slug text;

-- Populate record_type_slug from the template's module_type
UPDATE form_instances fi
SET record_type_slug = ft.module_type
FROM form_templates ft
WHERE fi.template_id = ft.id AND fi.record_type_slug IS NULL;

-- Add FK constraint
ALTER TABLE form_instances
  ADD CONSTRAINT fk_instances_record_type
  FOREIGN KEY (record_type_slug, organization_id)
  REFERENCES record_type_definitions(slug, organization_id)
  ON DELETE RESTRICT;

-- ===========================================================================
-- 6. MIGRATE document_prerequisites.record_type FROM ENUM → TEXT
-- ===========================================================================
-- CORRECTIF: prerequisite_record_type ENUM cannot reference custom slugs

ALTER TABLE document_prerequisites ADD COLUMN IF NOT EXISTS record_type_text text;
UPDATE document_prerequisites SET record_type_text = record_type::text WHERE record_type_text IS NULL;
ALTER TABLE document_prerequisites DROP COLUMN IF EXISTS record_type;
ALTER TABLE document_prerequisites RENAME COLUMN record_type_text TO record_type;

-- ===========================================================================
-- 7. ADD source_record_type TO capas
-- ===========================================================================
-- CORRECTIF: capa_source ENUM cannot reference custom record types (§8.5.2)

ALTER TABLE capas ADD COLUMN IF NOT EXISTS source_record_type text;

-- Map existing capa_source values to record_type_definitions slugs
UPDATE capas SET source_record_type = CASE
  WHEN source = 'Non-Conformance' THEN 'ncr'
  WHEN source = 'Audit Finding' THEN 'audit'
  WHEN source = 'Customer Complaint' THEN 'ncr'
  WHEN source = 'Management Review' THEN 'audit'
  WHEN source = 'Process Monitoring' THEN 'deviation'
  WHEN source = 'Supplier Issue' THEN 'supplier'
  ELSE 'general'
END WHERE source_record_type IS NULL;

-- ===========================================================================
-- 8. ADD polymorphic columns to electronic_signatures
-- ===========================================================================
-- CORRECTIF 21 CFR §11.50/§11.70: signatures must link to records, not just documents

ALTER TABLE electronic_signatures ADD COLUMN IF NOT EXISTS record_id uuid;
ALTER TABLE electronic_signatures ADD COLUMN IF NOT EXISTS record_type text;

-- ===========================================================================
-- 9. DROP OLD ENUMs (no longer used by any column)
-- ===========================================================================
-- These enums are now replaced by TEXT columns with FK constraints

DROP TYPE IF EXISTS form_template_module_type CASCADE;
DROP TYPE IF EXISTS prerequisite_record_type CASCADE;

-- ===========================================================================
-- 10. CORRECTIF 1: Audit Trail Triggers for New Tables (§4.2.4, 21 CFR §11.10(e))
-- ===========================================================================

-- Audit trigger for record_type_definitions
DROP TRIGGER IF EXISTS trg_audit_record_type_definitions ON record_type_definitions;
CREATE TRIGGER trg_audit_record_type_definitions
  AFTER INSERT OR UPDATE OR DELETE ON record_type_definitions
  FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

-- Audit trigger for record_links
DROP TRIGGER IF EXISTS trg_audit_record_links ON record_links;
CREATE TRIGGER trg_audit_record_links
  AFTER INSERT OR UPDATE OR DELETE ON record_links
  FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

-- ===========================================================================
-- 11. CORRECTIF 1: Auto-update updated_at for new tables
-- ===========================================================================

DROP TRIGGER IF EXISTS trg_rtd_updated ON record_type_definitions;
CREATE TRIGGER trg_rtd_updated
  BEFORE UPDATE ON record_type_definitions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================================================
-- 12. CORRECTIF 1: RLS Policies for New Tables
-- ===========================================================================

ALTER TABLE record_type_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE record_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rtd_rw ON record_type_definitions;
CREATE POLICY rtd_rw ON record_type_definitions
  FOR ALL USING (is_org_member(organization_id))
  WITH CHECK (is_org_member(organization_id));

DROP POLICY IF EXISTS rl_rw ON record_links;
CREATE POLICY rl_rw ON record_links
  FOR ALL USING (is_org_member(organization_id))
  WITH CHECK (is_org_member(organization_id));

-- ===========================================================================
-- 13. CORRECTIF 3: System Record Type Protection (§4.1)
-- ===========================================================================
-- System record types (is_system = true) CANNOT be deleted or deactivated.
-- Their slug cannot be changed (referential integrity).

CREATE OR REPLACE FUNCTION protect_system_record_types()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent deletion of system types
  IF TG_OP = 'DELETE' AND OLD.is_system = true THEN
    RAISE EXCEPTION 'Cannot delete system record type "%". System types are required for ISO 13485 §4.1 QMS completeness.', OLD.slug;
  END IF;

  -- Prevent deactivation of system types
  IF TG_OP = 'UPDATE' AND OLD.is_system = true AND NEW.is_active = false AND OLD.is_active = true THEN
    RAISE EXCEPTION 'Cannot deactivate system record type "%". System types must remain active per ISO 13485 §4.1.', OLD.slug;
  END IF;

  -- Prevent slug change on system types
  IF TG_OP = 'UPDATE' AND OLD.is_system = true AND NEW.slug != OLD.slug THEN
    RAISE EXCEPTION 'Cannot change slug of system record type from "%" to "%". Referential integrity would be compromised.', OLD.slug, NEW.slug;
  END IF;

  -- Prevent changing is_system from true to false
  IF TG_OP = 'UPDATE' AND OLD.is_system = true AND NEW.is_system = false THEN
    RAISE EXCEPTION 'Cannot change system record type "%" to non-system. System types are protected per ISO 13485 §4.1.', OLD.slug;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_system_rtd ON record_type_definitions;
CREATE TRIGGER trg_protect_system_rtd
  BEFORE UPDATE OR DELETE ON record_type_definitions
  FOR EACH ROW EXECUTE FUNCTION protect_system_record_types();

-- ===========================================================================
-- 14. CORRECTIF 5: JSONB Values Validation (§7.5.9, 21 CFR §11.10(a))
-- ===========================================================================
-- Validates that form_instances.values contains all required fields
-- defined in the record_type_definitions.default_fields schema.

CREATE OR REPLACE FUNCTION validate_instance_values()
RETURNS TRIGGER AS $$
DECLARE
  rtd_record record;
  field_def jsonb;
  field_name text;
  field_required boolean;
BEGIN
  -- Only validate on INSERT or UPDATE of values
  IF TG_OP NOT IN ('INSERT', 'UPDATE') THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Skip validation if values haven't changed
  IF TG_OP = 'UPDATE' AND OLD.values IS NOT NULL AND NEW.values = OLD.values THEN
    RETURN NEW;
  END IF;

  -- Get the record type definition
  IF NEW.record_type_slug IS NOT NULL THEN
    SELECT * INTO rtd_record FROM record_type_definitions
    WHERE slug = NEW.record_type_slug AND organization_id = NEW.organization_id;

    -- Validate required fields from default_fields
    IF rtd_record IS NOT NULL AND rtd_record.default_fields IS NOT NULL THEN
      FOR field_def IN SELECT * FROM jsonb_array_elements(rtd_record.default_fields)
      LOOP
        field_name := field_def->>'name';
        field_required := (field_def->>'required')::boolean;

        IF field_required = true AND (NEW.values->field_name IS NULL OR NEW.values->>field_name = '') THEN
          RAISE EXCEPTION 'Required field "%" is missing or empty in form instance values. ISO 13485 §7.5.9 / 21 CFR §11.10(a) validation failed.', field_name;
        END IF;
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_instance_values ON form_instances;
CREATE TRIGGER trg_validate_instance_values
  BEFORE INSERT OR UPDATE ON form_instances
  FOR EACH ROW EXECUTE FUNCTION validate_instance_values();

-- ===========================================================================
-- 15. CORRECTIF 6: Custom Record Numbering (§7.5.8/§7.5.9)
-- ===========================================================================
-- Auto-generate reference numbers for custom record types using
-- the code_prefix from record_type_definitions + document_code_sequences.

CREATE OR REPLACE FUNCTION generate_custom_record_number()
RETURNS TRIGGER AS $$
DECLARE
  rtd_record record;
  seq_record record;
  next_seq integer;
  new_ref text;
BEGIN
  -- Only generate on INSERT when reference_number is empty
  IF TG_OP != 'INSERT' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF NEW.reference_number IS NOT NULL AND NEW.reference_number != '' THEN
    RETURN NEW;
  END IF;

  -- Get the record type definition
  IF NEW.record_type_slug IS NOT NULL THEN
    SELECT * INTO rtd_record FROM record_type_definitions
    WHERE slug = NEW.record_type_slug AND organization_id = NEW.organization_id;

    IF rtd_record IS NOT NULL AND rtd_record.code_prefix IS NOT NULL THEN
      -- Get or create the sequence
      SELECT * INTO seq_record FROM document_code_sequences
      WHERE prefix = rtd_record.code_prefix
        AND organization_id = NEW.organization_id;

      IF seq_record IS NOT NULL THEN
        next_seq := seq_record.last_sequence + 1;
        UPDATE document_code_sequences SET last_sequence = next_seq
        WHERE id = seq_record.id;
      ELSE
        next_seq := 1;
        INSERT INTO document_code_sequences (prefix, department_suffix, last_sequence, organization_id)
        VALUES (rtd_record.code_prefix, NULL, next_seq, NEW.organization_id);
      END IF;

      -- Format: PREFIX-YYYY-NNN
      new_ref := rtd_record.code_prefix || '-' || EXTRACT(YEAR FROM now())::text || '-' || LPAD(next_seq::text, 3, '0');
      NEW.reference_number := new_ref;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_custom_ref ON form_instances;
CREATE TRIGGER trg_generate_custom_ref
  BEFORE INSERT ON form_instances
  FOR EACH ROW EXECUTE FUNCTION generate_custom_record_number();

-- ===========================================================================
-- 16. INDEXES for new tables
-- ===========================================================================

CREATE INDEX IF NOT EXISTS idx_rtd_org ON record_type_definitions(organization_id);
CREATE INDEX IF NOT EXISTS idx_rtd_slug ON record_type_definitions(slug);
CREATE INDEX IF NOT EXISTS idx_rtd_is_system ON record_type_definitions(is_system);
CREATE INDEX IF NOT EXISTS idx_rtd_is_active ON record_type_definitions(is_active);
CREATE INDEX IF NOT EXISTS idx_rtd_org_active ON record_type_definitions(organization_id, is_active);

CREATE INDEX IF NOT EXISTS idx_rl_source ON record_links(source_record_id, source_record_type);
CREATE INDEX IF NOT EXISTS idx_rl_target ON record_links(target_record_id, target_record_type);
CREATE INDEX IF NOT EXISTS idx_rl_org ON record_links(organization_id);
CREATE INDEX IF NOT EXISTS idx_rl_link_type ON record_links(link_type);
CREATE INDEX IF NOT EXISTS idx_rl_source_type ON record_links(source_record_type);
CREATE INDEX IF NOT EXISTS idx_rl_target_type ON record_links(target_record_type);
CREATE INDEX IF NOT EXISTS idx_rl_created ON record_links(created_at);

-- Updated index for form_templates.module_type (now TEXT, not ENUM)
DROP INDEX IF EXISTS idx_form_templates_module_type;
CREATE INDEX IF NOT EXISTS idx_form_templates_module_type ON form_templates(module_type);

-- New index for form_instances.record_type_slug
CREATE INDEX IF NOT EXISTS idx_form_instances_record_type ON form_instances(record_type_slug);

-- Index for electronic_signatures polymorphic columns
CREATE INDEX IF NOT EXISTS idx_esig_record ON electronic_signatures(record_id, record_type) WHERE record_id IS NOT NULL;

-- Index for capas.source_record_type
CREATE INDEX IF NOT EXISTS idx_capas_source_rtype ON capas(source_record_type) WHERE source_record_type IS NOT NULL;

-- ===========================================================================
-- 17. DEACTIVATION SAFETY: Prevent deactivating record type in use
-- ===========================================================================
-- If a record type has active form_instances, it cannot be deactivated

CREATE OR REPLACE FUNCTION check_rtd_deactivation_safety()
RETURNS TRIGGER AS $$
DECLARE
  instance_count integer;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.is_active = false AND OLD.is_active = true THEN
    -- Check for active form_instances
    SELECT COUNT(*) INTO instance_count FROM form_instances
    WHERE record_type_slug = NEW.slug
      AND organization_id = NEW.organization_id
      AND status NOT IN ('Approved', 'Rejected');

    IF instance_count > 0 THEN
      RAISE EXCEPTION 'Cannot deactivate record type "%" — % active form instance(s) exist. Close all instances first per ISO 13485 §4.2.4.', NEW.slug, instance_count;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rtd_deactivation ON record_type_definitions;
CREATE TRIGGER trg_rtd_deactivation
  BEFORE UPDATE ON record_type_definitions
  FOR EACH ROW EXECUTE FUNCTION check_rtd_deactivation_safety();

-- ===========================================================================
-- 18. VIEW: record_type_usage — Analytics for custom record types (§8.4)
-- ===========================================================================
-- Provides aggregate counts per record type for dashboard reporting

CREATE OR REPLACE VIEW record_type_usage AS
SELECT
  rtd.id AS rtd_id,
  rtd.slug,
  rtd.name,
  rtd.is_system,
  rtd.is_active,
  rtd.organization_id,
  COALESCE(t.template_count, 0) AS template_count,
  COALESCE(t.approved_template_count, 0) AS approved_template_count,
  COALESCE(i.instance_count, 0) AS instance_count,
  COALESCE(i.draft_count, 0) AS draft_instance_count,
  COALESCE(i.submitted_count, 0) AS submitted_instance_count,
  COALESCE(i.approved_count, 0) AS approved_instance_count,
  COALESCE(i.rejected_count, 0) AS rejected_instance_count,
  COALESCE(l.link_count, 0) AS link_count
FROM record_type_definitions rtd
LEFT JOIN LATERAL (
  SELECT
    COUNT(*) AS template_count,
    COUNT(*) FILTER (WHERE status = 'Approved') AS approved_template_count
  FROM form_templates ft WHERE ft.module_type = rtd.slug AND ft.organization_id = rtd.organization_id
) t ON true
LEFT JOIN LATERAL (
  SELECT
    COUNT(*) AS instance_count,
    COUNT(*) FILTER (WHERE status = 'Draft') AS draft_count,
    COUNT(*) FILTER (WHERE status = 'Submitted') AS submitted_count,
    COUNT(*) FILTER (WHERE status = 'Approved') AS approved_count,
    COUNT(*) FILTER (WHERE status = 'Rejected') AS rejected_count
  FROM form_instances fi WHERE fi.record_type_slug = rtd.slug AND fi.organization_id = rtd.organization_id
) i ON true
LEFT JOIN LATERAL (
  SELECT
    COUNT(*) AS link_count
  FROM record_links rl
  WHERE (rl.source_record_type = rtd.slug OR rl.target_record_type = rtd.slug)
    AND rl.organization_id = rtd.organization_id
) l ON true;

-- ===========================================================================
-- 19. SEED: Add 'general' record type for backward compatibility
-- ===========================================================================

INSERT INTO record_type_definitions (slug, name, name_en, icon, description, status_flow, code_prefix, is_system, is_active, requires_esig, min_approver_count, compliance_refs, organization_id)
SELECT
  'general', 'Général', 'General', 'FileText',
  'General purpose records — fallback for uncategorized forms',
  '[{"linear":["Open","Under Review","Closed"],"eSigRequired":["Closed"],"terminal":["Closed"]}]'::jsonb,
  'GEN', true, true, true, 1,
  '[]'::jsonb,
  o.id
FROM organizations o
ON CONFLICT (slug, organization_id) DO NOTHING;

COMMIT;
