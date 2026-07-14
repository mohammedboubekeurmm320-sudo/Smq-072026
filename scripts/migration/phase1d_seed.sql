-- ============================================================
-- PHASE 1D : SEED DONNÉES DE RÉFÉRENCE
-- 91 départements + 11 record types
-- Exécuter dans Supabase SQL Editor APRÈS la Phase 1C
-- ============================================================

BEGIN;

-- ==========================================
-- 1. 91 Départements (croisés avec toutes les orgs)
-- ==========================================
INSERT INTO departments (code, label_fr, label_en, category, parent_code, organization_id)
SELECT
    d.code, d.label_fr, d.label_en, d.category, d.parent_code, o.id
FROM organizations o
CROSS JOIN (
    VALUES
    -- Stratégique (8)
    ('DIRECTION', 'Direction', 'Management', 'strategique', NULL),
    ('DIRECTION_AQ', 'Direction Assurance Qualité', 'QA Management', 'strategique', 'DIRECTION'),
    ('DRH', 'Direction des Ressources Humaines', 'Human Resources', 'strategique', NULL),
    ('DRH_AQ', 'DRH Assurance Qualité', 'HR Quality Assurance', 'strategique', 'DRH'),
    ('DRH_DIRECTION', 'DRH Direction', 'HR Management', 'strategique', 'DRH'),
    ('DRH_TECHNIQUE', 'DRH Technique', 'HR Technical', 'strategique', 'DRH'),
    ('DRH_LABO_QC', 'DRH Laboratoire QC', 'HR QC Laboratory', 'strategique', 'DRH'),
    ('JURIDIQUE', 'Juridique', 'Legal', 'strategique', NULL),

    -- Quality (13)
    ('AQ', 'Assurance Qualité', 'Quality Assurance', 'quality', NULL),
    ('AQ_DIRECTION', 'AQ Direction', 'QA Direction', 'quality', 'AQ'),
    ('AQ_REGLEMENTAIRE', 'AQ Réglementaire', 'QA Regulatory', 'quality', 'AQ'),
    ('AQ_ARCHIVES', 'AQ Archives', 'QA Archives', 'quality', 'AQ'),
    ('AQ_TECHNIQUE', 'AQ Technique', 'QA Technical', 'quality', 'AQ'),
    ('AQ_LABO', 'AQ Laboratoire', 'QA Laboratory', 'quality', 'AQ'),
    ('AQ_PRODUCTION', 'AQ Production', 'QA Production', 'quality', 'AQ'),
    ('AQ_COMPTA', 'AQ Comptabilité', 'QA Accounting', 'quality', 'AQ'),
    ('CC_EQUIPEMENT', 'Change Control Équipement', 'CC Equipment', 'quality', NULL),
    ('CC_METHODE', 'Change Control Méthode', 'CC Method', 'quality', NULL),
    ('CC_REGLEMENTAIRE', 'Change Control Réglementaire', 'CC Regulatory', 'quality', NULL),
    ('CC_DOCUMENTATION', 'Change Control Documentation', 'CC Documentation', 'quality', NULL),
    ('DL_DIRECTION', 'Dossier Lot Direction', 'Batch Record Direction', 'quality', NULL),

    -- Regulatory (2)
    ('AFFAIRES_REG', 'Affaires Réglementaires', 'Regulatory Affairs', 'regulatory', NULL),
    ('AFFAIRES_REG_DIRECTION', 'Affaires Réglementaires Direction', 'Regulatory Affairs Direction', 'regulatory', 'AFFAIRES_REG'),

    -- Audit (2)
    ('AUDITEURS', 'Auditeurs', 'Auditors', 'audit', NULL),
    ('AUDITEURS_AQ', 'Auditeurs AQ', 'QA Auditors', 'audit', 'AUDITEURS'),

    -- QC Lab (9)
    ('LABO_PCQ', 'Laboratoire PCQ', 'QC Laboratory', 'qc_lab', NULL),
    ('LABO_PCQ_RD', 'Labo PCQ R&D', 'QC Lab R&D', 'qc_lab', 'LABO_PCQ'),
    ('LABO_PCQ_MAINT', 'Labo PCQ Maintenance', 'QC Lab Maintenance', 'qc_lab', 'LABO_PCQ'),
    ('LABO_PCQ_AQ', 'Labo PCQ AQ', 'QC Lab QA', 'qc_lab', 'LABO_PCQ'),
    ('LABO_MICRO', 'Laboratoire Microbiologie', 'Microbiology Lab', 'qc_lab', NULL),
    ('LABO_MICRO_HSE', 'Labo Micro HSE', 'Micro Lab HSE', 'qc_lab', 'LABO_MICRO'),
    ('LABO_MICRO_RD', 'Labo Micro R&D', 'Micro Lab R&D', 'qc_lab', 'LABO_MICRO'),
    ('LABO_STAB', 'Laboratoire Stabilité', 'Stability Lab', 'qc_lab', NULL),
    ('OOS_TEAM', 'Équipe OOS', 'OOS Team', 'qc_lab', NULL),

    -- Production (4)
    ('PRODUCTION', 'Production', 'Production', 'production', NULL),
    ('PRODUCTION_AQ', 'Production AQ', 'Production QA', 'production', 'PRODUCTION'),
    ('PRODUCTION_QC', 'Production QC', 'Production QC', 'production', 'PRODUCTION'),
    ('PRODUCTION_SUPPLY', 'Production Supply Chain', 'Production Supply Chain', 'production', 'PRODUCTION'),

    -- R&D (5)
    ('RD', 'Recherche & Développement', 'Research & Development', 'rd', NULL),
    ('RD_LABO', 'R&D Laboratoire', 'R&D Laboratory', 'rd', 'RD'),
    ('RD_PRODUCTION', 'R&D Production', 'R&D Production', 'rd', 'RD'),
    ('RD_JURIDIQUE', 'R&D Juridique', 'R&D Legal', 'rd', 'RD'),
    ('RD_QC', 'R&D QC', 'R&D QC', 'rd', 'RD'),

    -- Utilities (5)
    ('STATION_EAU', 'Station de Traitement Eau', 'Water Treatment', 'utilities', NULL),
    ('STATION_EAU_QC', 'Station Eau QC', 'Water Treatment QC', 'utilities', 'STATION_EAU'),
    ('UTILITES', 'Utilités', 'Utilities', 'utilities', NULL),
    ('UTILITES_MAINT', 'Utilités Maintenance', 'Utilities Maintenance', 'utilities', 'UTILITES'),
    ('UTILITES_HSE', 'Utilités HSE', 'Utilities HSE', 'utilities', 'UTILITES'),

    -- Maintenance (8)
    ('MAINTENANCE', 'Maintenance', 'Maintenance', 'maintenance', NULL),
    ('MAINTENANCE_SUPPLY', 'Maintenance Supply', 'Maintenance Supply', 'maintenance', 'MAINTENANCE'),
    ('MAINT_ELEC', 'Maintenance Électrique', 'Electrical Maintenance', 'maintenance', 'MAINTENANCE'),
    ('MAINT_PLB', 'Maintenance Plomberie', 'Plumbing Maintenance', 'maintenance', 'MAINTENANCE'),
    ('MAINT_MEC', 'Maintenance Mécanique', 'Mechanical Maintenance', 'maintenance', 'MAINTENANCE'),
    ('MAINT_FRD', 'Maintenance Froid', 'Refrigeration Maintenance', 'maintenance', 'MAINTENANCE'),
    ('MAINT_AUTO', 'Maintenance Automatisme', 'Automation Maintenance', 'maintenance', 'MAINTENANCE'),
    ('MAINT_STRUCT', 'Maintenance Structure', 'Structural Maintenance', 'maintenance', 'MAINTENANCE'),

    -- HSE (12)
    ('HSE', 'Hygiène Sécurité Environnement', 'HSE', 'hse', NULL),
    ('HSE_MAINT', 'HSE Maintenance', 'HSE Maintenance', 'hse', 'HSE'),
    ('HSE_DIRECTION', 'HSE Direction', 'HSE Management', 'hse', 'HSE'),
    ('HSE_LABO_MICRO', 'HSE Labo Micro', 'HSE Micro Lab', 'hse', 'HSE'),
    ('HSE_SUPPLY', 'HSE Supply Chain', 'HSE Supply Chain', 'hse', 'HSE'),
    ('HSE_PRODUCTION', 'HSE Production', 'HSE Production', 'hse', 'HSE'),
    ('HSE_QC', 'HSE QC', 'HSE QC', 'hse', 'HSE'),
    ('HSE_EPI', 'HSE EPI', 'HSE PPE', 'hse', 'HSE'),
    ('HSE_DECHETS', 'HSE Déchets', 'HSE Waste', 'hse', 'HSE'),
    ('HSE_INCENDIE', 'HSE Incendie', 'HSE Fire Safety', 'hse', 'HSE'),
    ('HSE_ENVIRONNEMENT', 'HSE Environnement', 'HSE Environment', 'hse', 'HSE'),
    ('HSE_SECURITE', 'HSE Sécurité', 'HSE Safety', 'hse', 'HSE'),

    -- Supply Chain (10)
    ('SUPPLY_CHAIN', 'Supply Chain', 'Supply Chain', 'supply_chain', NULL),
    ('SC_RECEPTION', 'Réception', 'Reception', 'supply_chain', 'SUPPLY_CHAIN'),
    ('SC_ENTREPOT', 'Entrepôt', 'Warehouse', 'supply_chain', 'SUPPLY_CHAIN'),
    ('SC_EXPEDITION', 'Expédition', 'Shipping', 'supply_chain', 'SUPPLY_CHAIN'),
    ('SC_QC', 'Supply Chain QC', 'Supply Chain QC', 'supply_chain', 'SUPPLY_CHAIN'),
    ('SC_DIRECTION', 'Supply Chain Direction', 'Supply Chain Management', 'supply_chain', 'SUPPLY_CHAIN'),
    ('SC_AQ', 'Supply Chain AQ', 'Supply Chain QA', 'supply_chain', 'SUPPLY_CHAIN'),
    ('SC_MAINT', 'Supply Chain Maintenance', 'Supply Chain Maintenance', 'supply_chain', 'SUPPLY_CHAIN'),
    ('SC_HSE', 'Supply Chain HSE', 'Supply Chain HSE', 'supply_chain', 'SUPPLY_CHAIN'),
    ('SC_COMPTA', 'Supply Chain Comptabilité', 'Supply Chain Accounting', 'supply_chain', 'SUPPLY_CHAIN'),

    -- Commercial (3)
    ('COMMERCIAL', 'Commercial', 'Commercial', 'commercial', NULL),
    ('COMMERCIAL_AQ', 'Commercial AQ', 'Commercial QA', 'commercial', 'COMMERCIAL'),
    ('COMMERCIAL_SUPPLY', 'Commercial Supply', 'Commercial Supply', 'commercial', 'COMMERCIAL'),

    -- Finance (5)
    ('FINANCE', 'Finance', 'Finance', 'finance', NULL),
    ('COMPTA', 'Comptabilité', 'Accounting', 'finance', NULL),
    ('COMPTA_DIRECTION', 'Comptabilité Direction', 'Accounting Management', 'finance', 'COMPTA'),
    ('COMPTA_SC', 'Comptabilité Supply Chain', 'Supply Chain Accounting', 'finance', 'COMPTA'),
    ('FINANCE_AQ', 'Finance AQ', 'Finance QA', 'finance', 'FINANCE'),

    -- IT (2)
    ('INFORMATIQUE', 'Informatique', 'Information Technology', 'it', NULL),
    ('IT_AQ', 'IT Assurance Qualité', 'IT Quality Assurance', 'it', 'INFORMATIQUE'),

    -- Transversal (3)
    ('TOUS_DEPARTEMENTS', 'Tous Départements', 'All Departments', 'transversal', NULL),
    ('DIRECTION_SUPPLY_AQ', 'Direction Supply AQ', 'Direction Supply QA', 'transversal', NULL),
    ('DL_QA', 'Dossier Lot QA', 'Batch Record QA', 'transversal', NULL)
) AS d(code, label_fr, label_en, category, parent_code)
WHERE NOT EXISTS (
    SELECT 1 FROM departments dep
    WHERE dep.code = d.code AND dep.organization_id = o.id
);

