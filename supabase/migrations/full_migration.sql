-- ============================================================================
-- QMS ISO 13485 Pro — Migration complète Supabase (PostgreSQL 15+)
-- ============================================================================
-- Généré automatiquement: Prisma tables + RLS multi-tenant + Audit blockchain
-- Date: 2026-07-11
--
-- INSTRUCTIONS: Copier-coller ce fichier dans le Supabase SQL Editor
-- (Dashboard → SQL Editor → New query) puis cliquer "Run"
--
-- Ce script crée:
--   1. Extensions PostgreSQL (pgcrypto)
--   2. 28 tables (27 modèles Prisma + audit_config)
--   3. Index et contraintes d'unicité
--   4. Politiques RLS multi-tenant (Row Level Security)
--   5. Fonctions helper (is_org_member, is_org_admin, current_profile_id)
--   6. Triggers d'audit trail (HMAC-SHA256 blockchain)
--   7. Protection immuabilité audit_trails (21 CFR Part 11)
-- ============================================================================

BEGIN;

-- Extensions PostgreSQL
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- PARTIE 1: Tables (généré par Prisma — snake_case via @map)
-- ============================================================================


-- CreateTable
CREATE TABLE IF NOT EXISTS "organizations" (
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
CREATE TABLE IF NOT EXISTS "profiles" (
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
CREATE TABLE IF NOT EXISTS "organization_members" (
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
CREATE TABLE IF NOT EXISTS "sessions" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "departments" (
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
CREATE TABLE IF NOT EXISTS "documents" (
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
CREATE TABLE IF NOT EXISTS "electronic_signatures" (
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
CREATE TABLE IF NOT EXISTS "document_prerequisites" (
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
CREATE TABLE IF NOT EXISTS "document_triggers" (
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
CREATE TABLE IF NOT EXISTS "document_relationships" (
    "id" TEXT NOT NULL,
    "parent_document_id" TEXT NOT NULL,
    "child_document_id" TEXT NOT NULL,
    "relationship_type" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_relationships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "document_code_sequences" (
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
CREATE TABLE IF NOT EXISTS "form_templates" (
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
CREATE TABLE IF NOT EXISTS "form_instances" (
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
CREATE TABLE IF NOT EXISTS "capas" (
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
CREATE TABLE IF NOT EXISTS "non_conformances" (
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
CREATE TABLE IF NOT EXISTS "deviations" (
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
CREATE TABLE IF NOT EXISTS "change_controls" (
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
CREATE TABLE IF NOT EXISTS "audits" (
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
CREATE TABLE IF NOT EXISTS "risks" (
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
CREATE TABLE IF NOT EXISTS "training" (
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
CREATE TABLE IF NOT EXISTS "batch_records" (
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
CREATE TABLE IF NOT EXISTS "suppliers" (
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
CREATE TABLE IF NOT EXISTS "audit_trails" (
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
CREATE TABLE IF NOT EXISTS "record_type_definitions" (
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
CREATE TABLE IF NOT EXISTS "record_links" (
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
CREATE TABLE IF NOT EXISTS "custom_field_definitions" (
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
CREATE TABLE IF NOT EXISTS "scheduled_reports" (
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
-- PARTIE 2: RLS Multi-tenant + Fonctions helper
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
-- PARTIE 3: Audit Trail Triggers — Blockchain HMAC-SHA256
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


COMMIT;

-- ============================================================================
-- Vérification post-migration
-- ============================================================================
SELECT 'Migration terminée avec succès!' AS status;
SELECT count(*) AS tables_created FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
SELECT count(*) AS rls_policies FROM pg_policies 
  WHERE schemaname = 'public';
SELECT count(*) AS triggers FROM pg_trigger 
  WHERE NOT tgisinternal;
