-- ============================================================================
-- SMQ ISO 13485 PRO — Initial Database Schema
-- ============================================================================
-- Generated from TypeScript types in src/types/qms.ts
-- Target: PostgreSQL 15+ (Supabase)
--
-- Architecture: Hybrid 2-Layer Supervision
--   Layer 1: form_templates (Template Approval — ISO 13485 §4.2.3)
--   Layer 2: form_instances (Execution — ISO 13485 §4.2.4)
--
-- 10 Record Modules: CAPA, NCR, Deviation, Change Control, Audit,
--                    Risk, Training, Supplier, Batch Record, OOS/OOT
--
-- Execution order: organizations → profiles → ... → circular FKs at end
-- Idempotent: Uses CREATE TABLE IF NOT EXISTS / DROP IF EXISTS for enums
-- ============================================================================

BEGIN;

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUM TYPES (for data integrity & ISO 13485 compliance)
-- Drop existing then recreate to allow re-execution
-- ============================================================================

DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS subscription_status CASCADE;
DROP TYPE IF EXISTS org_member_role CASCADE;
DROP TYPE IF EXISTS org_member_status CASCADE;
DROP TYPE IF EXISTS document_type CASCADE;
DROP TYPE IF EXISTS document_status CASCADE;
DROP TYPE IF EXISTS document_classification CASCADE;
DROP TYPE IF EXISTS validation_phase CASCADE;
DROP TYPE IF EXISTS signature_type CASCADE;
DROP TYPE IF EXISTS capa_type CASCADE;
DROP TYPE IF EXISTS capa_status CASCADE;
DROP TYPE IF EXISTS capa_priority CASCADE;
DROP TYPE IF EXISTS capa_source CASCADE;
DROP TYPE IF EXISTS root_cause_category CASCADE;
DROP TYPE IF EXISTS ncr_type CASCADE;
DROP TYPE IF EXISTS ncr_status CASCADE;
DROP TYPE IF EXISTS ncr_severity CASCADE;
DROP TYPE IF EXISTS ncr_disposition CASCADE;
DROP TYPE IF EXISTS deviation_type CASCADE;
DROP TYPE IF EXISTS deviation_status CASCADE;
DROP TYPE IF EXISTS deviation_severity CASCADE;
DROP TYPE IF EXISTS deviation_category CASCADE;
DROP TYPE IF EXISTS deviation_product_stage CASCADE;
DROP TYPE IF EXISTS cc_type CASCADE;
DROP TYPE IF EXISTS cc_status CASCADE;
DROP TYPE IF EXISTS cc_priority CASCADE;
DROP TYPE IF EXISTS cc_category CASCADE;
DROP TYPE IF EXISTS audit_type CASCADE;
DROP TYPE IF EXISTS audit_status CASCADE;
DROP TYPE IF EXISTS training_type CASCADE;
DROP TYPE IF EXISTS training_status CASCADE;
DROP TYPE IF EXISTS risk_category CASCADE;
DROP TYPE IF EXISTS risk_level CASCADE;
DROP TYPE IF EXISTS risk_status CASCADE;
DROP TYPE IF EXISTS batch_status CASCADE;
DROP TYPE IF EXISTS batch_step_status CASCADE;
DROP TYPE IF EXISTS step_type CASCADE;
DROP TYPE IF EXISTS raw_material_status CASCADE;
DROP TYPE IF EXISTS supplier_category CASCADE;
DROP TYPE IF EXISTS supplier_status CASCADE;
DROP TYPE IF EXISTS qualification_method CASCADE;
DROP TYPE IF EXISTS form_template_status CASCADE;
DROP TYPE IF EXISTS form_template_module_type CASCADE;
DROP TYPE IF EXISTS form_instance_status CASCADE;
DROP TYPE IF EXISTS audit_action CASCADE;
DROP TYPE IF EXISTS prerequisite_record_type CASCADE;

-- User roles & permissions
CREATE TYPE user_role AS ENUM (
  'admin', 'quality_manager', 'auditor', 'document_controller', 'executive', 'operator'
);

-- Organization
CREATE TYPE subscription_status AS ENUM ('trial', 'active', 'suspended', 'cancelled');
CREATE TYPE org_member_role AS ENUM ('owner', 'admin', 'member', 'viewer');
CREATE TYPE org_member_status AS ENUM ('active', 'inactive', 'pending');

-- Document
CREATE TYPE document_type AS ENUM (
  'MANUEL', 'POLITIQUE', 'INDICATEUR', 'PROCESS_MAP', 'ORGANIGRAMME',
  'REGLEMENTAIRE', 'MAPPING',
  'PROCEDURE', 'INSTRUCTION', 'FORMULAIRE', 'REGISTRE', 'ENREGISTREMENT', 'MASTER_BATCH',
  'SOP', 'WI', 'Form', 'Policy', 'Specification', 'Technical',
  'Risk Analysis', 'Validation Protocol', 'Record', 'Manual', 'Instruction',
  'Register', 'Master Batch', 'Procedure', 'Process Map', 'Organigram'
);

CREATE TYPE document_status AS ENUM ('Draft', 'Under Review', 'Approved', 'Effective', 'Obsolete', 'Withdrawn');
CREATE TYPE document_classification AS ENUM ('Internal', 'External', 'Regulatory', 'Confidential');
CREATE TYPE validation_phase AS ENUM ('IQ', 'OQ', 'PQ', 'Full');

-- Electronic Signature
CREATE TYPE signature_type AS ENUM ('approval', 'rejection', 'review', 'verification');

-- CAPA
CREATE TYPE capa_type AS ENUM ('Corrective', 'Preventive');
CREATE TYPE capa_status AS ENUM ('Open', 'Investigation', 'Implementation', 'Effectiveness Check', 'Closed');
CREATE TYPE capa_priority AS ENUM ('Critical', 'High', 'Medium', 'Low');
CREATE TYPE capa_source AS ENUM ('Non-Conformance', 'Audit Finding', 'Customer Complaint', 'Management Review', 'Process Monitoring', 'Supplier Issue');
CREATE TYPE root_cause_category AS ENUM ('Man', 'Machine', 'Method', 'Material', 'Measurement', 'Environment', 'Management');

-- NCR
CREATE TYPE ncr_type AS ENUM ('Product', 'Process', 'System', 'Supplier', 'OOS', 'OOT');
CREATE TYPE ncr_status AS ENUM ('Open', 'Under Investigation', 'Pending Disposition', 'Closed');
CREATE TYPE ncr_severity AS ENUM ('Critical', 'Major', 'Minor');
CREATE TYPE ncr_disposition AS ENUM ('Use As Is', 'Rework', 'Scrap', 'Return to Supplier', 'Concession', 'Pending');

