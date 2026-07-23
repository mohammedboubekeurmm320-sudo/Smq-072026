-- ============================================================================
-- Migration 008 : Optimized indexes for frequent queries
-- ============================================================================
-- Addresses P1 gap: no dedicated performance indexes beyond PK/FK defaults.
-- These indexes target the most common query patterns:
--   1. org_id + status (list pages with status filter)
--   2. org_id + number/code (search by reference number)
--   3. org_id + template (join form_templates for the 10 modules)
--   4. Audit trail: org_id + sequence (integrity verification)
--   5. Record links: source/target lookups
--   6. Notifications: org + user + read status
-- ============================================================================

-- Documents
CREATE INDEX IF NOT EXISTS idx_documents_org_status ON public.documents(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_documents_org_number ON public.documents(organization_id, document_number);
CREATE INDEX IF NOT EXISTS idx_documents_org_type ON public.documents(organization_id, type);
CREATE INDEX IF NOT EXISTS idx_documents_org_level ON public.documents(organization_id, document_level);
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents(status);

-- CAPA
CREATE INDEX IF NOT EXISTS idx_capas_org_status ON public.capas(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_capas_org_number ON public.capas(organization_id, capa_number);
CREATE INDEX IF NOT EXISTS idx_capas_priority ON public.capas(priority) WHERE priority = 'Critical';

-- Non-Conformances
CREATE INDEX IF NOT EXISTS idx_non_conformances_org_status ON public.non_conformances(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_non_conformances_org_number ON public.non_conformances(organization_id, ncr_number);
CREATE INDEX IF NOT EXISTS idx_ncrs_is_oos_oot ON public.non_conformances(is_oos_oot) WHERE is_oos_oot = true;

-- Deviations
CREATE INDEX IF NOT EXISTS idx_deviations_org_status ON public.deviations(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_deviations_org_number ON public.deviations(organization_id, dev_number);

-- Change Controls
CREATE INDEX IF NOT EXISTS idx_change_controls_org_status ON public.change_controls(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_change_controls_org_number ON public.change_controls(organization_id, cc_number);

-- Audits
CREATE INDEX IF NOT EXISTS idx_audits_org_status ON public.audits(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_audits_org_number ON public.audits(organization_id, audit_number);

-- Training
CREATE INDEX IF NOT EXISTS idx_training_org_status ON public.training(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_training_overdue ON public.training(status) WHERE status = 'Overdue';

-- Risks
CREATE INDEX IF NOT EXISTS idx_risks_org_status ON public.risks(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_risks_org_number ON public.risks(organization_id, risk_number);
CREATE INDEX IF NOT EXISTS idx_risks_level ON public.risks(risk_level);

-- Batch Records
CREATE INDEX IF NOT EXISTS idx_batch_records_org_status ON public.batch_records(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_batch_records_org_number ON public.batch_records(organization_id, batch_number);

-- Suppliers
CREATE INDEX IF NOT EXISTS idx_suppliers_org_status ON public.suppliers(organization_id, status);

-- Form Templates
CREATE INDEX IF NOT EXISTS idx_form_templates_org_module ON public.form_templates(organization_id, module_type);
CREATE INDEX IF NOT EXISTS idx_form_templates_org_status ON public.form_templates(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_form_templates_doc_id ON public.form_templates(document_id) WHERE document_id IS NOT NULL;

-- Form Instances
CREATE INDEX IF NOT EXISTS idx_form_instances_org_template ON public.form_instances(organization_id, template_id);
CREATE INDEX IF NOT EXISTS idx_form_instances_org_status ON public.form_instances(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_form_instances_org_record_type ON public.form_instances(organization_id, record_type_slug);

-- Audit Trails — critical for integrity verification
CREATE INDEX IF NOT EXISTS idx_audit_trails_org_seq ON public.audit_trails(organization_id, sequence_number);

-- Record Links — polymorphic lookups
CREATE INDEX IF NOT EXISTS idx_record_links_source ON public.record_links(source_record_id, source_record_type);
CREATE INDEX IF NOT EXISTS idx_record_links_target ON public.record_links(target_record_id, target_record_type);
CREATE INDEX IF NOT EXISTS idx_record_links_org ON public.record_links(organization_id);
CREATE INDEX IF NOT EXISTS idx_record_links_type ON public.record_links(link_type);

-- Record Type Definitions
CREATE INDEX IF NOT EXISTS idx_rtd_org_slug ON public.record_type_definitions(organization_id, slug);
CREATE INDEX IF NOT EXISTS idx_rtd_org_active ON public.record_type_definitions(organization_id, is_active) WHERE is_active = true;

-- Document Triggers
CREATE INDEX IF NOT EXISTS idx_doc_triggers_org ON public.document_triggers(organization_id);
CREATE INDEX IF NOT EXISTS idx_doc_triggers_source ON public.document_triggers(source_document_id);
CREATE INDEX IF NOT EXISTS idx_doc_triggers_target ON public.document_triggers(target_document_id);

-- Document Relationships
CREATE INDEX IF NOT EXISTS idx_doc_rels_org ON public.document_relationships(organization_id);
CREATE INDEX IF NOT EXISTS idx_doc_rels_parent ON public.document_relationships(parent_document_id);

-- Document Prerequisites
CREATE INDEX IF NOT EXISTS idx_doc_prereqs_org_record ON public.document_prerequisites(organization_id, record_type);
CREATE INDEX IF NOT EXISTS idx_doc_prereqs_org_mandatory ON public.document_prerequisites(organization_id, is_mandatory) WHERE is_mandatory = true;

-- Custom Field Definitions
CREATE INDEX IF NOT EXISTS idx_cfd_org ON public.custom_field_definitions(organization_id);

-- Notifications (beyond the 5 indexes in migration 007)
CREATE INDEX IF NOT EXISTS idx_notifications_entity ON public.notifications(entity_type, entity_id) WHERE entity_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at DESC);

-- Scheduled Reports
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_org_status ON public.scheduled_reports(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_next_run ON public.scheduled_reports(next_run_at) WHERE next_run_at IS NOT NULL;

-- Electronic Signatures
CREATE INDEX IF NOT EXISTS idx_electronic_sigs_doc ON public.electronic_signatures(document_id) WHERE document_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_electronic_sigs_signed_by ON public.electronic_signatures(signed_by_id);

-- Organization Members
CREATE INDEX IF NOT EXISTS idx_org_members_org_status ON public.organization_members(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON public.organization_members(profile_id);

-- Profiles
CREATE INDEX IF NOT EXISTS idx_profiles_org ON public.profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);