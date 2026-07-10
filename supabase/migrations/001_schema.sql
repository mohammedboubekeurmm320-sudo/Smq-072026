-- ============================================================================
-- Migration 001 : Schema complet — aligne sur prisma/schema.prisma
-- ============================================================================
-- SMQ ISO 13485 Pro — Supabase (PostgreSQL 15+)
--
-- Remplace les anciennes migrations 001-007 qui contenaient :
--   - Tables fantomes (audit_findings, training_records, document_hierarchy VIEW)
--   - Noms incoherents (audit_trail vs audit_trails)
--   - References a auth.users (Supabase Auth) non utilisees par l'app
--   - Politiques RLS en double ou cassees
--
-- Architecture : Multi-tenant (organization_id sur chaque table)
-- Auth : Custom (bcrypt + session cookie) — PAS Supabase Auth
-- 28 tables au total, correspondant aux 26 models Prisma + audit_config + sessions
-- ============================================================================

BEGIN;

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. organizations
-- ============================================================================
CREATE TABLE IF NOT EXISTS organizations (
  id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name                TEXT NOT NULL,
  slug                TEXT NOT NULL,
  subscription_status TEXT NOT NULL DEFAULT 'trial',
  settings            JSONB NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT organizations_slug_key UNIQUE (slug)
);

-- ============================================================================
-- 2. profiles
-- ============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email             TEXT NOT NULL,
  full_name         TEXT NOT NULL,
  role              TEXT NOT NULL DEFAULT 'operator',
  department        TEXT,
  job_title         TEXT,
  phone             TEXT,
  avatar_url        TEXT,
  password_hash     TEXT NOT NULL,
  organization_id   TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  active            BOOLEAN NOT NULL DEFAULT true,
  last_login_at     TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT profiles_email_key UNIQUE (email)
);
CREATE INDEX IF NOT EXISTS idx_profiles_org ON profiles(organization_id);

-- ============================================================================
-- 3. organization_members
-- ============================================================================
CREATE TABLE IF NOT EXISTS organization_members (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  organization_id   TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  profile_id        TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role              TEXT NOT NULL DEFAULT 'member',
  status            TEXT NOT NULL DEFAULT 'active',
  invited_by_id     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT org_members_org_profile UNIQUE (organization_id, profile_id)
);
CREATE INDEX IF NOT EXISTS idx_org_members_profile ON organization_members(profile_id);

-- ============================================================================
-- 4. sessions
-- ============================================================================
CREATE TABLE IF NOT EXISTS sessions (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  token        TEXT NOT NULL,
  profile_id   TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  expires_at   TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT sessions_token_key UNIQUE (token)
);
CREATE INDEX IF NOT EXISTS idx_sessions_profile ON sessions(profile_id);

-- ============================================================================
-- 5. departments
-- ============================================================================
CREATE TABLE IF NOT EXISTS departments (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code              TEXT NOT NULL,
  label_fr          TEXT NOT NULL,
  label_en          TEXT NOT NULL,
  category          TEXT NOT NULL,
  parent_code       TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  organization_id   TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT departments_code_key UNIQUE (code)
);

-- ============================================================================
-- 6. documents
-- ============================================================================
CREATE TABLE IF NOT EXISTS documents (
  id                        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  document_number           TEXT NOT NULL,
  title                     TEXT NOT NULL,
  doc_type                  TEXT NOT NULL,
  version                   TEXT NOT NULL DEFAULT '1.0',
  status                    TEXT NOT NULL DEFAULT 'Draft',
  classification            TEXT NOT NULL DEFAULT 'Internal',
  code                      TEXT,
  iso_clause                TEXT,
  document_level            INTEGER NOT NULL DEFAULT 4,
  parent_document_id        TEXT,
  department_code           TEXT,
  is_prerequisite           BOOLEAN NOT NULL DEFAULT false,
  review_cycle_months       INTEGER NOT NULL DEFAULT 12,
  validation_phase          TEXT,
  effective_date            TIMESTAMPTZ,
  expiration_date           TIMESTAMPTZ,
  last_reviewed             TIMESTAMPTZ,
  next_review               TIMESTAMPTZ,
  owner                     TEXT,
  retention_period          TEXT,
  doc_scope                 TEXT,
  doc_references            TEXT,
  content                   TEXT,
  summary                   TEXT,
  is_template               BOOLEAN NOT NULL DEFAULT false,
  template_reference_id     TEXT,
  template_reference_version TEXT,
  type_specific_data        JSONB,
  custom_fields_json        JSONB,
  organization_id           TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  author_id                 TEXT REFERENCES profiles(id),
  created_by_id             TEXT,
  approver_id               TEXT REFERENCES profiles(id),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT documents_org_doc_number UNIQUE (organization_id, document_number)
);
CREATE INDEX IF NOT EXISTS idx_documents_org ON documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(organization_id, doc_type);

