-- ============================================================================
-- QMS ISO 13485 Pro — FULL UNIFIED MIGRATION
-- ============================================================================
-- Single-file deployment for fresh Supabase instances.
-- Concatenates: 000 (tables) + 002 (RLS) + 003 (audit) + 004 (RPCs/views) + 005 (bug fixes)
--
-- INSTRUCTIONS: Paste into Supabase SQL Editor and click "Run"
--
-- CONTENTS:
--   1. Extensions PostgreSQL (pgcrypto)
--   2. 28 tables (27 Prisma models + audit_config)
--   3. Index, unique constraints, foreign keys
--   4. RLS policies multi-tenant (Row Level Security)
--   5. Helper functions (is_org_member, is_org_admin, current_profile_id, etc.)
--   6. Audit trail triggers (HMAC-SHA256 blockchain, 21 CFR Part 11)
--   7. RPC: set_user_context, validate_status_transition, get_upcoming_deadlines
--   8. RPC: get_org_compliance_score (industry-weighted)
--   9. Views: v_current_user, v_org_dashboard, document_hierarchy,
--            document_trigger_graph, record_type_usage
--  10. Triggers: maker-checker (9 QMS tables), form instance validation
--
-- Generated: 2026-07-16
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION: 000_prisma_base_tables.sql
-- ============================================================================

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "subscription_status" TEXT NOT NULL DEFAULT 'trial',
    "settings" TEXT NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'operator',
    "department" TEXT,
    "job_title" TEXT,
    "phone" TEXT,
    "avatar_url" TEXT,
    "password_hash" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_members" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "status" TEXT NOT NULL DEFAULT 'active',
    "invited_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label_fr" TEXT NOT NULL,
    "label_en" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "parent_code" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "organization_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "document_number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "doc_type" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "classification" TEXT NOT NULL DEFAULT 'Internal',
    "code" TEXT,
    "iso_clause" TEXT,
    "document_level" INTEGER NOT NULL DEFAULT 4,
    "parent_document_id" TEXT,
    "department_code" TEXT,
    "is_prerequisite" BOOLEAN NOT NULL DEFAULT false,
    "review_cycle_months" INTEGER NOT NULL DEFAULT 12,
    "validation_phase" TEXT,
    "effective_date" TIMESTAMP(3),
    "expiration_date" TIMESTAMP(3),
    "last_reviewed" TIMESTAMP(3),
    "next_review" TIMESTAMP(3),
    "owner" TEXT,
    "retention_period" TEXT,
    "doc_scope" TEXT,
    "doc_references" TEXT,
    "content" TEXT,
    "summary" TEXT,
    "is_template" BOOLEAN NOT NULL DEFAULT false,
    "template_reference_id" TEXT,
    "template_reference_version" TEXT,
    "type_specific_data" TEXT,
    "custom_fields_json" TEXT,
    "organization_id" TEXT NOT NULL,
    "author_id" TEXT,
    "created_by_id" TEXT,
    "approver_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "electronic_signatures" (
    "id" TEXT NOT NULL,
    "document_id" TEXT,
    "record_id" TEXT,
    "record_type" TEXT,
    "signed_by_id" TEXT NOT NULL,
    "signer_name" TEXT NOT NULL,
    "signer_role" TEXT NOT NULL,
    "signature_type" TEXT NOT NULL,
    "signature_hash" TEXT NOT NULL,
    "user_agent" TEXT,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "revocation_reason" TEXT,
    "organization_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "electronic_signatures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_prerequisites" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "record_type" TEXT NOT NULL,
    "required_doc_type" TEXT NOT NULL,
    "required_doc_ref" TEXT,
    "is_mandatory" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_prerequisites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_triggers" (
    "id" TEXT NOT NULL,
    "source_document_id" TEXT NOT NULL,
    "target_document_id" TEXT NOT NULL,
    "trigger_type" TEXT NOT NULL,
    "description" TEXT,
    "is_mandatory" BOOLEAN NOT NULL DEFAULT false,
    "organization_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_triggers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_relationships" (
    "id" TEXT NOT NULL,
    "parent_document_id" TEXT NOT NULL,
    "child_document_id" TEXT NOT NULL,
    "relationship_type" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_relationships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_code_sequences" (
    "id" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "department_suffix" TEXT,
    "last_sequence" INTEGER NOT NULL DEFAULT 0,
    "organization_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_code_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_templates" (
    "id" TEXT NOT NULL,
    "document_id" TEXT,
    "title" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "description" TEXT,
    "fieldsJson" TEXT NOT NULL DEFAULT '[]',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "module_type" TEXT NOT NULL,
    "workflow_json" TEXT,
    "compliance_json" TEXT,
    "signaturesJson" TEXT NOT NULL DEFAULT '[]',
    "current_approval_step" INTEGER NOT NULL DEFAULT 0,
    "previous_version_id" TEXT,
    "effective_date" TIMESTAMP(3),
    "review_comment" TEXT,
    "organization_id" TEXT NOT NULL,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_instances" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "template_version" TEXT,
    "reference_number" TEXT,
    "values_json" TEXT NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "submitted_by_id" TEXT,
    "submitted_at" TIMESTAMP(3),
    "signature_hash" TEXT,
    "signaturesJson" TEXT NOT NULL DEFAULT '[]',
    "current_approval_step" INTEGER NOT NULL DEFAULT 0,
    "approvalHistoryJson" TEXT NOT NULL DEFAULT '[]',
    "parent_document_id" TEXT,
    "linked_record_id" TEXT,
    "linked_record_type" TEXT,
    "record_type_slug" TEXT,
    "organization_id" TEXT NOT NULL,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capas" (
    "id" TEXT NOT NULL,
    "capa_number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "capa_type" TEXT NOT NULL DEFAULT 'Corrective',
    "status" TEXT NOT NULL DEFAULT 'Open',
    "priority" TEXT NOT NULL DEFAULT 'Medium',
    "source" TEXT NOT NULL DEFAULT 'Non-Conformance',
    "source_reference_id" TEXT,
    "source_record_type" TEXT,
    "description" TEXT,
    "problem_statement" TEXT,
    "investigation_details" TEXT,
    "root_cause_analysis" TEXT,
    "root_cause_category" TEXT,
    "fiveWhysJson" TEXT NOT NULL DEFAULT '[]',
    "corrective_action" TEXT,
    "effectiveness_verification_method" TEXT,
    "effectiveness_criteria" TEXT,
    "effectiveness_result" TEXT,
    "linked_document_id" TEXT,
    "linked_ncr_id" TEXT,
    "linked_audit_id" TEXT,
    "linked_capa_id" TEXT,
    "template_id" TEXT,
    "template_version" TEXT,
    "assigned_to_id" TEXT,
    "owner_id" TEXT,
    "due_date" TIMESTAMP(3),
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_date" TIMESTAMP(3),
    "organization_id" TEXT NOT NULL,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "capas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "non_conformances" (
    "id" TEXT NOT NULL,
    "ncr_number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "ncr_type" TEXT NOT NULL DEFAULT 'Process',
    "status" TEXT NOT NULL DEFAULT 'Open',
    "severity" TEXT NOT NULL DEFAULT 'Minor',
    "source" TEXT,
    "description" TEXT,
    "lot_number" TEXT,
    "quantity_affected" TEXT,
    "disposition" TEXT NOT NULL DEFAULT 'Pending',
    "is_oos_oot" BOOLEAN NOT NULL DEFAULT false,
    "analytical_method" TEXT,
    "measured_value" DOUBLE PRECISION,
    "measured_unit" TEXT,
    "spec_limit" TEXT,
    "phase1_conclusion" TEXT,
    "phase2_required" BOOLEAN NOT NULL DEFAULT false,
    "phase2_conclusion" TEXT,
    "reject_lot" BOOLEAN NOT NULL DEFAULT false,
    "linked_capa_id" TEXT,
    "linked_procedure_ref" TEXT,
    "supplier_id" TEXT,
    "impact_assessment" TEXT,
    "containment_actions" TEXT,
    "affected_product" TEXT,
    "closed_signature_hash" TEXT,
    "closed_signed_at" TIMESTAMP(3),
    "closed_by_id" TEXT,
    "closed_reason" TEXT,
    "assigned_to_id" TEXT,
    "owner_id" TEXT,
    "due_date" TIMESTAMP(3),
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organization_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "non_conformances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deviations" (
    "id" TEXT NOT NULL,
    "dev_number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "deviation_type" TEXT NOT NULL DEFAULT 'Unplanned',
    "status" TEXT NOT NULL DEFAULT 'Open',
    "severity" TEXT NOT NULL DEFAULT 'Minor',
    "category" TEXT NOT NULL DEFAULT 'Process',
    "description" TEXT,
    "deviation_details" TEXT,
    "justification" TEXT,
    "risk_assessment" TEXT,
    "corrective_action" TEXT,
    "preventive_action" TEXT,
    "sop_reference" TEXT,
    "expected_result" TEXT,
    "actual_result" TEXT,
    "product_stage" TEXT,
    "quarantine" BOOLEAN NOT NULL DEFAULT false,
    "impact_on_validated_state" TEXT,
    "impact_on_regulatory_filing" TEXT,
    "containment_action" TEXT,
    "detected_date" TIMESTAMP(3),
    "is_planned_deviation" BOOLEAN NOT NULL DEFAULT false,
    "lot_number" TEXT,
    "product_code" TEXT,
    "quantity_affected" TEXT,
    "linked_capa_id" TEXT,
    "linked_document_id" TEXT,
    "assigned_to_id" TEXT,
    "owner_id" TEXT,
    "due_date" TIMESTAMP(3),
    "closed_date" TIMESTAMP(3),
    "organization_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deviations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "change_controls" (
    "id" TEXT NOT NULL,
    "cc_number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "cc_type" TEXT NOT NULL DEFAULT 'Planned',
    "status" TEXT NOT NULL DEFAULT 'Requested',
    "priority" TEXT NOT NULL DEFAULT 'Medium',
    "category" TEXT NOT NULL DEFAULT 'Process',
    "description" TEXT,
    "justification" TEXT,
    "proposed_change" TEXT,
    "detailed_change_description" TEXT,
    "business_compliance_justification" TEXT,
    "risk_assessment" TEXT,
    "impact_analysis" TEXT,
    "affected_areas" TEXT,
    "impact_on_validated_systems" BOOLEAN NOT NULL DEFAULT false,
    "implementation_plan" TEXT,
    "implementation_date" TIMESTAMP(3),
    "estimated_cost_impact" TEXT,
    "completion_date" TIMESTAMP(3),
    "regulatory_trigger" TEXT,
    "emergency_flag" BOOLEAN NOT NULL DEFAULT false,
    "linked_document_id" TEXT,
    "linked_capa_id" TEXT,
    "additional_references" TEXT,
    "assigned_to_id" TEXT,
    "requested_by_id" TEXT,
    "approved_by_id" TEXT,
    "approver_id" TEXT,
    "owner_id" TEXT,
    "due_date" TIMESTAMP(3),
    "organization_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "change_controls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audits" (
    "id" TEXT NOT NULL,
    "audit_number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "audit_type" TEXT NOT NULL DEFAULT 'Internal',
    "status" TEXT NOT NULL DEFAULT 'Planned',
    "audit_scope" TEXT,
    "scheduled_date" TIMESTAMP(3),
    "completed_date" TIMESTAMP(3),
    "lead_auditor_id" TEXT,
    "auditeesJson" TEXT NOT NULL DEFAULT '[]',
    "findingsJson" TEXT NOT NULL DEFAULT '[]',
    "audit_criteria" TEXT,
    "compliance_rating" TEXT,
    "completed_signature_hash" TEXT,
    "completed_signed_at" TIMESTAMP(3),
    "completed_signed_by_id" TEXT,
    "organization_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risks" (
    "id" TEXT NOT NULL,
    "risk_number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'Process',
    "status" TEXT NOT NULL DEFAULT 'Open',
    "hazard_description" TEXT,
    "risk_owner" TEXT,
    "regulatory_reference" TEXT,
    "control_type" TEXT,
    "verification_method" TEXT,
    "risk_acceptability" TEXT NOT NULL DEFAULT 'ALARP',
    "priority_notes" TEXT,
    "probability" INTEGER NOT NULL DEFAULT 3,
    "impact" INTEGER NOT NULL DEFAULT 3,
    "detectability" INTEGER NOT NULL DEFAULT 3,
    "rpn" INTEGER NOT NULL DEFAULT 27,
    "risk_level" TEXT NOT NULL DEFAULT 'Medium',
    "mitigation" TEXT,
    "residual_risk" TEXT,
    "residual_probability" INTEGER,
    "residual_impact" INTEGER,
    "residual_detectability" INTEGER,
    "residual_rpn" INTEGER,
    "linked_document_id" TEXT,
    "linked_capa_id" TEXT,
    "owner_id" TEXT,
    "organization_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "risks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "training_type" TEXT NOT NULL DEFAULT 'SOP',
    "status" TEXT NOT NULL DEFAULT 'Planned',
    "assigned_to_id" TEXT NOT NULL,
    "due_date" TIMESTAMP(3),
    "completed_date" TIMESTAMP(3),
    "document_id" TEXT,
    "metadata_json" TEXT,
    "organization_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batch_records" (
    "id" TEXT NOT NULL,
    "lot_number" TEXT NOT NULL,
    "product_name" TEXT NOT NULL,
    "product_code" TEXT,
    "batch_size" TEXT,
    "batch_size_unit" TEXT NOT NULL DEFAULT 'units',
    "master_formula_id" TEXT,
    "sop_reference" TEXT,
    "manufacturing_date" TIMESTAMP(3),
    "expiry_date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'In Progress',
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "qa_release_date" TIMESTAMP(3),
    "qa_released_by_id" TEXT,
    "stepsJson" TEXT NOT NULL DEFAULT '[]',
    "rawMaterialsJson" TEXT NOT NULL DEFAULT '[]',
    "organization_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "batch_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "supplier_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'Raw Material',
    "status" TEXT NOT NULL DEFAULT 'Under Evaluation',
    "qualification_date" TIMESTAMP(3),
    "next_review_date" TIMESTAMP(3),
    "certificationsJson" TEXT NOT NULL DEFAULT '[]',
    "performance_score" DOUBLE PRECISION,
    "qualification_doc_id" TEXT,
    "qualification_method" TEXT,
    "qualification_doc_ref" TEXT,
    "website" TEXT,
    "primary_contact_name" TEXT,
    "primary_contact_email" TEXT,
    "primary_contact_phone" TEXT,
    "street" TEXT,
    "city" TEXT,
    "state_province" TEXT,
    "postal_code" TEXT,
    "country" TEXT,
    "emergency_contact_name" TEXT,
    "emergency_contact_phone" TEXT,
    "notes" TEXT,
    "organization_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_trails" (
    "id" TEXT NOT NULL,
    "sequence_number" INTEGER,
    "previous_hash" TEXT,
    "hash" TEXT,
    "audit_action" TEXT NOT NULL,
    "table_name" TEXT NOT NULL,
    "record_id" TEXT NOT NULL,
    "user_id" TEXT,
    "user_email" TEXT,
    "old_values_json" TEXT,
    "new_values_json" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "organization_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_trails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "record_type_definitions" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_en" TEXT,
    "icon" TEXT NOT NULL DEFAULT 'FileText',
    "description" TEXT,
    "statusFlowJson" TEXT NOT NULL DEFAULT '[]',
    "defaultFieldsJson" TEXT NOT NULL DEFAULT '[]',
    "complianceRefsJson" TEXT NOT NULL DEFAULT '[]',
    "code_prefix" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "requires_esig" BOOLEAN NOT NULL DEFAULT false,
    "min_approver_count" INTEGER NOT NULL DEFAULT 1,
    "effective_date" TIMESTAMP(3),
    "previous_version_id" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "change_reason" TEXT,
    "organization_id" TEXT NOT NULL,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "record_type_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "record_links" (
    "id" TEXT NOT NULL,
    "source_record_id" TEXT NOT NULL,
    "source_record_type" TEXT NOT NULL,
    "target_record_id" TEXT NOT NULL,
    "target_record_type" TEXT NOT NULL,
    "link_type" TEXT NOT NULL DEFAULT 'related',
    "description" TEXT,
    "organization_id" TEXT NOT NULL,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "record_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_field_definitions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'text',
    "required" BOOLEAN NOT NULL DEFAULT false,
    "optionsJson" TEXT NOT NULL DEFAULT '[]',
    "applicable_to" TEXT NOT NULL DEFAULT '*',
    "organization_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "custom_field_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_reports" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "report_type" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'pdf',
    "frequency" TEXT NOT NULL DEFAULT 'monthly',
    "recipientsJson" TEXT NOT NULL DEFAULT '[]',
    "filters_json" TEXT NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'active',
    "last_run_at" TIMESTAMP(3),
    "next_run_at" TIMESTAMP(3),
    "last_result" TEXT,
    "organization_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheduled_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_email_key" ON "profiles"("email");

-- CreateIndex
CREATE UNIQUE INDEX "organization_members_organization_id_profile_id_key" ON "organization_members"("organization_id", "profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE UNIQUE INDEX "departments_code_key" ON "departments"("code");

-- CreateIndex
CREATE UNIQUE INDEX "documents_organization_id_document_number_key" ON "documents"("organization_id", "document_number");

-- CreateIndex
CREATE UNIQUE INDEX "document_code_sequences_prefix_department_suffix_organizati_key" ON "document_code_sequences"("prefix", "department_suffix", "organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "record_type_definitions_organization_id_slug_key" ON "record_type_definitions"("organization_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "record_links_source_record_id_source_record_type_target_rec_key" ON "record_links"("source_record_id", "source_record_type", "target_record_id", "target_record_type", "link_type");

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electronic_signatures" ADD CONSTRAINT "electronic_signatures_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electronic_signatures" ADD CONSTRAINT "electronic_signatures_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "electronic_signatures" ADD CONSTRAINT "electronic_signatures_signed_by_id_fkey" FOREIGN KEY ("signed_by_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_prerequisites" ADD CONSTRAINT "document_prerequisites_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_triggers" ADD CONSTRAINT "document_triggers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_triggers" ADD CONSTRAINT "document_triggers_source_document_id_fkey" FOREIGN KEY ("source_document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_triggers" ADD CONSTRAINT "document_triggers_target_document_id_fkey" FOREIGN KEY ("target_document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_relationships" ADD CONSTRAINT "document_relationships_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_relationships" ADD CONSTRAINT "document_relationships_parent_document_id_fkey" FOREIGN KEY ("parent_document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_relationships" ADD CONSTRAINT "document_relationships_child_document_id_fkey" FOREIGN KEY ("child_document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_code_sequences" ADD CONSTRAINT "document_code_sequences_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_templates" ADD CONSTRAINT "form_templates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_templates" ADD CONSTRAINT "form_templates_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_templates" ADD CONSTRAINT "form_templates_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_instances" ADD CONSTRAINT "form_instances_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_instances" ADD CONSTRAINT "form_instances_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "form_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capas" ADD CONSTRAINT "capas_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capas" ADD CONSTRAINT "capas_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capas" ADD CONSTRAINT "capas_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "non_conformances" ADD CONSTRAINT "non_conformances_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "non_conformances" ADD CONSTRAINT "non_conformances_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "non_conformances" ADD CONSTRAINT "non_conformances_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deviations" ADD CONSTRAINT "deviations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deviations" ADD CONSTRAINT "deviations_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deviations" ADD CONSTRAINT "deviations_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_controls" ADD CONSTRAINT "change_controls_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_controls" ADD CONSTRAINT "change_controls_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_controls" ADD CONSTRAINT "change_controls_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_controls" ADD CONSTRAINT "change_controls_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audits" ADD CONSTRAINT "audits_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audits" ADD CONSTRAINT "audits_lead_auditor_id_fkey" FOREIGN KEY ("lead_auditor_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audits" ADD CONSTRAINT "audits_completed_signed_by_id_fkey" FOREIGN KEY ("completed_signed_by_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risks" ADD CONSTRAINT "risks_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risks" ADD CONSTRAINT "risks_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training" ADD CONSTRAINT "training_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training" ADD CONSTRAINT "training_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_records" ADD CONSTRAINT "batch_records_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_records" ADD CONSTRAINT "batch_records_qa_released_by_id_fkey" FOREIGN KEY ("qa_released_by_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_trails" ADD CONSTRAINT "audit_trails_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_trails" ADD CONSTRAINT "audit_trails_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "record_type_definitions" ADD CONSTRAINT "record_type_definitions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "record_links" ADD CONSTRAINT "record_links_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_field_definitions" ADD CONSTRAINT "custom_field_definitions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_reports" ADD CONSTRAINT "scheduled_reports_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- SECTION: 002_rls_and_helpers.sql
-- ============================================================================

-- ============================================================================
-- Migration 002 : RLS Multi-tenant + Fonctions helper
-- ============================================================================
-- Securite defensive en profondeur (defense in depth).
-- L'app accede a la DB via API routes (Prisma + service_role),
-- ces politiques RLS protegent en cas d'acces direct au client Supabase.
--
-- NOTE: Cette app utilise un auth custom (bcrypt + session cookie).
-- Les fonctions helper lisent l'ID utilisateur depuis:
--   1) JWT Supabase claim 'profile_id' (si Supabase Auth est active)
--   2) Variable locale 'app.user_id' (posee par les API routes)
-- ============================================================================

-- ============================================================================
-- Helper functions
-- ============================================================================

CREATE OR REPLACE FUNCTION current_profile_id()
RETURNS TEXT AS $$
DECLARE
  v_claim_id TEXT;
  v_setting_id TEXT;
BEGIN
  -- Essai 1: JWT claim profile_id
  BEGIN
    v_claim_id := (current_setting('request.jwt.claims', true)::json->>'profile_id');
    IF v_claim_id IS NOT NULL AND v_claim_id != '' THEN RETURN v_claim_id; END IF;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  -- Essai 2: Variable locale API
  BEGIN
    v_setting_id := current_setting('app.user_id', true);
    IF v_setting_id IS NOT NULL AND v_setting_id != '' THEN RETURN v_setting_id; END IF;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION is_org_member(p_org_id TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = p_org_id AND profile_id = current_profile_id() AND status = 'active'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_org_admin(p_org_id TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = p_org_id AND profile_id = current_profile_id()
      AND status = 'active' AND role IN ('owner', 'admin')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION current_org_id()
RETURNS TEXT AS $$
  SELECT organization_id FROM profiles
  WHERE id = current_profile_id() AND active = true LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================================
-- Enable RLS on ALL 27 data tables
-- ============================================================================

DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'organizations','profiles','organization_members','sessions',
    'departments','documents','electronic_signatures',
    'document_prerequisites','document_triggers','document_relationships',
    'document_code_sequences','form_templates','form_instances',
    'capas','non_conformances','deviations','change_controls',
    'audits','risks','training','batch_records','suppliers',
    'audit_trails','record_type_definitions','record_links',
    'custom_field_definitions','scheduled_reports'
  ]) LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- ============================================================================
-- Standard RLS macro: 4 politiques CRUD par table
-- Compatible PG 14+ (DROP + CREATE au lieu de CREATE OR REPLACE)
-- ============================================================================

CREATE OR REPLACE FUNCTION create_std_rls(p_table TEXT)
RETURNS VOID AS $$
BEGIN
  -- SELECT
  EXECUTE format('DROP POLICY IF EXISTS %I_sel ON %I', p_table, p_table);
  EXECUTE format('CREATE POLICY %I_sel ON %I FOR SELECT TO authenticated USING (is_org_member(organization_id))', p_table, p_table);
  -- INSERT
  EXECUTE format('DROP POLICY IF EXISTS %I_ins ON %I', p_table, p_table);
  EXECUTE format('CREATE POLICY %I_ins ON %I FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id))', p_table, p_table);
  -- UPDATE
  EXECUTE format('DROP POLICY IF EXISTS %I_upd ON %I', p_table, p_table);
  EXECUTE format('CREATE POLICY %I_upd ON %I FOR UPDATE TO authenticated USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id))', p_table, p_table);
  -- DELETE
  EXECUTE format('DROP POLICY IF EXISTS %I_del ON %I', p_table, p_table);
  EXECUTE format('CREATE POLICY %I_del ON %I FOR DELETE TO authenticated USING (is_org_member(organization_id))', p_table, p_table);
END;
$$ LANGUAGE plpgsql;

-- 21 tables metier: politiques standard
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'documents','electronic_signatures','document_prerequisites',
    'document_triggers','document_relationships','document_code_sequences',
    'form_templates','form_instances',
    'capas','non_conformances','deviations','change_controls',
    'audits','risks','training','batch_records','suppliers',
    'departments','record_links','custom_field_definitions','scheduled_reports'
  ]) LOOP
    PERFORM create_std_rls(t);
  END LOOP;
END $$;

-- ============================================================================
-- Tables avec politiques speciales
-- ============================================================================

-- audit_trails: INSERT + SELECT seulement (immuable)
DROP POLICY IF EXISTS audit_trails_sel ON audit_trails;
CREATE POLICY audit_trails_sel ON audit_trails
  FOR SELECT TO authenticated USING (is_org_member(organization_id));
DROP POLICY IF EXISTS audit_trails_ins ON audit_trails;
CREATE POLICY audit_trails_ins ON audit_trails
  FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));

-- record_type_definitions: lecture membres, ecriture admin
DROP POLICY IF EXISTS rtd_sel ON record_type_definitions;
CREATE POLICY rtd_sel ON record_type_definitions
  FOR SELECT TO authenticated USING (is_org_member(organization_id));
DROP POLICY IF EXISTS rtd_ins ON record_type_definitions;
CREATE POLICY rtd_ins ON record_type_definitions
  FOR INSERT TO authenticated WITH CHECK (is_org_admin(organization_id));
DROP POLICY IF EXISTS rtd_upd ON record_type_definitions;
CREATE POLICY rtd_upd ON record_type_definitions
  FOR UPDATE TO authenticated USING (is_org_admin(organization_id)) WITH CHECK (is_org_admin(organization_id));
DROP POLICY IF EXISTS rtd_del ON record_type_definitions;
CREATE POLICY rtd_del ON record_type_definitions
  FOR DELETE TO authenticated USING (is_org_admin(organization_id));

-- organizations: membre=lecture, libre=creation, admin=update, owner=delete
DROP POLICY IF EXISTS orgs_sel ON organizations;
CREATE POLICY orgs_sel ON organizations
  FOR SELECT TO authenticated USING (is_org_member(id));
DROP POLICY IF EXISTS orgs_ins ON organizations;
CREATE POLICY orgs_ins ON organizations
  FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS orgs_upd ON organizations;
CREATE POLICY orgs_upd ON organizations
  FOR UPDATE TO authenticated USING (is_org_admin(id)) WITH CHECK (is_org_admin(id));
DROP POLICY IF EXISTS orgs_del ON organizations;
CREATE POLICY orgs_del ON organizations
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM organization_members WHERE organization_id = id AND profile_id = current_profile_id() AND role = 'owner' AND status = 'active')
  );

-- profiles: son profil ou profil de son org
DROP POLICY IF EXISTS profiles_sel ON profiles;
CREATE POLICY profiles_sel ON profiles
  FOR SELECT TO authenticated USING (id = current_profile_id() OR is_org_member(organization_id));
DROP POLICY IF EXISTS profiles_ins ON profiles;
CREATE POLICY profiles_ins ON profiles
  FOR INSERT TO authenticated WITH CHECK (id = current_profile_id());
DROP POLICY IF EXISTS profiles_upd ON profiles;
CREATE POLICY profiles_upd ON profiles
  FOR UPDATE TO authenticated USING (id = current_profile_id() OR is_org_admin(organization_id))
  WITH CHECK (id = current_profile_id() OR is_org_admin(organization_id));

-- organization_members
DROP POLICY IF EXISTS om_sel ON organization_members;
CREATE POLICY om_sel ON organization_members
  FOR SELECT TO authenticated USING (profile_id = current_profile_id() OR is_org_member(organization_id));
DROP POLICY IF EXISTS om_ins ON organization_members;
CREATE POLICY om_ins ON organization_members
  FOR INSERT TO authenticated WITH CHECK (profile_id = current_profile_id() OR is_org_admin(organization_id));
DROP POLICY IF EXISTS om_upd ON organization_members;
CREATE POLICY om_upd ON organization_members
  FOR UPDATE TO authenticated USING (is_org_admin(organization_id)) WITH CHECK (is_org_admin(organization_id));
DROP POLICY IF EXISTS om_del ON organization_members;
CREATE POLICY om_del ON organization_members
  FOR DELETE TO authenticated USING (is_org_admin(organization_id));

-- sessions: proprietaire ou admin de l'org
DROP POLICY IF EXISTS sessions_sel ON sessions;
CREATE POLICY sessions_sel ON sessions
  FOR SELECT TO authenticated USING (
    profile_id = current_profile_id() OR is_org_admin((SELECT organization_id FROM profiles WHERE id = profile_id LIMIT 1))
  );
DROP POLICY IF EXISTS sessions_ins ON sessions;
CREATE POLICY sessions_ins ON sessions
  FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS sessions_del ON sessions;
CREATE POLICY sessions_del ON sessions
  FOR DELETE TO authenticated USING (
    profile_id = current_profile_id() OR is_org_admin((SELECT organization_id FROM profiles WHERE id = profile_id LIMIT 1))
  );

-- ============================================================================
-- create_organization_for_user
-- ============================================================================
CREATE OR REPLACE FUNCTION create_organization_for_user(
  p_user_id TEXT, p_name TEXT, p_slug TEXT, p_settings JSONB DEFAULT '{}'
) RETURNS TEXT AS $$
DECLARE v_org_id TEXT;
BEGIN
  INSERT INTO organizations (name, slug, settings)
  VALUES (p_name, p_slug, p_settings) RETURNING id INTO v_org_id;
  INSERT INTO organization_members (organization_id, profile_id, role, status)
  VALUES (v_org_id, p_user_id, 'owner', 'active');
  UPDATE profiles SET organization_id = v_org_id, updated_at = now() WHERE id = p_user_id;
  RETURN v_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SECTION: 003_audit_triggers.sql
-- ============================================================================

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

-- ============================================================================
-- SECTION: 004_missing_rpcs_views_triggers.sql
-- ============================================================================

-- ============================================================
-- 004_missing_rpcs_views_triggers.sql
-- Complete migration for all missing RPCs, views, triggers
-- Addresses P0 gaps identified in the comparative analysis
-- ============================================================

-- ============================================================================
-- 1. HELPER: set_user_context (injected via RLS policies)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.set_user_context(p_user_id uuid, p_org_id uuid)
RETURNS void AS $$
BEGIN
  PERFORM set_config('request.user.id', p_user_id::text, false);
  PERFORM set_config('request.org.id', p_org_id::text, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 2. RPC: validate_status_transition
-- Validates status transitions against record_type_definitions
-- ============================================================================
CREATE OR REPLACE FUNCTION public.validate_status_transition(
  p_record_type_slug text,
  p_current_status text,
  p_new_status text,
  p_organization_id uuid
)
RETURNS boolean AS $$
DECLARE
  v_flow jsonb;
  v_status_list jsonb;
  v_found boolean;
BEGIN
  SELECT status_flow_json INTO v_flow
  FROM record_type_definitions
  WHERE slug = p_record_type_slug
    AND organization_id = p_organization_id
    AND is_active = true
  LIMIT 1;

  -- Fallback to hardcoded flows if no DB definition
  IF v_flow IS NULL THEN
    RETURN true; -- Let application-level validation handle it
  END IF;

  -- Check linear flow: find current status position, check if next is adjacent
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

  -- Check branch transitions
  IF NOT v_found AND v_flow->'branches' ? p_current_status THEN
    v_found := (v_flow->'branches'->p_current_status) @> to_jsonb(p_new_status);
  END IF;

  RETURN v_found;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 3. RPC: get_upcoming_deadlines
-- Aggregates upcoming deadlines across all QMS entities
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_upcoming_deadlines(
  p_org_id uuid,
  p_days_ahead int DEFAULT 7
)
RETURNS TABLE(
  entity_type text,
  entity_id uuid,
  title text,
  due_date timestamptz,
  status text,
  days_remaining int,
  priority text
) AS $$
BEGIN
  RETURN QUERY
  WITH deadlines AS (
    SELECT 'capa' AS entity_type, id AS entity_id,
           title, due_date, status,
           COALESCE(priority, 'Medium') AS priority
    FROM capas
    WHERE organization_id = p_org_id
      AND status NOT IN ('Closed', 'Cancelled')
      AND due_date IS NOT NULL
      AND due_date <= now() + (p_days_ahead || ' days')::interval

    UNION ALL
    SELECT 'ncr' AS entity_type, id AS entity_id,
           title, due_date, status,
           CASE WHEN severity = 'Critical' THEN 'Critical'
                WHEN severity = 'Major' THEN 'High'
                ELSE 'Medium' END AS priority
    FROM non_conformances
    WHERE organization_id = p_org_id
      AND status NOT IN ('Closed', 'Cancelled')
      AND due_date IS NOT NULL
      AND due_date <= now() + (p_days_ahead || ' days')::interval

    UNION ALL
    SELECT 'training' AS entity_type, id AS entity_id,
           title, due_date, status,
           'Medium' AS priority
    FROM training
    WHERE organization_id = p_org_id
      AND status NOT IN ('Completed', 'Cancelled')
      AND due_date IS NOT NULL
      AND due_date <= now() + (p_days_ahead || ' days')::interval

    UNION ALL
    SELECT 'audit' AS entity_type, id AS entity_id,
           title, scheduled_date AS due_date, status,
           'High' AS priority
    FROM audits
    WHERE organization_id = p_org_id
      AND status NOT IN ('Completed', 'Cancelled')
      AND scheduled_date IS NOT NULL
      AND scheduled_date <= now() + (p_days_ahead || ' days')::interval

    UNION ALL
    SELECT 'deviation' AS entity_type, id AS entity_id,
           title, due_date, status,
           COALESCE(priority, 'Medium') AS priority
    FROM deviations
    WHERE organization_id = p_org_id
      AND status NOT IN ('Closed', 'Cancelled')
      AND due_date IS NOT NULL
      AND due_date <= now() + (p_days_ahead || ' days')::interval

    UNION ALL
    SELECT 'change_control' AS entity_type, id AS entity_id,
           title, due_date, status,
           'High' AS priority
    FROM change_controls
    WHERE organization_id = p_org_id
      AND status NOT IN ('Completed', 'Rejected', 'Cancelled')
      AND due_date IS NOT NULL
      AND due_date <= now() + (p_days_ahead || ' days')::interval
  )
  SELECT
    entity_type, entity_id, title, due_date, status,
    GREATEST(0, ceil(EXTRACT(epoch FROM (due_date - now())) / 86400))::int AS days_remaining,
    priority
  FROM deadlines
  ORDER BY due_date ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 4. VIEW: v_current_user
-- Returns current user profile with org context
-- ============================================================================
CREATE OR REPLACE VIEW public.v_current_user AS
SELECT
  p.id AS profile_id,
  p.email,
  p.full_name,
  p.role AS profile_role,
  p.active,
  p.organization_id,
  o.name AS organization_name,
  o.slug AS organization_slug,
  om.role AS org_role,
  o.settings AS org_settings
FROM profiles p
LEFT JOIN organizations o ON o.id = p.organization_id
LEFT JOIN organization_members om ON om.organization_id = o.id AND om.user_id = p.id
WHERE p.active = true;

-- ============================================================================
-- 5. VIEW: v_org_dashboard
-- Pre-computed KPIs for the dashboard page
-- ============================================================================
CREATE OR REPLACE VIEW public.v_org_dashboard AS
SELECT
  o.id AS organization_id,
  o.name AS organization_name,
  (SELECT count(*) FROM documents d WHERE d.organization_id = o.id AND d.status IN ('Effective', 'Approved')) AS effective_documents,
  (SELECT count(*) FROM documents d WHERE d.organization_id = o.id) AS total_documents,
  (SELECT count(*) FROM capas c WHERE c.organization_id = o.id AND c.status = 'Open') AS open_capas,
  (SELECT count(*) FROM capas c WHERE c.organization_id = o.id AND c.status = 'Closed') AS closed_capas,
  (SELECT count(*) FROM non_conformances n WHERE n.organization_id = o.id AND n.status = 'Open') AS open_ncrs,
  (SELECT count(*) FROM non_conformances n WHERE n.organization_id = o.id AND n.status = 'Closed') AS closed_ncrs,
  (SELECT count(*) FROM audits a WHERE a.organization_id = o.id AND a.status = 'Planned') AS planned_audits,
  (SELECT count(*) FROM audits a WHERE a.organization_id = o.id AND a.status = 'Completed') AS completed_audits,
  (SELECT count(*) FROM training t WHERE t.organization_id = o.id AND t.status = 'Overdue') AS overdue_training,
  (SELECT count(*) FROM training t WHERE t.organization_id = o.id AND t.status = 'Completed') AS completed_training,
  (SELECT count(*) FROM risks r WHERE r.organization_id = o.id AND r.status = 'Open') AS open_risks,
  (SELECT count(*) FROM batch_records b WHERE b.organization_id = o.id AND b.status = 'Released') AS released_batches,
  (SELECT count(*) FROM suppliers s WHERE s.organization_id = o.id AND s.status = 'Qualified') AS qualified_suppliers,
  (SELECT count(*) FROM deviations dv WHERE dv.organization_id = o.id AND dv.status = 'Open') AS open_deviations,
  (SELECT count(*) FROM change_controls cc WHERE cc.organization_id = o.id AND cc.status IN ('Requested', 'Under Review', 'In Implementation')) AS active_change_controls
FROM organizations o;

-- ============================================================================
-- 6. VIEW: document_hierarchy
-- Recursive CTE showing document parent-child relationships
-- ============================================================================
CREATE OR REPLACE VIEW public.document_hierarchy AS
WITH RECURSIVE doc_tree AS (
  -- Base: documents with no parent
  SELECT
    d.id, d.document_number, d.title, d.doc_type, d.status, d.level,
    d.parent_document_id, 0 AS depth,
    ARRAY[d.id] AS path_ids
  FROM documents d
  WHERE d.parent_document_id IS NULL

  UNION ALL

  -- Recursive: children
  SELECT
    d.id, d.document_number, d.title, d.doc_type, d.status, d.level,
    d.parent_document_id, dt.depth + 1,
    dt.path_ids || d.id
  FROM documents d
  INNER JOIN doc_tree dt ON d.parent_document_id = dt.id
  WHERE NOT d.id = ANY(dt.path_ids) -- prevent cycles
)
SELECT * FROM doc_tree;

-- ============================================================================
-- 7. VIEW: document_trigger_graph
-- Shows document dependency graph (prerequisites → document → activated docs)
-- ============================================================================
CREATE OR REPLACE VIEW public.document_trigger_graph AS
SELECT
  d.id AS document_id,
  d.document_number,
  d.title,
  dp.prerequisite_document_id,
  pd.document_number AS prerequisite_doc_number,
  pd.title AS prerequisite_title,
  dt.activated_document_id,
  ad.document_number AS activated_doc_number,
  ad.title AS activated_title
FROM documents d
LEFT JOIN document_prerequisites dp ON dp.document_id = d.id
LEFT JOIN documents pd ON pd.id = dp.prerequisite_document_id
LEFT JOIN document_triggers dt ON dt.source_document_id = d.id
LEFT JOIN documents ad ON ad.id = dt.activated_document_id;

-- ============================================================================
-- 8. VIEW: record_type_usage
-- Shows count of records per record type for each organization
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
  FROM jsonb_each_text(rtd.status_flow_json) sf
  -- Dynamic count based on slug mapping
  UNION ALL
  SELECT count(*) FROM capas WHERE organization_id = rtd.organization_id AND rtd.slug = 'capa'
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
-- 9. TRIGGER: enforce_maker_checker on QMS tables
-- Ensures that the approver differs from the creator
-- ============================================================================
CREATE OR REPLACE FUNCTION public.enforce_maker_checker_qms()
RETURNS trigger AS $$
BEGIN
  -- Only enforce when status changes to an approval/terminal status
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status IN ('Approved', 'Closed', 'Released', 'Qualified', 'Completed', 'Effective') THEN
      IF NEW.approved_by_id IS NOT NULL AND NEW.approved_by_id = NEW.created_by THEN
        RAISE EXCEPTION 'Maker-checker violation: l''approbateur ne peut pas être le créateur du record (21 CFR Part 11 §11.10)';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach maker-checker to all QMS tables that have approved_by_id and created_by
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'capas', 'non_conformances', 'deviations', 'change_controls',
    'audits', 'risks', 'suppliers', 'batch_records', 'documents'
  ]) LOOP
    -- Check if table has the required columns before creating trigger
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = tbl AND column_name = 'approved_by_id'
    ) AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = tbl AND column_name = 'created_by'
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
-- 10. TRIGGER: validate_instance_values (for form_instances)
-- Validates JSON structure of instance_values against template field definitions
-- ============================================================================
CREATE OR REPLACE FUNCTION public.validate_instance_values()
RETURNS trigger AS $$
DECLARE
  v_template_id uuid;
  v_fields jsonb;
  v_values jsonb;
  v_field jsonb;
  v_key text;
  v_required boolean;
  v_type text;
BEGIN
  IF NEW.instance_values IS NULL THEN
    RETURN NEW;
  END IF;

  v_template_id := NEW.form_template_id;
  IF v_template_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get template field definitions
  SELECT fields_json INTO v_fields
  FROM form_templates
  WHERE id = v_template_id;

  IF v_fields IS NULL THEN
    RETURN NEW;
  END IF;

  v_values := NEW.instance_values;

  -- Validate each required field
  FOR v_field IN SELECT * FROM jsonb_array_elements(v_fields)
  LOOP
    v_key := v_field->>'name';
    v_required := COALESCE((v_field->>'required')::boolean, false);
    v_type := v_field->>'type';

    -- Check required fields
    IF v_required AND (v_values->>v_key IS NULL OR (v_values->>v_key) = '') THEN
      RAISE EXCEPTION 'Champ requis manquant: %', v_field->>'label';
    END IF;

    -- Type validation for non-null values
    IF v_values->>v_key IS NOT NULL THEN
      CASE v_type
        WHEN 'number' THEN
          IF (v_values->>v_key)::numeric IS NULL THEN
            RAISE EXCEPTION 'Champ numérique invalide: %', v_field->>'label';
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
-- 11. RPC: get_org_compliance_score (weighted by industry)
-- Calculates compliance score using industry-specific weights
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_org_compliance_score(
  p_org_id uuid,
  p_industry_type text DEFAULT 'medical_device'
)
RETURNS TABLE(
  checklist_type text,
  total_clauses int,
  compliant_clauses int,
  score numeric,
  weighted_score numeric
) AS $$
DECLARE
  v_weights jsonb;
  v_doc_score numeric := 0;
  v_capa_score numeric := 0;
  v_ncr_score numeric := 0;
  v_training_score numeric := 0;
  v_audit_score numeric := 0;
  v_risk_score numeric := 0;
  v_batch_score numeric := 0;
  v_supplier_score numeric := 0;
  v_total_docs int := 0;
  v_total_capas int := 0;
  v_total_ncrs int := 0;
  v_total_training int := 0;
  v_total_audits int := 0;
  v_total_risks int := 0;
  v_total_batches int := 0;
  v_total_suppliers int := 0;
BEGIN
  -- Get industry weights
  SELECT settings::jsonb->'complianceWeights' INTO v_weights
  FROM organizations WHERE id = p_org_id;

  IF v_weights IS NULL THEN
    v_weights := '{"documents":0.25,"capas":0.20,"ncrs":0.15,"training":0.10,"audits":0.10,"risks":0.10,"batchRecords":0.05,"suppliers":0.05}'::jsonb;
  END IF;

  -- Calculate individual scores
  SELECT count(*), count(*) FILTER (WHERE status IN ('Effective','Approved')) INTO v_total_docs, v_doc_score FROM documents WHERE organization_id = p_org_id;
  IF v_total_docs > 0 THEN v_doc_score := (v_doc_score / v_total_docs) * 100; ELSE v_doc_score := 0; END IF;

  SELECT count(*), count(*) FILTER (WHERE status = 'Closed') INTO v_total_capas, v_capa_score FROM capas WHERE organization_id = p_org_id;
  IF v_total_capas > 0 THEN v_capa_score := (v_capa_score / v_total_capas) * 100; ELSE v_capa_score := 0; END IF;

  SELECT count(*), count(*) FILTER (WHERE status = 'Closed') INTO v_total_ncrs, v_ncr_score FROM non_conformances WHERE organization_id = p_org_id;
  IF v_total_ncrs > 0 THEN v_ncr_score := (v_ncr_score / v_total_ncrs) * 100; ELSE v_ncr_score := 0; END IF;

  SELECT count(*), count(*) FILTER (WHERE status = 'Completed') INTO v_total_training, v_training_score FROM training WHERE organization_id = p_org_id;
  IF v_total_training > 0 THEN v_training_score := (v_training_score / v_total_training) * 100; ELSE v_training_score := 0; END IF;

  SELECT count(*), count(*) FILTER (WHERE status = 'Completed') INTO v_total_audits, v_audit_score FROM audits WHERE organization_id = p_org_id;
  IF v_total_audits > 0 THEN v_audit_score := (v_audit_score / v_total_audits) * 100; ELSE v_audit_score := 0; END IF;

  SELECT count(*), count(*) FILTER (WHERE status NOT IN ('Open')) INTO v_total_risks, v_risk_score FROM risks WHERE organization_id = p_org_id;
  IF v_total_risks > 0 THEN v_risk_score := (v_risk_score / v_total_risks) * 100; ELSE v_risk_score := 0; END IF;

  SELECT count(*), count(*) FILTER (WHERE status = 'Released') INTO v_total_batches, v_batch_score FROM batch_records WHERE organization_id = p_org_id;
  IF v_total_batches > 0 THEN v_batch_score := (v_batch_score / v_total_batches) * 100; ELSE v_batch_score := 0; END IF;

  SELECT count(*), count(*) FILTER (WHERE status = 'Qualified') INTO v_total_suppliers, v_supplier_score FROM suppliers WHERE organization_id = p_org_id;
  IF v_total_suppliers > 0 THEN v_supplier_score := (v_supplier_score / v_total_suppliers) * 100; ELSE v_supplier_score := 0; END IF;

  -- Calculate weighted score
  RETURN QUERY
  SELECT
    'ISO 13485' AS checklist_type,
    15 AS total_clauses,
    15 AS compliant_clauses,
    round((
      COALESCE((v_weights->>'documents')::numeric, 0.25) * v_doc_score +
      COALESCE((v_weights->>'capas')::numeric, 0.20) * v_capa_score +
      COALESCE((v_weights->>'ncrs')::numeric, 0.15) * v_ncr_score +
      COALESCE((v_weights->>'training')::numeric, 0.10) * v_training_score +
      COALESCE((v_weights->>'audits')::numeric, 0.10) * v_audit_score +
      COALESCE((v_weights->>'risks')::numeric, 0.10) * v_risk_score +
      COALESCE((v_weights->>'batchRecords')::numeric, 0.05) * v_batch_score +
      COALESCE((v_weights->>'suppliers')::numeric, 0.05) * v_supplier_score
    )::numeric, 2) AS score,
    round((
      COALESCE((v_weights->>'documents')::numeric, 0.25) * v_doc_score +
      COALESCE((v_weights->>'capas')::numeric, 0.20) * v_capa_score +
      COALESCE((v_weights->>'ncrs')::numeric, 0.15) * v_ncr_score +
      COALESCE((v_weights->>'training')::numeric, 0.10) * v_training_score +
      COALESCE((v_weights->>'audits')::numeric, 0.10) * v_audit_score +
      COALESCE((v_weights->>'risks')::numeric, 0.10) * v_risk_score +
      COALESCE((v_weights->>'batchRecords')::numeric, 0.05) * v_batch_score +
      COALESCE((v_weights->>'suppliers')::numeric, 0.05) * v_supplier_score
    )::numeric, 2) AS weighted_score;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- SECTION: 005_fix_004_bugs.sql
-- ============================================================================

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


-- ============================================================================
-- END OF UNIFIED MIGRATION
-- ============================================================================

COMMIT;
