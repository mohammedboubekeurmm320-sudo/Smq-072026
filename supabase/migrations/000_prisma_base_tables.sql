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