-- ============================================================================
-- 7. electronic_signatures
-- ============================================================================
CREATE TABLE IF NOT EXISTS electronic_signatures (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  document_id       TEXT REFERENCES documents(id) ON DELETE CASCADE,
  record_id         TEXT,
  record_type       TEXT,
  signed_by_id      TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  signer_name       TEXT NOT NULL,
  signer_role       TEXT NOT NULL,
  signature_type    TEXT NOT NULL,
  signature_hash    TEXT NOT NULL,
  user_agent        TEXT,
  revoked           BOOLEAN NOT NULL DEFAULT false,
  revocation_reason TEXT,
  organization_id   TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_esig_org ON electronic_signatures(organization_id);
CREATE INDEX IF NOT EXISTS idx_esig_record ON electronic_signatures(record_id, record_type);

-- ============================================================================
-- 8. document_prerequisites
-- ============================================================================
CREATE TABLE IF NOT EXISTS document_prerequisites (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  organization_id   TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  record_type       TEXT NOT NULL,
  required_doc_type TEXT NOT NULL,
  required_doc_ref  TEXT,
  is_mandatory      BOOLEAN NOT NULL DEFAULT true,
  description       TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_doc_prereq_org ON document_prerequisites(organization_id);

-- ============================================================================
-- 9. document_triggers
-- ============================================================================
CREATE TABLE IF NOT EXISTS document_triggers (
  id                 TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  source_document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  target_document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  trigger_type       TEXT NOT NULL,
  description        TEXT,
  is_mandatory       BOOLEAN NOT NULL DEFAULT false,
  organization_id    TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_doc_triggers_org ON document_triggers(organization_id);

-- ============================================================================
-- 10. document_relationships
-- ============================================================================
CREATE TABLE IF NOT EXISTS document_relationships (
  id                   TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  parent_document_id   TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  child_document_id    TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  relationship_type    TEXT NOT NULL,
  organization_id      TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_doc_rels_org ON document_relationships(organization_id);

-- ============================================================================
-- 11. document_code_sequences
-- ============================================================================
CREATE TABLE IF NOT EXISTS document_code_sequences (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  prefix            TEXT NOT NULL,
  department_suffix TEXT,
  last_sequence     INTEGER NOT NULL DEFAULT 0,
  organization_id   TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT doc_code_seq_prefix_dept_org UNIQUE (prefix, department_suffix, organization_id)
);

-- ============================================================================
-- 12. form_templates (Layer 1 ISO 13485 4.2.3)
-- ============================================================================
CREATE TABLE IF NOT EXISTS form_templates (
  id                    TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  document_id           TEXT REFERENCES documents(id),
  title                 TEXT NOT NULL,
  version               TEXT NOT NULL DEFAULT '1.0',
  description           TEXT,
  fields_json           JSONB NOT NULL DEFAULT '[]',
  is_active             BOOLEAN NOT NULL DEFAULT true,
  status                TEXT NOT NULL DEFAULT 'Draft',
  module_type           TEXT NOT NULL,
  workflow_json         JSONB,
  compliance_json       JSONB,
  signatures_json       JSONB NOT NULL DEFAULT '[]',
  current_approval_step INTEGER NOT NULL DEFAULT 0,
  previous_version_id   TEXT,
  effective_date        TIMESTAMPTZ,
  review_comment        TEXT,
  organization_id       TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by_id         TEXT REFERENCES profiles(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_form_templates_org ON form_templates(organization_id);

-- ============================================================================
-- 13. form_instances (Layer 2 ISO 13485 4.2.4)
-- ============================================================================
CREATE TABLE IF NOT EXISTS form_instances (
  id                    TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  template_id           TEXT NOT NULL REFERENCES form_templates(id) ON DELETE CASCADE,
  template_version      TEXT,
  reference_number      TEXT,
  values_json           JSONB NOT NULL DEFAULT '{}',
  status                TEXT NOT NULL DEFAULT 'Draft',
  is_locked             BOOLEAN NOT NULL DEFAULT false,
  submitted_by_id       TEXT,
  submitted_at          TIMESTAMPTZ,
  signature_hash        TEXT,
  signatures_json       JSONB NOT NULL DEFAULT '[]',
  current_approval_step INTEGER NOT NULL DEFAULT 0,
  approval_history_json JSONB NOT NULL DEFAULT '[]',
  parent_document_id    TEXT,
  linked_record_id      TEXT,
  linked_record_type    TEXT,
  record_type_slug      TEXT,
  organization_id       TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by_id         TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_form_instances_org ON form_instances(organization_id);

-- ============================================================================
-- 14. capas
-- ============================================================================
CREATE TABLE IF NOT EXISTS capas (
  id                                   TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  capa_number                          TEXT NOT NULL,
  title                                TEXT NOT NULL,
  capa_type                            TEXT NOT NULL DEFAULT 'Corrective',
  status                               TEXT NOT NULL DEFAULT 'Open',
  priority                             TEXT NOT NULL DEFAULT 'Medium',
  source                               TEXT NOT NULL DEFAULT 'Non-Conformance',
  source_reference_id                  TEXT,
  source_record_type                   TEXT,
  description                          TEXT,
  problem_statement                    TEXT,
  investigation_details                TEXT,
  root_cause_analysis                  TEXT,
  root_cause_category                  TEXT,
  five_whys_json                       JSONB NOT NULL DEFAULT '[]',
  corrective_action                    TEXT,
  effectiveness_verification_method    TEXT,
  effectiveness_criteria               TEXT,
  effectiveness_result                 TEXT,
  linked_document_id                   TEXT,
  linked_ncr_id                        TEXT,
  linked_audit_id                      TEXT,
  linked_capa_id                       TEXT,
  template_id                          TEXT,
  template_version                     TEXT,
  assigned_to_id                       TEXT REFERENCES profiles(id),
  owner_id                             TEXT REFERENCES profiles(id),
  due_date                             TIMESTAMPTZ,
  created_date                         TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_date                          TIMESTAMPTZ,
  organization_id                      TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by_id                        TEXT,
  created_at                           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_capas_org ON capas(organization_id);
CREATE INDEX IF NOT EXISTS idx_capas_status ON capas(organization_id, status);

-- ============================================================================
-- 15. non_conformances
-- ============================================================================
CREATE TABLE IF NOT EXISTS non_conformances (
  id                       TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  ncr_number               TEXT NOT NULL,
  title                    TEXT NOT NULL,
  ncr_type                 TEXT NOT NULL DEFAULT 'Process',
  status                   TEXT NOT NULL DEFAULT 'Open',
  severity                 TEXT NOT NULL DEFAULT 'Minor',
  source                   TEXT,
  description              TEXT,
  lot_number               TEXT,
  quantity_affected        TEXT,
  disposition              TEXT NOT NULL DEFAULT 'Pending',
  is_oos_oot               BOOLEAN NOT NULL DEFAULT false,
  analytical_method        TEXT,
  measured_value           REAL,
  measured_unit            TEXT,
  spec_limit               TEXT,
  phase1_conclusion        TEXT,
  phase2_required          BOOLEAN NOT NULL DEFAULT false,
  phase2_conclusion        TEXT,
  reject_lot               BOOLEAN NOT NULL DEFAULT false,
  linked_capa_id           TEXT,
  linked_procedure_ref     TEXT,
  supplier_id              TEXT,
  impact_assessment        TEXT,
  containment_actions      TEXT,
  affected_product         TEXT,
  closed_signature_hash    TEXT,
  closed_signed_at         TIMESTAMPTZ,
  closed_by_id             TEXT,
  closed_reason            TEXT,
  assigned_to_id           TEXT REFERENCES profiles(id),
  owner_id                 TEXT REFERENCES profiles(id),
  due_date                 TIMESTAMPTZ,
  created_date             TIMESTAMPTZ NOT NULL DEFAULT now(),
  organization_id          TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ncrs_org ON non_conformances(organization_id);
CREATE INDEX IF NOT EXISTS idx_ncrs_status ON non_conformances(organization_id, status);

-- ============================================================================
-- 16. deviations
-- ============================================================================
CREATE TABLE IF NOT EXISTS deviations (
  id                           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  dev_number                   TEXT NOT NULL,
  title                        TEXT NOT NULL,
  deviation_type               TEXT NOT NULL DEFAULT 'Unplanned',
  status                       TEXT NOT NULL DEFAULT 'Open',
  severity                     TEXT NOT NULL DEFAULT 'Minor',
  category                     TEXT NOT NULL DEFAULT 'Process',
  description                  TEXT,
  deviation_details            TEXT,
  justification                TEXT,
  risk_assessment              TEXT,
  corrective_action            TEXT,
  preventive_action            TEXT,
  sop_reference                TEXT,
  expected_result              TEXT,
  actual_result                TEXT,
  product_stage                TEXT,
  quarantine                   BOOLEAN NOT NULL DEFAULT false,
  impact_on_validated_state    TEXT,
  impact_on_regulatory_filing  TEXT,
  containment_action           TEXT,
  detected_date                TIMESTAMPTZ,
  is_planned_deviation         BOOLEAN NOT NULL DEFAULT false,
  lot_number                   TEXT,
  product_code                 TEXT,
  quantity_affected            TEXT,
  linked_capa_id               TEXT,
  linked_document_id           TEXT,
  assigned_to_id               TEXT REFERENCES profiles(id),
  owner_id                     TEXT REFERENCES profiles(id),
  due_date                     TIMESTAMPTZ,
  closed_date                  TIMESTAMPTZ,
  organization_id              TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at                   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_deviations_org ON deviations(organization_id);

-- ============================================================================
-- 17. change_controls
-- ============================================================================
CREATE TABLE IF NOT EXISTS change_controls (
  id                                 TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  cc_number                          TEXT NOT NULL,
  title                              TEXT NOT NULL,
  cc_type                            TEXT NOT NULL DEFAULT 'Planned',
  status                             TEXT NOT NULL DEFAULT 'Requested',
  priority                           TEXT NOT NULL DEFAULT 'Medium',
  category                           TEXT NOT NULL DEFAULT 'Process',
  description                        TEXT,
  justification                      TEXT,
  proposed_change                    TEXT,
  detailed_change_description        TEXT,
  business_compliance_justification  TEXT,
  risk_assessment                    TEXT,
  impact_analysis                    TEXT,
  affected_areas                     TEXT,
  impact_on_validated_systems        BOOLEAN NOT NULL DEFAULT false,
  implementation_plan                TEXT,
  implementation_date                TIMESTAMPTZ,
  estimated_cost_impact              TEXT,
  completion_date                    TIMESTAMPTZ,
  regulatory_trigger                 TEXT,
  emergency_flag                     BOOLEAN NOT NULL DEFAULT false,
  linked_document_id                 TEXT,
  linked_capa_id                     TEXT,
  additional_references             TEXT,
  assigned_to_id                     TEXT,
  requested_by_id                    TEXT REFERENCES profiles(id),
  approved_by_id                     TEXT REFERENCES profiles(id),
  approver_id                        TEXT REFERENCES profiles(id),
  owner_id                           TEXT REFERENCES profiles(id),
  due_date                           TIMESTAMPTZ,
  organization_id                    TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at                         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_change_controls_org ON change_controls(organization_id);

-- ============================================================================
-- 18. audits
-- ============================================================================
CREATE TABLE IF NOT EXISTS audits (
  id                       TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  audit_number              TEXT NOT NULL,
  title                     TEXT NOT NULL,
  audit_type                TEXT NOT NULL DEFAULT 'Internal',
  status                    TEXT NOT NULL DEFAULT 'Planned',
  audit_scope               TEXT,
  scheduled_date            TIMESTAMPTZ,
  completed_date            TIMESTAMPTZ,
  lead_auditor_id           TEXT REFERENCES profiles(id),
  auditees_json             JSONB NOT NULL DEFAULT '[]',
  findings_json             JSONB NOT NULL DEFAULT '[]',
  audit_criteria            TEXT,
  compliance_rating         TEXT,
  completed_signature_hash  TEXT,
  completed_signed_at       TIMESTAMPTZ,
  completed_signed_by_id    TEXT REFERENCES profiles(id),
  organization_id           TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audits_org ON audits(organization_id);

-- ============================================================================
-- 19. risks
-- ============================================================================
CREATE TABLE IF NOT EXISTS risks (
  id                     TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  risk_number            TEXT NOT NULL,
  title                  TEXT NOT NULL,
  category               TEXT NOT NULL DEFAULT 'Process',
  status                 TEXT NOT NULL DEFAULT 'Open',
  hazard_description     TEXT,
  risk_owner             TEXT,
  regulatory_reference   TEXT,
  control_type           TEXT,
  verification_method    TEXT,
  risk_acceptability     TEXT NOT NULL DEFAULT 'ALARP',
  priority_notes         TEXT,
  probability            INTEGER NOT NULL DEFAULT 3,
  impact                 INTEGER NOT NULL DEFAULT 3,
  detectability          INTEGER NOT NULL DEFAULT 3,
  rpn                    INTEGER NOT NULL DEFAULT 27,
  risk_level             TEXT NOT NULL DEFAULT 'Medium',
  mitigation             TEXT,
  residual_risk          TEXT,
  residual_probability   INTEGER,
  residual_impact        INTEGER,
  residual_detectability INTEGER,
  residual_rpn           INTEGER,
  linked_document_id     TEXT,
  linked_capa_id         TEXT,
  owner_id               TEXT REFERENCES profiles(id),
  organization_id        TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_risks_org ON risks(organization_id);

-- ============================================================================
-- 20. training
-- ============================================================================
CREATE TABLE IF NOT EXISTS training (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title            TEXT NOT NULL,
  description      TEXT,
  training_type    TEXT NOT NULL DEFAULT 'SOP',
  status           TEXT NOT NULL DEFAULT 'Planned',
  assigned_to_id   TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  due_date         TIMESTAMPTZ,
  completed_date   TIMESTAMPTZ,
  document_id      TEXT,
  metadata_json    JSONB,
  organization_id  TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_training_org ON training(organization_id);

-- ============================================================================
-- 21. batch_records
-- ============================================================================
CREATE TABLE IF NOT EXISTS batch_records (
  id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  lot_number          TEXT NOT NULL,
  product_name        TEXT NOT NULL,
  product_code        TEXT,
  batch_size          TEXT,
  batch_size_unit     TEXT NOT NULL DEFAULT 'units',
  master_formula_id   TEXT,
  sop_reference       TEXT,
  manufacturing_date  TIMESTAMPTZ,
  expiry_date         TIMESTAMPTZ,
  status              TEXT NOT NULL DEFAULT 'In Progress',
  is_locked           BOOLEAN NOT NULL DEFAULT false,
  qa_release_date     TIMESTAMPTZ,
  qa_released_by_id   TEXT REFERENCES profiles(id),
  steps_json          JSONB NOT NULL DEFAULT '[]',
  raw_materials_json  JSONB NOT NULL DEFAULT '[]',
  organization_id     TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_batch_records_org ON batch_records(organization_id);

-- ============================================================================
-- 22. suppliers
-- ============================================================================
CREATE TABLE IF NOT EXISTS suppliers (
  id                        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  supplier_code             TEXT NOT NULL,
  name                      TEXT NOT NULL,
  category                  TEXT NOT NULL DEFAULT 'Raw Material',
  status                    TEXT NOT NULL DEFAULT 'Under Evaluation',
  qualification_date        TIMESTAMPTZ,
  next_review_date          TIMESTAMPTZ,
  certifications_json       JSONB NOT NULL DEFAULT '[]',
  performance_score         REAL,
  qualification_doc_id      TEXT,
  qualification_method      TEXT,
  qualification_doc_ref     TEXT,
  website                   TEXT,
  primary_contact_name      TEXT,
  primary_contact_email     TEXT,
  primary_contact_phone     TEXT,
  street                    TEXT,
  city                      TEXT,
  state_province            TEXT,
  postal_code               TEXT,
  country                   TEXT,
  emergency_contact_name    TEXT,
  emergency_contact_phone   TEXT,
  notes                     TEXT,
  organization_id           TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_suppliers_org ON suppliers(organization_id);

-- ============================================================================
-- 23. audit_trails (blockchain HMAC-SHA256 ISO 13485 4.2.4 / 21 CFR Part 11)
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_trails (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  sequence_number  BIGINT,
  previous_hash    TEXT,
  hash             TEXT,
  audit_action     TEXT NOT NULL,
  table_name       TEXT NOT NULL,
  record_id        TEXT NOT NULL,
  user_id          TEXT,
  user_email       TEXT,
  old_values_json  JSONB,
  new_values_json  JSONB,
  ip_address       TEXT,
  user_agent       TEXT,
  organization_id  TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_trails_org ON audit_trails(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_trails_org_seq ON audit_trails(organization_id, sequence_number);
CREATE UNIQUE INDEX IF NOT EXISTS idx_audit_trails_org_seq_unique
  ON audit_trails(organization_id, sequence_number) WHERE sequence_number IS NOT NULL;

-- ============================================================================
-- 24. record_type_definitions
-- ============================================================================
CREATE TABLE IF NOT EXISTS record_type_definitions (
  id                   TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  slug                 TEXT NOT NULL,
  name                 TEXT NOT NULL,
  name_en              TEXT,
  icon                 TEXT NOT NULL DEFAULT 'FileText',
  description          TEXT,
  status_flow_json     JSONB NOT NULL DEFAULT '[]',
  default_fields_json  JSONB NOT NULL DEFAULT '[]',
  compliance_refs_json JSONB NOT NULL DEFAULT '[]',
  code_prefix          TEXT,
  is_system            BOOLEAN NOT NULL DEFAULT false,
  is_active            BOOLEAN NOT NULL DEFAULT true,
  requires_esig        BOOLEAN NOT NULL DEFAULT false,
  min_approver_count   INTEGER NOT NULL DEFAULT 1,
  effective_date       TIMESTAMPTZ,
  previous_version_id  TEXT,
  version              INTEGER NOT NULL DEFAULT 1,
  change_reason        TEXT,
  organization_id      TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by_id        TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT rtd_org_slug UNIQUE (organization_id, slug)
);
CREATE INDEX IF NOT EXISTS idx_rtd_org ON record_type_definitions(organization_id);

-- ============================================================================
-- 25. record_links (polymorphic)
-- ============================================================================
CREATE TABLE IF NOT EXISTS record_links (
  id                 TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  source_record_id   TEXT NOT NULL,
  source_record_type TEXT NOT NULL,
  target_record_id   TEXT NOT NULL,
  target_record_type TEXT NOT NULL,
  link_type          TEXT NOT NULL DEFAULT 'related',
  description        TEXT,
  organization_id    TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by_id      TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT record_links_unique UNIQUE (source_record_id, source_record_type, target_record_id, target_record_type, link_type)
);
CREATE INDEX IF NOT EXISTS idx_record_links_org ON record_links(organization_id);
CREATE INDEX IF NOT EXISTS idx_record_links_source ON record_links(source_record_id, source_record_type);

-- ============================================================================
-- 26. custom_field_definitions
-- ============================================================================
CREATE TABLE IF NOT EXISTS custom_field_definitions (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name             TEXT NOT NULL,
  label            TEXT NOT NULL,
  type             TEXT NOT NULL DEFAULT 'text',
  required         BOOLEAN NOT NULL DEFAULT false,
  options_json     JSONB NOT NULL DEFAULT '[]',
  applicable_to    TEXT NOT NULL DEFAULT '*',
  organization_id  TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 27. scheduled_reports
-- ============================================================================
CREATE TABLE IF NOT EXISTS scheduled_reports (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name             TEXT NOT NULL,
  report_type      TEXT NOT NULL,
  format           TEXT NOT NULL DEFAULT 'pdf',
  frequency        TEXT NOT NULL DEFAULT 'monthly',
  recipients_json  JSONB NOT NULL DEFAULT '[]',
  filters_json     JSONB NOT NULL DEFAULT '{}',
  status           TEXT NOT NULL DEFAULT 'active',
  last_run_at      TIMESTAMPTZ,
  next_run_at      TIMESTAMPTZ,
  last_result      TEXT,
  organization_id  TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 28. audit_config (singleton — HMAC signing salt)
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_config (
  id            TEXT PRIMARY KEY DEFAULT 'singleton',
  signing_salt  TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT audit_config_singleton CHECK (id = 'singleton')
);

INSERT INTO audit_config (id, signing_salt)
SELECT 'singleton', encode(gen_random_bytes(32), 'hex')
WHERE NOT EXISTS (SELECT 1 FROM audit_config WHERE id = 'singleton');

-- ============================================================================
-- updated_at auto-trigger
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'organizations','profiles','documents','form_templates','form_instances',
    'capas','non_conformances','deviations','change_controls','audits',
    'risks','training','batch_records','suppliers','record_type_definitions',
    'document_code_sequences','scheduled_reports'
  ]) LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_updated_at_%I ON %I; '||
      'CREATE TRIGGER trg_updated_at_%I BEFORE UPDATE ON %I '||
      'FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();',
      t, t, t, t
    );
  END LOOP;
END $$;

COMMIT;