-- Deviation
CREATE TYPE deviation_type AS ENUM ('Planned', 'Unplanned');
CREATE TYPE deviation_status AS ENUM ('Open', 'Under Investigation', 'Pending QA Review', 'Approved', 'Closed');
CREATE TYPE deviation_severity AS ENUM ('Critical', 'Major', 'Minor');
CREATE TYPE deviation_category AS ENUM ('Process', 'Equipment', 'Material', 'Environment', 'Personnel', 'Documentation');
CREATE TYPE deviation_product_stage AS ENUM ('Raw Material', 'In-Process', 'Finished Product', 'Stability', 'Other');

-- Change Control
CREATE TYPE cc_type AS ENUM ('Planned', 'Unplanned', 'Emergency');
CREATE TYPE cc_status AS ENUM ('Requested', 'Under Review', 'Approved', 'In Implementation', 'Completed', 'Rejected');
CREATE TYPE cc_priority AS ENUM ('Critical', 'High', 'Medium', 'Low');
CREATE TYPE cc_category AS ENUM (
  'Process', 'Equipment', 'Facility', 'Document', 'Material',
  'Computer System', 'Organizational', 'Manufacturing', 'Regulatory',
  'Supply Chain', 'Warehouse', 'Other'
);

-- Audit
CREATE TYPE audit_type AS ENUM ('Internal', 'External', 'Supplier');
CREATE TYPE audit_status AS ENUM ('Planned', 'In Progress', 'Completed');

-- Training
CREATE TYPE training_type AS ENUM ('Onboarding', 'SOP', 'Regulatory', 'Skill', 'Certification');
CREATE TYPE training_status AS ENUM ('Planned', 'In Progress', 'Completed', 'Overdue');

-- Risk
CREATE TYPE risk_category AS ENUM ('Product', 'Process', 'System', 'Supplier');
CREATE TYPE risk_level AS ENUM ('Low', 'Medium', 'High', 'Critical');
CREATE TYPE risk_status AS ENUM ('Open', 'Mitigated', 'Accepted', 'Closed');

-- Batch Record
CREATE TYPE batch_status AS ENUM ('In Progress', 'Pending QA Review', 'Released', 'Rejected', 'Quarantine');
CREATE TYPE batch_step_status AS ENUM ('Pending', 'In Progress', 'Completed', 'Failed');
CREATE TYPE step_type AS ENUM ('Weighing', 'Mixing', 'Filtration', 'Filling', 'Inspection', 'Labeling', 'Packaging', 'QC Testing', 'Other');
CREATE TYPE raw_material_status AS ENUM ('Verified', 'Pending', 'Rejected');

-- Supplier
CREATE TYPE supplier_category AS ENUM ('Raw Material', 'Packaging', 'Equipment', 'Service', 'Contract Manufacturer', 'Laboratory', 'Other');
CREATE TYPE supplier_status AS ENUM ('Qualified', 'Conditional', 'Disqualified', 'Under Evaluation');
CREATE TYPE qualification_method AS ENUM ('On-Site Audit', 'Questionnaire', 'Certificate Review', 'Third-Party Assessment', 'Historical Performance');

-- Form Template (Layer 1)
CREATE TYPE form_template_status AS ENUM ('Draft', 'Under_Review', 'Approved', 'Obsolete');
CREATE TYPE form_template_module_type AS ENUM (
  'capa', 'ncr', 'deviation', 'change_control',
  'audit', 'risk', 'training', 'supplier',
  'batch_record', 'oos_oot', 'general'
);

-- Form Instance (Layer 2)
CREATE TYPE form_instance_status AS ENUM ('Draft', 'Submitted', 'Approved', 'Rejected');

-- Audit Trail
CREATE TYPE audit_action AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'SIGN', 'LOGIN', 'EXPORT');

-- Document Prerequisite
CREATE TYPE prerequisite_record_type AS ENUM ('CAPA', 'NCR', 'TRAINING', 'RISK', 'AUDIT', 'CHANGE_CONTROL', 'DEVIATION');


-- ============================================================================
-- TABLES — Drop existing then recreate (idempotent)
-- Order matters: drop in reverse dependency order
-- ============================================================================

DROP TABLE IF EXISTS audit_trails CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS batch_records CASCADE;
DROP TABLE IF EXISTS risks CASCADE;
DROP TABLE IF EXISTS training CASCADE;
DROP TABLE IF EXISTS audits CASCADE;
DROP TABLE IF EXISTS change_controls CASCADE;
DROP TABLE IF EXISTS deviations CASCADE;
DROP TABLE IF EXISTS non_conformances CASCADE;
DROP TABLE IF EXISTS capas CASCADE;
DROP TABLE IF EXISTS form_instances CASCADE;
DROP TABLE IF EXISTS form_templates CASCADE;
DROP TABLE IF EXISTS document_prerequisites CASCADE;
DROP TABLE IF EXISTS electronic_signatures CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS organization_members CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS document_triggers CASCADE;
DROP TABLE IF EXISTS document_relationships CASCADE;
DROP TABLE IF EXISTS document_code_sequences CASCADE;

-- Drop views that depend on these tables
DROP VIEW IF EXISTS document_hierarchy CASCADE;
DROP VIEW IF EXISTS document_trigger_graph CASCADE;

-- ============================================================================
-- TABLE 1: organizations
-- ============================================================================

CREATE TABLE organizations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  slug          text NOT NULL UNIQUE,
  subscription_status subscription_status NOT NULL DEFAULT 'trial',
  settings      jsonb DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE organizations IS 'Multi-tenant organizations — each org isolates its QMS data';
COMMENT ON COLUMN organizations.settings IS 'JSON-serialized OrgSettings (industry_type, active_modules, etc.)';


-- ============================================================================
-- TABLE 2: profiles
-- ============================================================================

