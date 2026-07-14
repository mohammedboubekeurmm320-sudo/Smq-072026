-- ============================================================
-- PHASE 1B : TABLES (25 tables)
-- CORRIGÉ: UUID → TEXT pour FK vers organizations(id) et profiles(id)
-- Exécuter dans Supabase SQL Editor APRÈS la Phase 1A
-- ============================================================

BEGIN;

-- ==========================================
-- CLEANUP: supprimer les tables partiellement créées par l'échec précédent
-- (ordre inverse des dépendances)
-- ==========================================
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS scheduled_reports CASCADE;
DROP TABLE IF EXISTS record_links CASCADE;
DROP TABLE IF EXISTS record_type_definitions CASCADE;
DROP TABLE IF EXISTS document_code_sequences CASCADE;
DROP TABLE IF EXISTS document_relationships CASCADE;
DROP TABLE IF EXISTS document_triggers CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS audit_trails CASCADE;
DROP TABLE IF EXISTS audit_config CASCADE;
DROP TABLE IF EXISTS batch_records CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
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

-- ==========================================
-- 1. organization_members (multi-org)
-- ==========================================
CREATE TABLE organization_members (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role org_member_role DEFAULT 'member',
    status org_member_status DEFAULT 'active',
    invited_by TEXT REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(organization_id, user_id)
);
CREATE INDEX idx_org_members_org ON organization_members(organization_id);
CREATE INDEX idx_org_members_user ON organization_members(user_id);