-- ==========================================
-- 2. 11 Record Type Definitions (croisés avec toutes les orgs)
-- ==========================================
INSERT INTO record_type_definitions (slug, name, name_en, icon, is_system, code_prefix, status_flow, organization_id)
SELECT
    r.slug, r.name, r.name_en, r.icon, true, r.code_prefix, r.status_flow::jsonb, o.id
FROM organizations o
CROSS JOIN (
    VALUES
    ('capa', 'CAPA', 'CAPA', 'ShieldCheck', 'CAPA',
     '[{"linear":["Open","Investigation","Implementation","Effectiveness_Check","Closed"],"eSigRequired":["Closed"],"terminal":["Closed"]}]'::jsonb),
    ('ncr', 'Non-Conformité', 'Non-Conformance', 'AlertTriangle', 'NCR',
     '[{"linear":["Open","In_Progress","Closed","Verified"],"eSigRequired":["Verified"],"terminal":["Verified"]}]'::jsonb),
    ('deviation', 'Déviation', 'Deviation', 'GitBranch', 'DEV',
     '[{"linear":["Open","Investigation","Implementation","Effectiveness_Check","Closed"],"eSigRequired":["Closed"],"terminal":["Closed"]}]'::jsonb),
    ('change-control', 'Maîtrise des Changements', 'Change Control', 'RefreshCw', 'CC',
     '[{"linear":["Requested","Under_Review","Approved","In_Implementation","Completed"],"branches":{"Rejected":["Requested"]},"eSigRequired":["Approved","Rejected","Completed"],"terminal":["Completed","Rejected"]}]'::jsonb),
    ('audit', 'Audit', 'Audit', 'Search', 'AUD',
     '[{"linear":["Planned","In_Progress","Completed"],"eSigRequired":["Completed"],"terminal":["Completed"]}]'::jsonb),
    ('risk', 'Risque', 'Risk Management', 'TrendingUp', 'RSK',
     '[{"linear":["Open","Mitigated","Accepted","Closed"],"eSigRequired":["Accepted","Closed"],"terminal":["Closed"]}]'::jsonb),
    ('training', 'Formation', 'Training', 'GraduationCap', 'TRN',
     '[{"linear":["Planned","In_Progress","Completed"],"terminal":["Completed","Overdue"]}]'::jsonb),
    ('supplier', 'Fournisseur', 'Supplier', 'Truck', 'SUP',
     '[{"linear":["Under_Evaluation","Qualified","Conditional","Disqualified"],"eSigRequired":["Qualified","Disqualified"],"terminal":["Qualified","Disqualified"]}]'::jsonb),
    ('batch-record', 'Enregistrement de Lot', 'Batch Record', 'Package', 'BR',
     '[{"linear":["In_Progress","Pending_QA_Review","Released"],"branches":{"Rejected":[],"Quarantine":["Pending_QA_Review"]},"eSigRequired":["Released","Rejected"],"terminal":["Released","Rejected"]}]'::jsonb),
    ('oos-oot', 'HSP/HOT', 'OOS/OOT', 'FlaskConical', 'OOS',
     '[{"linear":["Open","Investigation","Implementation","Closed"],"eSigRequired":["Closed"],"terminal":["Closed"]}]'::jsonb),
    ('general', 'Général', 'General', 'FileText', 'GEN',
     '[{"linear":["Draft","Under_Review","Approved","Effective","Obsolete"],"terminal":["Obsolete"]}]'::jsonb)
) AS r(slug, name, name_en, icon, code_prefix, status_flow)
WHERE NOT EXISTS (
    SELECT 1 FROM record_type_definitions rtd
    WHERE rtd.slug = r.slug AND rtd.organization_id = o.id
);

-- ==========================================
-- 3. Ajouter l'admin comme membre de son org
-- ==========================================
INSERT INTO organization_members (organization_id, user_id, role, status, invited_by)
SELECT p.organization_id, p.id, 'owner', 'active', p.id
FROM profiles p
WHERE p.role = 'admin' OR p.email = 'admin@example.com'
ON CONFLICT (organization_id, user_id) DO NOTHING;

COMMIT;