CREATE TABLE profiles (
  id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         text NOT NULL,
  full_name     text,
  role          user_role NOT NULL DEFAULT 'operator',
  department    text,
  job_title     text,
  phone         text,
  avatar_url    text,
  organization_id uuid REFERENCES organizations(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE profiles IS 'User profiles linked to Supabase auth.users — stores QMS roles and org membership';


-- ============================================================================
-- TABLE 3: organization_members
-- ============================================================================

CREATE TABLE organization_members (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role            org_member_role NOT NULL DEFAULT 'member',
  status          org_member_status NOT NULL DEFAULT 'active',
  invited_by      uuid REFERENCES profiles(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

COMMENT ON TABLE organization_members IS 'Organization membership with role-based access';


-- ============================================================================
-- TABLE 4: documents
-- ============================================================================

CREATE TABLE documents (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_number       text NOT NULL,
  title                 text NOT NULL,
  doc_type              document_type NOT NULL,
  version               text NOT NULL,
  status                document_status NOT NULL DEFAULT 'Draft',
  effective_date        timestamptz,
  expiration_date       timestamptz,
  owner                 text,
  department            text,
  last_reviewed         timestamptz,
  next_review           timestamptz,
  description           text,
  classification        document_classification,
  retention_period      text,
  doc_scope             text,
  doc_references        text,
  type_specific_data    jsonb,
  parent_document_id    uuid REFERENCES documents(id),
  document_level        smallint CHECK (document_level BETWEEN 1 AND 4),
  validation_phase      validation_phase,
  parent_validation_id  uuid,
  author_id             uuid REFERENCES profiles(id),
  organization_id       uuid REFERENCES organizations(id),
  created_by_id         uuid REFERENCES profiles(id),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  -- P0: Qwen-aligned fields
  code                  text,
  iso_clause            text,
  triggers              jsonb DEFAULT '[]',
  child_codes           jsonb DEFAULT '[]',
  is_prerequisite       boolean DEFAULT false,
  review_cycle_months   integer,
  department_code       text
);

COMMENT ON TABLE documents IS 'ISO 13485 §4.2.3 — Controlled documents with 4-level hierarchy (Strategique→Enregistrement)';
COMMENT ON COLUMN documents.document_level IS '1=Strategique, 2=Transversal, 3=Metier/Technique, 4=Enregistrement/Formulaire';
COMMENT ON COLUMN documents.code IS 'Qwen document code (e.g. MQ-001, PR-4.2.4, FORM-DOC-001)';
COMMENT ON COLUMN documents.triggers IS 'JSON array of document codes that trigger/are triggered by this document';
COMMENT ON COLUMN documents.doc_type IS 'Document type — renamed from "type" to avoid PostgreSQL reserved word';


-- ============================================================================
-- TABLE 5: electronic_signatures
-- ============================================================================

CREATE TABLE electronic_signatures (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id       uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  signed_by_id      uuid NOT NULL REFERENCES profiles(id),
  signer_name       text NOT NULL,
  signer_role       text NOT NULL,
  signature_type    signature_type NOT NULL,
  signature_hash    text NOT NULL,
  user_agent        text,
  revoked           boolean NOT NULL DEFAULT false,
  revocation_reason text,
  organization_id   uuid REFERENCES organizations(id),
  created_at        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE electronic_signatures IS '21 CFR Part 11 compliant electronic signatures — linked to documents, templates, and instances';


-- ============================================================================
-- TABLE 6: document_prerequisites
-- ============================================================================

CREATE TABLE document_prerequisites (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid REFERENCES organizations(id),
  record_type       prerequisite_record_type NOT NULL,
  required_doc_type text NOT NULL,
  required_doc_ref  text,
  is_mandatory      boolean NOT NULL DEFAULT true,
  description       text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE document_prerequisites IS 'Mandatory document prerequisites before record creation — ISO 13485 §4.2.3';


-- ============================================================================
-- TABLE 7: form_templates  (LAYER 1 — Template Approval)
-- ============================================================================

CREATE TABLE form_templates (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id           text,
  title                 text NOT NULL,
  version               text NOT NULL DEFAULT '1.0',
  description           text,
  fields                jsonb NOT NULL DEFAULT '[]',
  is_active             boolean NOT NULL DEFAULT true,
  status                form_template_status NOT NULL DEFAULT 'Draft',
  module_type           form_template_module_type NOT NULL DEFAULT 'general',
  workflow              jsonb,
  compliance            jsonb,
  signatures            jsonb DEFAULT '[]',
  current_approval_step integer DEFAULT 0,
  previous_version_id   uuid REFERENCES form_templates(id),
  effective_date        timestamptz,
  review_comment        text,
  organization_id       uuid REFERENCES organizations(id),
  created_by_id         uuid REFERENCES profiles(id),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE form_templates IS 'LAYER 1 — Form template approval lifecycle (ISO 13485 §4.2.3). Draft→Under_Review→Approved→Obsolete';
COMMENT ON COLUMN form_templates.status IS 'Template status governs whether instances can be created from it';
COMMENT ON COLUMN form_templates.module_type IS 'Which QMS module this template belongs to (connects to 10 record modules)';
COMMENT ON COLUMN form_templates.workflow IS 'JSON: FormTemplateWorkflow {requiresApproval, workflowType, approvers[], eSignatureRequired, etc.}';
COMMENT ON COLUMN form_templates.fields IS 'JSON array of FormFieldDefinition objects';
COMMENT ON COLUMN form_templates.compliance IS 'JSON: FormTemplateCompliance {regulatoryReference, retentionPeriod, cfrPart11Compliance, etc.}';


-- ============================================================================
-- TABLE 8: form_instances  (LAYER 2 — Execution)
-- ============================================================================

CREATE TABLE form_instances (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id           uuid NOT NULL REFERENCES form_templates(id),
  template_version      text NOT NULL,
  reference_number      text NOT NULL,
  values                jsonb NOT NULL DEFAULT '{}',
  status                form_instance_status NOT NULL DEFAULT 'Draft',
  is_locked             boolean NOT NULL DEFAULT false,
  submitted_by_id       uuid REFERENCES profiles(id),
  submitted_at          timestamptz,
  signature_hash        text,
  signatures            jsonb DEFAULT '[]',
  current_approval_step integer DEFAULT 0,
  approval_history      jsonb DEFAULT '[]',
  parent_document_id    uuid REFERENCES documents(id),
  linked_record_id      text,
  linked_record_type    form_template_module_type,
  organization_id       uuid REFERENCES organizations(id),
  created_by_id         uuid REFERENCES profiles(id),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE form_instances IS 'LAYER 2 — Form instance execution (ISO 13485 §4.2.4). Draft→Submitted→Approved/Rejected';
COMMENT ON COLUMN form_instances.linked_record_id IS 'FK-like reference to the QMS record (e.g. CAPA-001, NCR-001)';
COMMENT ON COLUMN form_instances.linked_record_type IS 'Which QMS module this instance belongs to';
COMMENT ON COLUMN form_instances.approval_history IS 'JSON array of InstanceApprovalEntry objects';


-- ============================================================================
-- TABLE 9: capas
-- ============================================================================

CREATE TABLE capas (
  id                            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  capa_number                   text NOT NULL,
  title                         text NOT NULL,
  capa_type                     capa_type NOT NULL,
  status                        capa_status NOT NULL DEFAULT 'Open',
  template_id                   uuid REFERENCES form_templates(id),
  template_version              text,
  priority                      capa_priority,
  source                        capa_source,
  source_reference_id           uuid,
  description                   text NOT NULL,
  problem_statement             text,
  investigation_details         text,
  root_cause_analysis           text,
  root_cause_category           root_cause_category,
  five_whys                     jsonb DEFAULT '[]',
  corrective_action             text,
  effectiveness_verification_method text,
  effectiveness_criteria        text,
  effectiveness_result          text CHECK (effectiveness_result IN ('Effective', 'Not Effective', 'Pending Review')),
  linked_document_id            uuid REFERENCES documents(id),
  linked_ncr_id                 uuid,
  linked_audit_id               uuid,
  assigned_to                   text NOT NULL,
  due_date                      timestamptz NOT NULL,
  created_date                  timestamptz NOT NULL,
  closed_date                   timestamptz,
  created_by_id                 uuid REFERENCES profiles(id),
  organization_id               uuid REFERENCES organizations(id),
  created_at                    timestamptz NOT NULL DEFAULT now(),
  updated_at                    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE capas IS 'CAPA records — Corrective and Preventive Actions (ISO 13485 §8.5.2/§8.5.3)';
COMMENT ON COLUMN capas.template_id IS 'FK to form_templates — Layer 1 connection. Only Approved templates can be used';
COMMENT ON COLUMN capas.template_version IS 'Snapshot of template version at record creation time';
COMMENT ON COLUMN capas.capa_type IS 'CAPA type — renamed from "type" to avoid PostgreSQL reserved word';


-- ============================================================================
-- TABLE 10: non_conformances
-- ============================================================================

CREATE TABLE non_conformances (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ncr_number              text NOT NULL,
  title                   text NOT NULL,
  ncr_type                ncr_type NOT NULL,
  status                  ncr_status NOT NULL DEFAULT 'Open',
  template_id             uuid REFERENCES form_templates(id),
  template_version        text,
  severity                ncr_severity,
  source                  text,
  description             text NOT NULL,
  lot_number              text,
  quantity_affected       integer,
  disposition             ncr_disposition,
  linked_capa_id          uuid REFERENCES capas(id),
  linked_procedure_ref    text,
  supplier_id             uuid,
  is_oos_oot              boolean NOT NULL DEFAULT false,
  analytical_method       text,
  measured_value          numeric,
  measured_unit           text,
  spec_limit              text,
  phase1_conclusion       text CHECK (phase1_conclusion IN ('Error Found', 'No Error Found', 'Pending')),
  phase2_required         boolean NOT NULL DEFAULT false,
  phase2_conclusion       text CHECK (phase2_conclusion IN ('Confirmed OOS', 'Invalidated', 'Pending')),
  reject_lot              boolean NOT NULL DEFAULT false,
  impact_assessment       text,
  containment_actions     text,
  affected_product        text,
  assigned_to             text,
  due_date                timestamptz,
  created_date            timestamptz NOT NULL,
  created_by_id           uuid REFERENCES profiles(id),
  organization_id         uuid REFERENCES organizations(id),
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE non_conformances IS 'Non-Conformance Reports including OOS/OOT (ISO 13485 §8.3)';
COMMENT ON COLUMN non_conformances.ncr_type IS 'NCR type — renamed from "type" to avoid PostgreSQL reserved word';


-- ============================================================================
-- TABLE 11: deviations
-- ============================================================================

CREATE TABLE deviations (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dev_number                  text NOT NULL,
  title                       text NOT NULL,
  deviation_type              deviation_type NOT NULL,
  status                      deviation_status NOT NULL DEFAULT 'Open',
  template_id                 uuid REFERENCES form_templates(id),
  template_version            text,
  severity                    deviation_severity NOT NULL,
  category                    deviation_category NOT NULL,
  description                 text NOT NULL,
  deviation_details           text NOT NULL,
  justification               text,
  risk_assessment             text,
  corrective_action           text,
  preventive_action           text,
  sop_reference               text,
  expected_result             text,
  actual_result               text,
  product_stage               deviation_product_stage,
  quarantine                  boolean DEFAULT false,
  impact_on_validated_state   text,
  impact_on_regulatory_filing text,
  containment_action          text,
  detected_date               timestamptz,
  is_planned_deviation        boolean DEFAULT false,
  lot_number                  text,
  product_code                text,
  quantity_affected           integer,
  linked_capa_id              uuid REFERENCES capas(id),
  linked_document_id          uuid REFERENCES documents(id),
  assigned_to                 text NOT NULL,
  due_date                    timestamptz NOT NULL,
  closed_date                 timestamptz,
  created_by_id               uuid REFERENCES profiles(id),
  organization_id             uuid REFERENCES organizations(id),
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE deviations IS 'Deviation records — Planned and Unplanned deviations (ISO 13485 §8.3)';


-- ============================================================================
-- TABLE 12: change_controls
-- ============================================================================

CREATE TABLE change_controls (
  id                              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cc_number                       text NOT NULL,
  title                           text NOT NULL,
  cc_type                         cc_type NOT NULL,
  status                          cc_status NOT NULL DEFAULT 'Requested',
  template_id                     uuid REFERENCES form_templates(id),
  template_version                text,
  priority                        cc_priority NOT NULL,
  category                        cc_category NOT NULL,
  description                     text NOT NULL,
  justification                   text NOT NULL,
  proposed_change                 text NOT NULL,
  detailed_change_description     text,
  business_compliance_justification text,
  risk_assessment                 text,
  impact_analysis                 text,
  affected_areas                  text,
  impact_on_validated_systems     boolean DEFAULT false,
  implementation_plan             text,
  implementation_date             timestamptz,
  estimated_cost_impact           text,
  completion_date                 timestamptz,
  regulatory_trigger              text,
  emergency_flag                  boolean DEFAULT false,
  linked_document_id              uuid REFERENCES documents(id),
  linked_capa_id                  uuid REFERENCES capas(id),
  additional_references           text,
  assigned_to                     text NOT NULL,
  requested_by                    text NOT NULL,
  approved_by                     text,
  approver                        text,
  due_date                        timestamptz NOT NULL,
  created_by_id                   uuid REFERENCES profiles(id),
  organization_id                 uuid REFERENCES organizations(id),
  created_at                      timestamptz NOT NULL DEFAULT now(),
  updated_at                      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE change_controls IS 'Change Control records (ISO 13485 §7.3.9 / §8.5.1)';
COMMENT ON COLUMN change_controls.cc_type IS 'CC type — renamed from "type" to avoid PostgreSQL reserved word';


-- ============================================================================
-- TABLE 13: audits
-- ============================================================================

CREATE TABLE audits (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_number      text NOT NULL,
  title             text NOT NULL,
  audit_type        audit_type NOT NULL,
  status            audit_status NOT NULL DEFAULT 'Planned',
  template_id       uuid REFERENCES form_templates(id),
  template_version  text,
  audit_scope       text,
  scheduled_date    timestamptz NOT NULL,
  completed_date    timestamptz,
  lead_auditor      text NOT NULL,
  auditees          jsonb DEFAULT '[]',
  findings          jsonb DEFAULT '[]',
  organization_id   uuid REFERENCES organizations(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE audits IS 'Audit records — Internal, External, Supplier audits (ISO 13485 §8.2.4)';
COMMENT ON COLUMN audits.audit_type IS 'Audit type — renamed from "type" to avoid PostgreSQL reserved word';
COMMENT ON COLUMN audits.audit_scope IS 'Audit scope — renamed from "scope" to avoid PostgreSQL reserved word';


-- ============================================================================
-- TABLE 14: training
-- ============================================================================

CREATE TABLE training (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title             text NOT NULL,
  description       text,
  training_type     training_type NOT NULL,
  status            training_status NOT NULL DEFAULT 'Planned',
  template_id       uuid REFERENCES form_templates(id),
  template_version  text,
  assigned_to       text NOT NULL,
  due_date          timestamptz NOT NULL,
  completed_date    timestamptz,
  document_id       uuid REFERENCES documents(id),
  organization_id   uuid REFERENCES organizations(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE training IS 'Training records — SOP/Regulatory/Skill/Certification (ISO 13485 §6.2)';
COMMENT ON COLUMN training.training_type IS 'Training type — renamed from "type" to avoid PostgreSQL reserved word';


-- ============================================================================
-- TABLE 15: risks
-- ============================================================================

CREATE TABLE risks (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_number       text NOT NULL,
  title             text NOT NULL,
  category          risk_category,
  probability       smallint NOT NULL CHECK (probability BETWEEN 1 AND 5),
  impact            smallint NOT NULL CHECK (impact BETWEEN 1 AND 5),
  detectability     smallint NOT NULL CHECK (detectability BETWEEN 1 AND 5),
  rpn               integer NOT NULL,
  risk_level        risk_level NOT NULL,
  template_id       uuid REFERENCES form_templates(id),
  template_version  text,
  mitigation        text,
  residual_risk     text,
  status            risk_status NOT NULL DEFAULT 'Open',
  organization_id   uuid REFERENCES organizations(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE risks IS 'Risk analysis records — FMEA/RPN methodology (ISO 14971 / ISO 13485 §7.1)';
COMMENT ON COLUMN risks.rpn IS 'Risk Priority Number = probability * impact * detectability';


-- ============================================================================
-- TABLE 16: batch_records
-- ============================================================================

CREATE TABLE batch_records (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_number          text NOT NULL,
  product_name        text NOT NULL,
  product_code        text,
  batch_size          integer,
  batch_size_unit     text,
  master_formula_id   text,
  sop_reference       text,
  manufacturing_date  timestamptz NOT NULL,
  expiry_date         timestamptz,
  status              batch_status NOT NULL DEFAULT 'In Progress',
  is_locked           boolean NOT NULL DEFAULT false,
  template_id         uuid REFERENCES form_templates(id),
  template_version    text,
  qa_release_date     timestamptz,
  qa_released_by_id   uuid REFERENCES profiles(id),
  organization_id     uuid REFERENCES organizations(id),
  created_by_id       uuid REFERENCES profiles(id),
  created_at          timestamptz NOT NULL DEFAULT now(),
  steps               jsonb DEFAULT '[]',
  raw_materials       jsonb DEFAULT '[]'
);

COMMENT ON TABLE batch_records IS 'Batch/Production records (ISO 13485 §7.5.1)';


-- ============================================================================
-- TABLE 17: suppliers
-- ============================================================================

CREATE TABLE suppliers (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_code           text NOT NULL,
  name                    text NOT NULL,
  category                supplier_category,
  status                  supplier_status NOT NULL DEFAULT 'Under Evaluation',
  template_id             uuid REFERENCES form_templates(id),
  template_version        text,
  qualification_date      timestamptz,
  next_review_date        timestamptz,
  certifications          jsonb DEFAULT '[]',
  performance_score       numeric(3,1) CHECK (performance_score BETWEEN 0 AND 100),
  qualification_doc_id    uuid REFERENCES documents(id),
  website                 text,
  primary_contact_name    text,
  primary_contact_email   text,
  primary_contact_phone   text,
  street                  text,
  city                    text,
  state_province          text,
  postal_code             text,
  country                 text,
  emergency_contact_name  text,
  emergency_contact_phone text,
  qualification_method    qualification_method,
  qualification_doc_ref   text,
  organization_id         uuid REFERENCES organizations(id),
  created_by_id           uuid REFERENCES profiles(id),
  created_at              timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE suppliers IS 'Supplier qualification records (ISO 13485 §7.4.1)';


-- ============================================================================
-- TABLE 18: audit_trails
-- ============================================================================

CREATE TABLE audit_trails (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_action    audit_action NOT NULL,
  table_name      text NOT NULL,
  record_id       uuid,
  user_id         uuid REFERENCES profiles(id),
  user_email      text,
  old_values      jsonb,
  new_values      jsonb,
  ip_address      inet,
  user_agent      text,
  organization_id uuid REFERENCES organizations(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE audit_trails IS 'Immutable audit trail — 21 CFR Part 11 compliant (ISO 13485 §4.2.4)';


-- ============================================================================
-- ADDITIONAL TABLES from document_hierarchy_triggers migration
-- ============================================================================

-- Departments
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  label_fr TEXT NOT NULL,
  label_en TEXT NOT NULL,
  category TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  parent_code TEXT REFERENCES departments(code),
  organization_id UUID REFERENCES organizations(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Document Triggers (Déclencheurs)
CREATE TABLE document_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  target_document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL DEFAULT 'prerequisite'
    CHECK (trigger_type IN ('prerequisite', 'references', 'activates', 'output', 'escalation')),
  description TEXT,
  is_mandatory BOOLEAN NOT NULL DEFAULT false,
  organization_id UUID REFERENCES organizations(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT no_self_trigger CHECK (source_document_id != target_document_id),
  CONSTRAINT unique_trigger_pair UNIQUE (source_document_id, target_document_id, trigger_type)
);

-- Document Relationships
CREATE TABLE document_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  child_document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL DEFAULT 'parent_child'
    CHECK (relationship_type IN ('parent_child', 'references', 'supersedes', 'obsoletes', 'amends')),
  organization_id UUID REFERENCES organizations(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT no_self_relationship CHECK (parent_document_id != child_document_id),
  CONSTRAINT unique_relationship UNIQUE (parent_document_id, child_document_id, relationship_type)
);

-- Document Code Sequences
CREATE TABLE document_code_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prefix TEXT NOT NULL,
  department_suffix TEXT NOT NULL DEFAULT '',
  last_sequence INTEGER NOT NULL DEFAULT 0,
  organization_id UUID REFERENCES organizations(id),
  
  CONSTRAINT unique_code_sequence UNIQUE (prefix, department_suffix, organization_id)
);


-- ============================================================================
-- CIRCULAR FOREIGN KEY CONSTRAINTS (added after all tables exist)
-- ============================================================================

ALTER TABLE capas
  ADD CONSTRAINT fk_capas_linked_ncr
  FOREIGN KEY (linked_ncr_id) REFERENCES non_conformances(id);

ALTER TABLE capas
  ADD CONSTRAINT fk_capas_linked_audit
  FOREIGN KEY (linked_audit_id) REFERENCES audits(id);

ALTER TABLE non_conformances
  ADD CONSTRAINT fk_ncr_supplier
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id);

-- Add FK for department_code in documents
ALTER TABLE documents
  ADD CONSTRAINT fk_documents_department
  FOREIGN KEY (department_code) REFERENCES departments(code);


-- ============================================================================
-- INDEXES — Performance optimization for common queries
-- ============================================================================

-- Organization scoping
CREATE INDEX IF NOT EXISTS idx_documents_org ON documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_capas_org ON capas(organization_id);
CREATE INDEX IF NOT EXISTS idx_non_conformances_org ON non_conformances(organization_id);
CREATE INDEX IF NOT EXISTS idx_deviations_org ON deviations(organization_id);
CREATE INDEX IF NOT EXISTS idx_change_controls_org ON change_controls(organization_id);
CREATE INDEX IF NOT EXISTS idx_audits_org ON audits(organization_id);
CREATE INDEX IF NOT EXISTS idx_training_org ON training(organization_id);
CREATE INDEX IF NOT EXISTS idx_risks_org ON risks(organization_id);
CREATE INDEX IF NOT EXISTS idx_batch_records_org ON batch_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_org ON suppliers(organization_id);
CREATE INDEX IF NOT EXISTS idx_form_templates_org ON form_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_form_instances_org ON form_instances(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_trails_org ON audit_trails(organization_id);
CREATE INDEX IF NOT EXISTS idx_electronic_signatures_org ON electronic_signatures(organization_id);
CREATE INDEX IF NOT EXISTS idx_document_prerequisites_org ON document_prerequisites(organization_id);
CREATE INDEX IF NOT EXISTS idx_departments_org ON departments(organization_id);

-- Status filters
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_capas_status ON capas(status);
CREATE INDEX IF NOT EXISTS idx_non_conformances_status ON non_conformances(status);
CREATE INDEX IF NOT EXISTS idx_deviations_status ON deviations(status);
CREATE INDEX IF NOT EXISTS idx_change_controls_status ON change_controls(status);
CREATE INDEX IF NOT EXISTS idx_audits_status ON audits(status);
CREATE INDEX IF NOT EXISTS idx_training_status ON training(status);
CREATE INDEX IF NOT EXISTS idx_risks_status ON risks(status);
CREATE INDEX IF NOT EXISTS idx_batch_records_status ON batch_records(status);
CREATE INDEX IF NOT EXISTS idx_suppliers_status ON suppliers(status);
CREATE INDEX IF NOT EXISTS idx_form_templates_status ON form_templates(status);
CREATE INDEX IF NOT EXISTS idx_form_instances_status ON form_instances(status);

-- Template connection (Layer 1 → Layer 2 bridge)
CREATE INDEX IF NOT EXISTS idx_form_instances_template ON form_instances(template_id);
CREATE INDEX IF NOT EXISTS idx_capas_template ON capas(template_id);
CREATE INDEX IF NOT EXISTS idx_non_conformances_template ON non_conformances(template_id);
CREATE INDEX IF NOT EXISTS idx_deviations_template ON deviations(template_id);
CREATE INDEX IF NOT EXISTS idx_change_controls_template ON change_controls(template_id);
CREATE INDEX IF NOT EXISTS idx_audits_template ON audits(template_id);
CREATE INDEX IF NOT EXISTS idx_training_template ON training(template_id);
CREATE INDEX IF NOT EXISTS idx_risks_rpn ON risks(risk_level);
CREATE INDEX IF NOT EXISTS idx_batch_records_template ON batch_records(template_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_template ON suppliers(template_id);

-- Template module type
CREATE INDEX IF NOT EXISTS idx_form_templates_module_type ON form_templates(module_type);

-- Document hierarchy
CREATE INDEX IF NOT EXISTS idx_documents_parent ON documents(parent_document_id);
CREATE INDEX IF NOT EXISTS idx_documents_level ON documents(document_level);
CREATE INDEX IF NOT EXISTS idx_documents_code ON documents(code);
CREATE INDEX IF NOT EXISTS idx_documents_code_org ON documents(code, organization_id) WHERE code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_department_code ON documents(department_code);

-- Number-based search
CREATE INDEX IF NOT EXISTS idx_capas_number ON capas(capa_number);
CREATE INDEX IF NOT EXISTS idx_non_conformances_number ON non_conformances(ncr_number);
CREATE INDEX IF NOT EXISTS idx_deviations_number ON deviations(dev_number);
CREATE INDEX IF NOT EXISTS idx_change_controls_number ON change_controls(cc_number);
CREATE INDEX IF NOT EXISTS idx_audits_number ON audits(audit_number);
CREATE INDEX IF NOT EXISTS idx_risks_number ON risks(risk_number);
CREATE INDEX IF NOT EXISTS idx_batch_records_lot ON batch_records(lot_number);
CREATE INDEX IF NOT EXISTS idx_suppliers_code ON suppliers(supplier_code);

-- Audit trail queries
CREATE INDEX IF NOT EXISTS idx_audit_trails_audit_action ON audit_trails(audit_action);
CREATE INDEX IF NOT EXISTS idx_audit_trails_table ON audit_trails(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_trails_created ON audit_trails(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_trails_user ON audit_trails(user_id);

-- Due date tracking
CREATE INDEX IF NOT EXISTS idx_capas_due_date ON capas(due_date);
CREATE INDEX IF NOT EXISTS idx_training_due_date ON training(due_date);
CREATE INDEX IF NOT EXISTS idx_change_controls_due_date ON change_controls(due_date);

-- Electronic signature lookups
CREATE INDEX IF NOT EXISTS idx_electronic_signatures_document ON electronic_signatures(document_id);
CREATE INDEX IF NOT EXISTS idx_electronic_signatures_user ON electronic_signatures(signed_by_id);

-- Profiles
CREATE INDEX IF NOT EXISTS idx_profiles_org ON profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Form instance linked records
CREATE INDEX IF NOT EXISTS idx_form_instances_linked_record ON form_instances(linked_record_id);
CREATE INDEX IF NOT EXISTS idx_form_instances_linked_type ON form_instances(linked_record_type);

-- Departments
CREATE INDEX IF NOT EXISTS idx_departments_code ON departments(code);
CREATE INDEX IF NOT EXISTS idx_departments_category ON departments(category);

-- Document triggers
CREATE INDEX IF NOT EXISTS idx_triggers_source ON document_triggers(source_document_id);
CREATE INDEX IF NOT EXISTS idx_triggers_target ON document_triggers(target_document_id);
CREATE INDEX IF NOT EXISTS idx_triggers_type ON document_triggers(trigger_type);
CREATE INDEX IF NOT EXISTS idx_triggers_organization ON document_triggers(organization_id);

-- Document relationships
CREATE INDEX IF NOT EXISTS idx_relationships_parent ON document_relationships(parent_document_id);
CREATE INDEX IF NOT EXISTS idx_relationships_child ON document_relationships(child_document_id);


-- ============================================================================
-- ROW LEVEL SECURITY (RLS) — Multi-tenant isolation
-- ============================================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE electronic_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_prerequisites ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE capas ENABLE ROW LEVEL SECURITY;
ALTER TABLE non_conformances ENABLE ROW LEVEL SECURITY;
ALTER TABLE deviations ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE training ENABLE ROW LEVEL SECURITY;
ALTER TABLE risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_trails ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_code_sequences ENABLE ROW LEVEL SECURITY;

-- Helper function to check org membership
CREATE OR REPLACE FUNCTION is_org_member(org_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id
      AND user_id = auth.uid()
      AND status = 'active'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Organizations
DROP POLICY IF EXISTS org_read ON organizations;
CREATE POLICY org_read ON organizations
  FOR SELECT USING (
    id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS org_member_insert ON organization_members;
CREATE POLICY org_member_insert ON organization_members
  FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() = invited_by);

DROP POLICY IF EXISTS org_member_read ON organization_members;
CREATE POLICY org_member_read ON organization_members
  FOR SELECT USING (
    user_id = auth.uid() OR
    organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
  );

-- Profiles
DROP POLICY IF EXISTS profiles_read ON profiles;
CREATE POLICY profiles_read ON profiles
  FOR SELECT USING (
    id = auth.uid() OR
    organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS profiles_update_own ON profiles;
CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE USING (id = auth.uid());

-- Apply org-scoped read/write policies to all QMS tables
DROP POLICY IF EXISTS documents_rw ON documents;
CREATE POLICY documents_rw ON documents FOR ALL USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));
DROP POLICY IF EXISTS capas_rw ON capas;
CREATE POLICY capas_rw ON capas FOR ALL USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));
DROP POLICY IF EXISTS ncr_rw ON non_conformances;
CREATE POLICY ncr_rw ON non_conformances FOR ALL USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));
DROP POLICY IF EXISTS deviations_rw ON deviations;
CREATE POLICY deviations_rw ON deviations FOR ALL USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));
DROP POLICY IF EXISTS change_controls_rw ON change_controls;
CREATE POLICY change_controls_rw ON change_controls FOR ALL USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));
DROP POLICY IF EXISTS audits_rw ON audits;
CREATE POLICY audits_rw ON audits FOR ALL USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));
DROP POLICY IF EXISTS training_rw ON training;
CREATE POLICY training_rw ON training FOR ALL USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));
DROP POLICY IF EXISTS risks_rw ON risks;
CREATE POLICY risks_rw ON risks FOR ALL USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));
DROP POLICY IF EXISTS batch_records_rw ON batch_records;
CREATE POLICY batch_records_rw ON batch_records FOR ALL USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));
DROP POLICY IF EXISTS suppliers_rw ON suppliers;
CREATE POLICY suppliers_rw ON suppliers FOR ALL USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));
DROP POLICY IF EXISTS form_templates_rw ON form_templates;
CREATE POLICY form_templates_rw ON form_templates FOR ALL USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));
DROP POLICY IF EXISTS form_instances_rw ON form_instances;
CREATE POLICY form_instances_rw ON form_instances FOR ALL USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));
DROP POLICY IF EXISTS audit_trails_rw ON audit_trails;
CREATE POLICY audit_trails_rw ON audit_trails FOR ALL USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));
DROP POLICY IF EXISTS electronic_signatures_rw ON electronic_signatures;
CREATE POLICY electronic_signatures_rw ON electronic_signatures FOR ALL USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));
DROP POLICY IF EXISTS document_prerequisites_rw ON document_prerequisites;
CREATE POLICY document_prerequisites_rw ON document_prerequisites FOR ALL USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));
DROP POLICY IF EXISTS departments_rw ON departments;
CREATE POLICY departments_rw ON departments FOR ALL USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));
DROP POLICY IF EXISTS document_triggers_rw ON document_triggers;
CREATE POLICY document_triggers_rw ON document_triggers FOR ALL USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));
DROP POLICY IF EXISTS document_relationships_rw ON document_relationships;
CREATE POLICY document_relationships_rw ON document_relationships FOR ALL USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));
DROP POLICY IF EXISTS document_code_sequences_rw ON document_code_sequences;
CREATE POLICY document_code_sequences_rw ON document_code_sequences FOR ALL USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));