-- ==========================================
-- 2. documents (ISO 13485 §4.2.3)
-- ==========================================
CREATE TABLE documents (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    document_number TEXT NOT NULL,
    title TEXT NOT NULL,
    doc_type document_type NOT NULL,
    version TEXT NOT NULL DEFAULT '1.0',
    status document_status NOT NULL DEFAULT 'Draft',
    effective_date TIMESTAMPTZ,
    expiration_date TIMESTAMPTZ,
    owner TEXT,
    department TEXT,
    last_reviewed TIMESTAMPTZ,
    next_review TIMESTAMPTZ,
    description TEXT,
    classification document_classification,
    retention_period TEXT,
    doc_scope TEXT,
    keywords TEXT[],
    file_url TEXT,
    file_size BIGINT,
    mime_type TEXT,
    checksum TEXT,
    parent_document_id TEXT REFERENCES documents(id) ON DELETE SET NULL,
    document_level document_level DEFAULT 'Level_3',
    author_id TEXT REFERENCES profiles(id),
    created_by_id TEXT REFERENCES profiles(id),
    organization_id TEXT NOT NULL REFERENCES organizations(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_documents_org ON documents(organization_id);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_parent ON documents(parent_document_id);
CREATE INDEX idx_documents_level ON documents(document_level);
CREATE INDEX idx_documents_number ON documents(document_number);
CREATE INDEX idx_documents_type ON documents(doc_type);
CREATE INDEX idx_documents_department ON documents(department);

-- ==========================================
-- 3. electronic_signatures (21 CFR Part 11)
-- ==========================================
CREATE TABLE electronic_signatures (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    document_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
    record_id TEXT,
    record_type TEXT,
    signed_by_id TEXT NOT NULL REFERENCES profiles(id),
    signer_name TEXT NOT NULL,
    signer_role TEXT NOT NULL,
    signature_type signature_type,
    signature_hash TEXT NOT NULL,
    user_agent TEXT,
    revoked BOOLEAN NOT NULL DEFAULT false,
    revocation_reason TEXT,
    organization_id TEXT REFERENCES organizations(id),
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_esig_org ON electronic_signatures(organization_id);
CREATE INDEX idx_esig_record ON electronic_signatures(record_id, record_type);
CREATE INDEX idx_esig_doc ON electronic_signatures(document_id);

-- ==========================================
-- 4. document_prerequisites
-- ==========================================
CREATE TABLE document_prerequisites (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    organization_id TEXT REFERENCES organizations(id),
    record_type TEXT,
    required_doc_type TEXT NOT NULL,
    required_doc_ref TEXT,
    is_mandatory BOOLEAN NOT NULL DEFAULT true,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_doc_prereq_org ON document_prerequisites(organization_id);
CREATE INDEX idx_doc_prereq_type ON document_prerequisites(record_type);

-- ==========================================
-- 5. form_templates (Layer 1 - Approbation)
-- ==========================================
CREATE TABLE form_templates (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    document_id TEXT,
    title TEXT NOT NULL,
    version TEXT NOT NULL DEFAULT '1.0',
    description TEXT,
    fields JSONB NOT NULL DEFAULT '[]',
    is_active BOOLEAN NOT NULL DEFAULT true,
    status form_template_status NOT NULL DEFAULT 'Draft',
    module_type TEXT NOT NULL DEFAULT 'general',
    workflow JSONB,
    compliance JSONB,
    signatures JSONB DEFAULT '[]',
    current_approval_step INTEGER DEFAULT 0,
    previous_version_id TEXT REFERENCES form_templates(id),
    effective_date TIMESTAMPTZ,
    review_comment TEXT,
    organization_id TEXT NOT NULL REFERENCES organizations(id),
    created_by_id TEXT REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_ftmpl_org ON form_templates(organization_id);
CREATE INDEX idx_ftmpl_status ON form_templates(status);
CREATE INDEX idx_ftmpl_module ON form_templates(module_type);

-- ==========================================
-- 6. form_instances (Layer 2 - Exécution)
-- ==========================================
CREATE TABLE form_instances (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    template_id TEXT NOT NULL REFERENCES form_templates(id),
    template_version TEXT NOT NULL,
    reference_number TEXT NOT NULL,
    values JSONB NOT NULL DEFAULT '{}',
    status form_instance_status NOT NULL DEFAULT 'Draft',
    is_locked BOOLEAN NOT NULL DEFAULT false,
    submitted_by_id TEXT REFERENCES profiles(id),
    submitted_at TIMESTAMPTZ,
    signature_hash TEXT,
    signatures JSONB DEFAULT '[]',
    current_approval_step INTEGER DEFAULT 0,
    approval_history JSONB DEFAULT '[]',
    parent_document_id TEXT REFERENCES documents(id),
    linked_record_id TEXT,
    linked_record_type TEXT,
    record_type_slug TEXT,
    organization_id TEXT NOT NULL REFERENCES organizations(id),
    created_by_id TEXT REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_finst_org ON form_instances(organization_id);
CREATE INDEX idx_finst_status ON form_instances(status);
CREATE INDEX idx_finst_template ON form_instances(template_id);
CREATE INDEX idx_finst_ref ON form_instances(reference_number);

-- ==========================================
-- 7. capas (ISO 13485 §8.5.2/§8.5.3)
-- ==========================================
CREATE TABLE capas (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    capa_number TEXT NOT NULL,
    title TEXT NOT NULL,
    capa_type capa_type NOT NULL,
    status capa_status NOT NULL DEFAULT 'Open',
    template_id TEXT,
    template_version TEXT,
    priority capa_priority DEFAULT 'Medium',
    source capa_source,
    source_reference_id TEXT,
    description TEXT,
    problem_statement TEXT,
    investigation_details TEXT,
    root_cause_analysis TEXT,
    root_cause_category root_cause_category,
    five_whys JSONB,
    corrective_action TEXT,
    effectiveness_verification_method TEXT,
    effectiveness_criteria TEXT,
    effectiveness_result TEXT CHECK (effectiveness_result IN ('Effective', 'Partially_Effective', 'Ineffective')),
    linked_document_id TEXT REFERENCES documents(id),
    linked_ncr_id TEXT,
    linked_audit_id TEXT,
    assigned_to TEXT REFERENCES profiles(id),
    due_date DATE,
    created_date DATE NOT NULL DEFAULT CURRENT_DATE,
    closed_date DATE,
    created_by_id TEXT REFERENCES profiles(id),
    organization_id TEXT NOT NULL REFERENCES organizations(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_capas_org ON capas(organization_id);
CREATE INDEX idx_capas_status ON capas(status);
CREATE INDEX idx_capas_number ON capas(capa_number);
CREATE INDEX idx_capas_template ON capas(template_id);
CREATE INDEX idx_capas_assigned ON capas(assigned_to);

-- ==========================================
-- 8. non_conformances (ISO 13485 §8.3)
-- ==========================================
CREATE TABLE non_conformances (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    ncr_number TEXT NOT NULL,
    title TEXT NOT NULL,
    ncr_type ncr_type NOT NULL,
    status ncr_status NOT NULL DEFAULT 'Open',
    template_id TEXT,
    template_version TEXT,
    severity ncr_severity DEFAULT 'Minor',
    source TEXT,
    description TEXT,
    lot_number TEXT,
    quantity_affected INTEGER,
    disposition ncr_disposition,
    linked_capa_id TEXT REFERENCES capas(id),
    linked_procedure_ref TEXT,
    supplier_id TEXT,
    is_oos_oot BOOLEAN DEFAULT false,
    analytical_method TEXT,
    measured_value NUMERIC(15,5),
    measured_unit TEXT,
    spec_limit NUMERIC(15,5),
    phase1_conclusion TEXT CHECK (phase1_conclusion IN ('Inconclusive','Conclusive','Not_Applicable')),
    phase2_required BOOLEAN DEFAULT false,
    phase2_conclusion TEXT CHECK (phase2_conclusion IN ('Inconclusive','Conclusive','Not_Applicable')),
    reject_lot BOOLEAN DEFAULT false,
    impact_assessment TEXT,
    containment_actions TEXT,
    affected_product TEXT,
    assigned_to TEXT REFERENCES profiles(id),
    due_date DATE,
    created_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_by_id TEXT REFERENCES profiles(id),
    organization_id TEXT NOT NULL REFERENCES organizations(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_ncrs_org ON non_conformances(organization_id);
CREATE INDEX idx_ncrs_status ON non_conformances(status);
CREATE INDEX idx_ncrs_number ON non_conformances(ncr_number);
CREATE INDEX idx_ncrs_template ON non_conformances(template_id);
CREATE INDEX idx_ncrs_severity ON non_conformances(severity);

-- ==========================================
-- 9. deviations (ISO 13485 §8.3)
-- ==========================================
CREATE TABLE deviations (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    dev_number TEXT NOT NULL,
    title TEXT NOT NULL,
    deviation_type deviation_type NOT NULL,
    status deviation_status NOT NULL DEFAULT 'Open',
    template_id TEXT,
    template_version TEXT,
    severity deviation_severity DEFAULT 'Minor',
    category deviation_category,
    description TEXT,
    deviation_details TEXT,
    justification TEXT,
    risk_assessment TEXT,
    corrective_action TEXT,
    preventive_action TEXT,
    sop_reference TEXT,
    expected_result TEXT,
    actual_result TEXT,
    product_stage product_stage,
    quarantine BOOLEAN DEFAULT false,
    impact_on_validated_state TEXT,
    impact_on_regulatory_filing TEXT,
    containment_action TEXT,
    detected_date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_planned_deviation BOOLEAN DEFAULT false,
    lot_number TEXT,
    product_code TEXT,
    quantity_affected INTEGER,
    linked_capa_id TEXT REFERENCES capas(id),
    linked_document_id TEXT REFERENCES documents(id),
    assigned_to TEXT REFERENCES profiles(id),
    due_date DATE,
    closed_date DATE,
    created_by_id TEXT REFERENCES profiles(id),
    organization_id TEXT NOT NULL REFERENCES organizations(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_devs_org ON deviations(organization_id);
CREATE INDEX idx_devs_status ON deviations(status);
CREATE INDEX idx_devs_number ON deviations(dev_number);
CREATE INDEX idx_devs_template ON deviations(template_id);

-- ==========================================
-- 10. change_controls (ISO 13485 §7.3.7)
-- ==========================================
CREATE TABLE change_controls (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    cc_number TEXT NOT NULL,
    title TEXT NOT NULL,
    cc_type cc_type NOT NULL,
    status cc_status NOT NULL DEFAULT 'Requested',
    template_id TEXT,
    template_version TEXT,
    priority cc_priority DEFAULT 'Medium',
    category cc_category,
    description TEXT,
    justification TEXT,
    proposed_change TEXT,
    detailed_change_description TEXT,
    business_compliance_justification TEXT,
    risk_assessment TEXT,
    impact_analysis TEXT,
    affected_areas TEXT,
    impact_on_validated_systems TEXT,
    implementation_plan TEXT,
    implementation_date DATE,
    estimated_cost_impact TEXT,
    completion_date DATE,
    regulatory_trigger BOOLEAN DEFAULT false,
    emergency_flag BOOLEAN DEFAULT false,
    linked_document_id TEXT REFERENCES documents(id),
    linked_capa_id TEXT REFERENCES capas(id),
    additional_references TEXT,
    assigned_to TEXT REFERENCES profiles(id),
    requested_by TEXT REFERENCES profiles(id),
    approved_by TEXT REFERENCES profiles(id),
    approver TEXT,
    due_date DATE,
    created_by_id TEXT REFERENCES profiles(id),
    organization_id TEXT NOT NULL REFERENCES organizations(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_cc_org ON change_controls(organization_id);
CREATE INDEX idx_cc_status ON change_controls(status);
CREATE INDEX idx_cc_number ON change_controls(cc_number);
CREATE INDEX idx_cc_template ON change_controls(template_id);
CREATE INDEX idx_cc_category ON change_controls(category);

-- ==========================================
-- 11. audits (ISO 13485 §8.2.4)
-- ==========================================
CREATE TABLE audits (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    audit_number TEXT NOT NULL,
    title TEXT NOT NULL,
    audit_type audit_type NOT NULL,
    status audit_status NOT NULL DEFAULT 'Planned',
    template_id TEXT,
    template_version TEXT,
    audit_scope TEXT,
    scheduled_date DATE,
    completed_date DATE,
    lead_auditor TEXT REFERENCES profiles(id),
    auditees JSONB,
    findings JSONB,
    organization_id TEXT NOT NULL REFERENCES organizations(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_audits_org ON audits(organization_id);
CREATE INDEX idx_audits_status ON audits(status);
CREATE INDEX idx_audits_number ON audits(audit_number);
CREATE INDEX idx_audits_template ON audits(template_id);

-- ==========================================
-- 12. training (ISO 13485 §6.2)
-- ==========================================
CREATE TABLE training (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    title TEXT NOT NULL,
    description TEXT,
    training_type training_type NOT NULL,
    status training_status NOT NULL DEFAULT 'Planned',
    template_id TEXT,
    template_version TEXT,
    assigned_to TEXT REFERENCES profiles(id),
    due_date DATE,
    completed_date DATE,
    document_id TEXT REFERENCES documents(id),
    organization_id TEXT NOT NULL REFERENCES organizations(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_training_org ON training(organization_id);
CREATE INDEX idx_training_status ON training(status);
CREATE INDEX idx_training_template ON training(template_id);
CREATE INDEX idx_training_assigned ON training(assigned_to);

-- ==========================================
-- 13. risks (ISO 14971)
-- ==========================================
CREATE TABLE risks (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    risk_number TEXT NOT NULL,
    title TEXT NOT NULL,
    category risk_category NOT NULL DEFAULT 'Process',
    probability SMALLINT NOT NULL DEFAULT 1 CHECK (probability BETWEEN 1 AND 5),
    impact SMALLINT NOT NULL DEFAULT 1 CHECK (impact BETWEEN 1 AND 5),
    detectability SMALLINT NOT NULL DEFAULT 1 CHECK (detectability BETWEEN 1 AND 5),
    rpn INTEGER NOT NULL GENERATED ALWAYS AS (probability * impact * detectability) STORED,
    risk_level risk_level NOT NULL DEFAULT 'Medium',
    template_id TEXT,
    template_version TEXT,
    mitigation TEXT,
    residual_risk TEXT,
    status risk_status NOT NULL DEFAULT 'Open',
    organization_id TEXT NOT NULL REFERENCES organizations(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_risks_org ON risks(organization_id);
CREATE INDEX idx_risks_status ON risks(status);
CREATE INDEX idx_risks_number ON risks(risk_number);
CREATE INDEX idx_risks_level ON risks(risk_level);
CREATE INDEX idx_risks_template ON risks(template_id);

-- ==========================================
-- 14. suppliers (ISO 13485 §7.4.1)
-- ==========================================
CREATE TABLE suppliers (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    supplier_code TEXT NOT NULL,
    name TEXT NOT NULL,
    category supplier_category,
    status supplier_status NOT NULL DEFAULT 'Under_Evaluation',
    template_id TEXT,
    template_version TEXT,
    qualification_date DATE,
    next_review_date DATE,
    certifications JSONB,
    performance_score NUMERIC(3,1) CHECK (performance_score BETWEEN 0 AND 100),
    qualification_doc_id TEXT REFERENCES documents(id),
    website TEXT,
    primary_contact_name TEXT,
    primary_contact_email TEXT,
    primary_contact_phone TEXT,
    street TEXT,
    city TEXT,
    state_province TEXT,
    postal_code TEXT,
    country TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    qualification_method qualification_method,
    qualification_doc_ref TEXT,
    created_by_id TEXT REFERENCES profiles(id),
    organization_id TEXT NOT NULL REFERENCES organizations(id),
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_suppliers_org ON suppliers(organization_id);
CREATE INDEX idx_suppliers_status ON suppliers(status);
CREATE INDEX idx_suppliers_code ON suppliers(supplier_code);
CREATE INDEX idx_suppliers_template ON suppliers(template_id);

-- ==========================================
-- 15. batch_records (ISO 13485 §7.5.1)
-- ==========================================
CREATE TABLE batch_records (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    lot_number TEXT NOT NULL,
    product_name TEXT NOT NULL,
    product_code TEXT,
    batch_size NUMERIC,
    batch_size_unit TEXT,
    master_formula_id TEXT REFERENCES documents(id),
    sop_reference TEXT,
    manufacturing_date DATE,
    expiry_date DATE,
    status batch_status NOT NULL DEFAULT 'In_Progress',
    is_locked BOOLEAN NOT NULL DEFAULT false,
    template_id TEXT,
    template_version TEXT,
    qa_release_date DATE,
    qa_released_by_id TEXT REFERENCES profiles(id),
    steps JSONB,
    raw_materials JSONB,
    organization_id TEXT NOT NULL REFERENCES organizations(id),
    created_by_id TEXT REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_batch_org ON batch_records(organization_id);
CREATE INDEX idx_batch_status ON batch_records(status);
CREATE INDEX idx_batch_lot ON batch_records(lot_number);
CREATE INDEX idx_batch_template ON batch_records(template_id);

-- ==========================================
-- 16. audit_config (singleton)
-- ==========================================
CREATE TABLE audit_config (
    id TEXT PRIMARY KEY DEFAULT 'singleton' CHECK (id = 'singleton'),
    signing_salt TEXT DEFAULT 'fallback-dev-only-do-not-use-in-prod',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- 17. audit_trails (21 CFR Part 11 §11.10(e))
-- ==========================================
CREATE TABLE audit_trails (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    audit_action audit_action,
    table_name TEXT NOT NULL,
    record_id TEXT,
    user_id TEXT,
    user_email TEXT,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    organization_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    -- Blockchain fields
    sequence_number BIGINT,
    previous_hash TEXT,
    hash TEXT
);
CREATE INDEX idx_audit_trails_org ON audit_trails(organization_id);
CREATE INDEX idx_audit_trails_org_seq ON audit_trails(organization_id, sequence_number);
CREATE INDEX idx_audit_trails_action ON audit_trails(audit_action);
CREATE INDEX idx_audit_trails_table ON audit_trails(table_name);
CREATE INDEX idx_audit_trails_created ON audit_trails(created_at);
CREATE INDEX idx_audit_trails_user ON audit_trails(user_id);
CREATE UNIQUE INDEX idx_audit_trails_org_seq_unique ON audit_trails(organization_id, sequence_number) WHERE sequence_number IS NOT NULL;

-- ==========================================
-- 18. departments (91 départements)
-- ==========================================
CREATE TABLE departments (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    code TEXT NOT NULL,
    label_fr TEXT NOT NULL,
    label_en TEXT NOT NULL,
    category TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    parent_code TEXT,
    organization_id TEXT REFERENCES organizations(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(code, organization_id)
);
CREATE INDEX idx_depts_org ON departments(organization_id);
CREATE INDEX idx_depts_category ON departments(category);
CREATE INDEX idx_depts_active ON departments(is_active) WHERE is_active = true;

-- ==========================================
-- 19. document_triggers
-- ==========================================
CREATE TABLE document_triggers (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    source_document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    target_document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    trigger_type trigger_type NOT NULL,
    description TEXT,
    is_mandatory BOOLEAN DEFAULT false,
    organization_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT no_self_trigger CHECK (source_document_id != target_document_id),
    CONSTRAINT unique_trigger_pair UNIQUE(source_document_id, target_document_id, trigger_type)
);
CREATE INDEX idx_doc_triggers_org ON document_triggers(organization_id);

-- ==========================================
-- 20. document_relationships
-- ==========================================
CREATE TABLE document_relationships (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    source_document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    target_document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    relationship_type relationship_type NOT NULL,
    description TEXT,
    organization_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT no_self_relationship CHECK (source_document_id != target_document_id),
    CONSTRAINT unique_relationship_pair UNIQUE(source_document_id, target_document_id, relationship_type)
);
CREATE INDEX idx_doc_rels_org ON document_relationships(organization_id);

-- ==========================================
-- 21. document_code_sequences
-- ==========================================
CREATE TABLE document_code_sequences (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    prefix TEXT NOT NULL,
    department_suffix TEXT,
    last_sequence INTEGER DEFAULT 0,
    organization_id TEXT NOT NULL REFERENCES organizations(id),
    UNIQUE(prefix, department_suffix, organization_id)
);

-- ==========================================
-- 22. record_type_definitions (système extensible)
-- ==========================================
CREATE TABLE record_type_definitions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    slug TEXT NOT NULL,
    name TEXT NOT NULL,
    name_en TEXT,
    icon TEXT DEFAULT 'FileText',
    description TEXT,
    is_system BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    code_prefix TEXT,
    status_flow JSONB DEFAULT '[]',
    default_fields JSONB DEFAULT '[]',
    compliance_refs JSONB DEFAULT '[]',
    organization_id TEXT NOT NULL REFERENCES organizations(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(slug, organization_id)
);
CREATE INDEX idx_rtd_org ON record_type_definitions(organization_id);
CREATE INDEX idx_rtd_slug ON record_type_definitions(slug);
CREATE INDEX idx_rtd_active ON record_type_definitions(is_active) WHERE is_active = true;

-- ==========================================
-- 23. record_links (polymorphiques)
-- ==========================================
CREATE TABLE record_links (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    source_record_id TEXT NOT NULL,
    source_record_type TEXT NOT NULL,
    target_record_id TEXT NOT NULL,
    target_record_type TEXT NOT NULL,
    link_type record_link_type NOT NULL DEFAULT 'related',
    description TEXT,
    organization_id TEXT REFERENCES organizations(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT chk_no_self_link CHECK (
        source_record_id != target_record_id OR source_record_type != target_record_type
    ),
    CONSTRAINT uq_record_link UNIQUE(source_record_id, source_record_type, target_record_id, target_record_type, link_type)
);
CREATE INDEX idx_rlinks_source ON record_links(source_record_id, source_record_type);
CREATE INDEX idx_rlinks_target ON record_links(target_record_id, target_record_type);
CREATE INDEX idx_rlinks_type ON record_links(link_type);
CREATE INDEX idx_rlinks_org ON record_links(organization_id);

-- ==========================================
-- 24. scheduled_reports
-- ==========================================
CREATE TABLE scheduled_reports (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    report_type TEXT NOT NULL,
    frequency report_frequency NOT NULL DEFAULT 'monthly',
    format report_format NOT NULL DEFAULT 'pdf',
    status scheduled_report_status NOT NULL DEFAULT 'active',
    config JSONB DEFAULT '{}',
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    created_by_id TEXT REFERENCES profiles(id),
    organization_id TEXT NOT NULL REFERENCES organizations(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_scheduled_reports_org ON scheduled_reports(organization_id);
CREATE INDEX idx_scheduled_reports_status ON scheduled_reports(status);

-- ==========================================
-- 25. notifications
-- ==========================================
CREATE TABLE notifications (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    title TEXT NOT NULL,
    message TEXT,
    type TEXT DEFAULT 'info',
    is_read BOOLEAN DEFAULT false,
    profile_id TEXT NOT NULL,
    organization_id TEXT NOT NULL REFERENCES organizations(id),
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_notifications_profile ON notifications(profile_id);
CREATE INDEX idx_notifications_org ON notifications(organization_id);
CREATE INDEX idx_notifications_read ON notifications(is_read) WHERE is_read = false;

COMMIT;