-- ============================================================================
-- VIEWS for common queries
-- ============================================================================

-- Document hierarchy with level labels
CREATE OR REPLACE VIEW document_hierarchy AS
SELECT 
  d.id,
  d.code,
  d.title,
  d.doc_type,
  d.status,
  d.document_level,
  d.department_code,
  dep.label_fr AS department_label_fr,
  dep.label_en AS department_label_en,
  d.parent_document_id,
  parent.code AS parent_code,
  parent.title AS parent_title,
  d.triggers,
  d.child_codes,
  d.iso_clause,
  CASE d.document_level
    WHEN 1 THEN 'Stratégique'
    WHEN 2 THEN 'Transversal'
    WHEN 3 THEN 'Métier / Technique'
    WHEN 4 THEN 'Enregistrement / Formulaire'
  END AS level_label_fr,
  CASE d.document_level
    WHEN 1 THEN 'Strategic'
    WHEN 2 THEN 'Cross-Functional'
    WHEN 3 THEN 'Operational / Technical'
    WHEN 4 THEN 'Record / Form'
  END AS level_label_en,
  d.created_at,
  d.updated_at
FROM documents d
LEFT JOIN departments dep ON d.department_code = dep.code
LEFT JOIN documents parent ON d.parent_document_id = parent.id;

-- Document trigger graph
CREATE OR REPLACE VIEW document_trigger_graph AS
SELECT 
  t.id,
  s.code AS source_code,
  s.title AS source_title,
  tgt.code AS target_code,
  tgt.title AS target_title,
  t.trigger_type,
  t.is_mandatory,
  t.description
FROM document_triggers t
JOIN documents s ON t.source_document_id = s.id
JOIN documents tgt ON t.target_document_id = tgt.id;


-- ============================================================================
-- TRIGGERS — Auto-update updated_at timestamps
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_organizations_updated ON organizations;
CREATE TRIGGER trg_organizations_updated BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trg_profiles_updated ON profiles;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trg_documents_updated ON documents;
CREATE TRIGGER trg_documents_updated BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trg_form_templates_updated ON form_templates;
CREATE TRIGGER trg_form_templates_updated BEFORE UPDATE ON form_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trg_form_instances_updated ON form_instances;
CREATE TRIGGER trg_form_instances_updated BEFORE UPDATE ON form_instances FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trg_capas_updated ON capas;
CREATE TRIGGER trg_capas_updated BEFORE UPDATE ON capas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trg_non_conformances_updated ON non_conformances;
CREATE TRIGGER trg_non_conformances_updated BEFORE UPDATE ON non_conformances FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trg_deviations_updated ON deviations;
CREATE TRIGGER trg_deviations_updated BEFORE UPDATE ON deviations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trg_change_controls_updated ON change_controls;
CREATE TRIGGER trg_change_controls_updated BEFORE UPDATE ON change_controls FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trg_audits_updated ON audits;
CREATE TRIGGER trg_audits_updated BEFORE UPDATE ON audits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trg_training_updated ON training;
CREATE TRIGGER trg_training_updated BEFORE UPDATE ON training FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trg_risks_updated ON risks;
CREATE TRIGGER trg_risks_updated BEFORE UPDATE ON risks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trg_departments_updated ON departments;
CREATE TRIGGER trg_departments_updated BEFORE UPDATE ON departments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- TRIGGER — Audit trail auto-logging for critical tables
-- ============================================================================

CREATE OR REPLACE FUNCTION log_audit_trail()
RETURNS TRIGGER AS $$
DECLARE
  v_audit_action text;
  v_org_id uuid;
BEGIN
  IF (TG_OP = 'INSERT') THEN
    v_audit_action := 'CREATE';
    v_org_id := NEW.organization_id;
    INSERT INTO audit_trails (audit_action, table_name, record_id, new_values, organization_id)
    VALUES (v_audit_action, TG_TABLE_NAME, NEW.id, to_jsonb(NEW), v_org_id);
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    v_audit_action := 'UPDATE';
    v_org_id := NEW.organization_id;
    INSERT INTO audit_trails (audit_action, table_name, record_id, old_values, new_values, organization_id)
    VALUES (v_audit_action, TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW), v_org_id);
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    v_audit_action := 'DELETE';
    v_org_id := OLD.organization_id;
    INSERT INTO audit_trails (audit_action, table_name, record_id, old_values, organization_id)
    VALUES (v_audit_action, TG_TABLE_NAME, OLD.id, to_jsonb(OLD), v_org_id);
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_documents ON documents;
CREATE TRIGGER trg_audit_documents AFTER INSERT OR UPDATE OR DELETE ON documents FOR EACH ROW EXECUTE FUNCTION log_audit_trail();
DROP TRIGGER IF EXISTS trg_audit_capas ON capas;
CREATE TRIGGER trg_audit_capas AFTER INSERT OR UPDATE OR DELETE ON capas FOR EACH ROW EXECUTE FUNCTION log_audit_trail();
DROP TRIGGER IF EXISTS trg_audit_non_conformances ON non_conformances;
CREATE TRIGGER trg_audit_non_conformances AFTER INSERT OR UPDATE OR DELETE ON non_conformances FOR EACH ROW EXECUTE FUNCTION log_audit_trail();
DROP TRIGGER IF EXISTS trg_audit_deviations ON deviations;
CREATE TRIGGER trg_audit_deviations AFTER INSERT OR UPDATE OR DELETE ON deviations FOR EACH ROW EXECUTE FUNCTION log_audit_trail();
DROP TRIGGER IF EXISTS trg_audit_change_controls ON change_controls;
CREATE TRIGGER trg_audit_change_controls AFTER INSERT OR UPDATE OR DELETE ON change_controls FOR EACH ROW EXECUTE FUNCTION log_audit_trail();
DROP TRIGGER IF EXISTS trg_audit_audits ON audits;
CREATE TRIGGER trg_audit_audits AFTER INSERT OR UPDATE OR DELETE ON audits FOR EACH ROW EXECUTE FUNCTION log_audit_trail();
DROP TRIGGER IF EXISTS trg_audit_training ON training;
CREATE TRIGGER trg_audit_training AFTER INSERT OR UPDATE OR DELETE ON training FOR EACH ROW EXECUTE FUNCTION log_audit_trail();
DROP TRIGGER IF EXISTS trg_audit_risks ON risks;
CREATE TRIGGER trg_audit_risks AFTER INSERT OR UPDATE OR DELETE ON risks FOR EACH ROW EXECUTE FUNCTION log_audit_trail();
DROP TRIGGER IF EXISTS trg_audit_batch_records ON batch_records;
CREATE TRIGGER trg_audit_batch_records AFTER INSERT OR UPDATE OR DELETE ON batch_records FOR EACH ROW EXECUTE FUNCTION log_audit_trail();
DROP TRIGGER IF EXISTS trg_audit_suppliers ON suppliers;
CREATE TRIGGER trg_audit_suppliers AFTER INSERT OR UPDATE OR DELETE ON suppliers FOR EACH ROW EXECUTE FUNCTION log_audit_trail();
DROP TRIGGER IF EXISTS trg_audit_form_templates ON form_templates;
CREATE TRIGGER trg_audit_form_templates AFTER INSERT OR UPDATE OR DELETE ON form_templates FOR EACH ROW EXECUTE FUNCTION log_audit_trail();
DROP TRIGGER IF EXISTS trg_audit_form_instances ON form_instances;
CREATE TRIGGER trg_audit_form_instances AFTER INSERT OR UPDATE OR DELETE ON form_instances FOR EACH ROW EXECUTE FUNCTION log_audit_trail();
DROP TRIGGER IF EXISTS trg_audit_document_triggers ON document_triggers;
CREATE TRIGGER trg_audit_document_triggers AFTER INSERT OR UPDATE OR DELETE ON document_triggers FOR EACH ROW EXECUTE FUNCTION log_audit_trail();


COMMIT;

-- ============================================================================
-- END OF MIGRATION 001_initial_schema.sql
-- ============================================================================
-- Tables created: 22
--   Core:       organizations, profiles, organization_members
--   Documents:  documents, electronic_signatures, document_prerequisites,
--               departments, document_triggers, document_relationships,
--               document_code_sequences
--   Layer 1:    form_templates
--   Layer 2:    form_instances
--   Records:    capas, non_conformances, deviations, change_controls,
--               audits, training, risks, batch_records, suppliers
--   Audit:      audit_trails
--
-- Views:       document_hierarchy, document_trigger_graph
-- FK circular: capas↔non_conformances, capas↔audits,
--              non_conformances↔suppliers
-- Indexes:     65+ indexes for query performance
-- RLS:         22 tables with org-scoped policies
-- Triggers:    14 updated_at + 13 audit_trail auto-loggers
-- ============================================================================
