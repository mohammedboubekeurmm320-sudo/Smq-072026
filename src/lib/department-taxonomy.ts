// Department taxonomy — 91 predefined departments in 16 categories
// Replicated from smq-iso-13485-pro

export interface Department {
  code: string;
  labelFr: string;
  labelEn: string;
  category: DepartmentCategory;
  parentCode?: string;
}

export type DepartmentCategory =
  | 'strategique' | 'transversal' | 'qc_lab' | 'production' | 'rd'
  | 'utilities' | 'maintenance' | 'hse' | 'supply_chain' | 'commercial'
  | 'finance' | 'it' | 'quality' | 'regulatory' | 'audit' | 'other';

export const DEPARTMENT_CATEGORIES: { value: DepartmentCategory; labelFr: string; labelEn: string }[] = [
  { value: 'strategique', labelFr: 'Stratégique & Direction', labelEn: 'Strategic & Leadership' },
  { value: 'transversal', labelFr: 'Transversal', labelEn: 'Cross-Functional' },
  { value: 'qc_lab', labelFr: 'Laboratoire QC', labelEn: 'QC Lab' },
  { value: 'production', labelFr: 'Production', labelEn: 'Production' },
  { value: 'rd', labelFr: 'R&D', labelEn: 'R&D' },
  { value: 'utilities', labelFr: 'Utilités', labelEn: 'Utilities' },
  { value: 'maintenance', labelFr: 'Maintenance', labelEn: 'Maintenance' },
  { value: 'hse', labelFr: 'HSE', labelEn: 'HSE' },
  { value: 'supply_chain', labelFr: 'Supply Chain', labelEn: 'Supply Chain' },
  { value: 'commercial', labelFr: 'Commercial', labelEn: 'Commercial' },
  { value: 'finance', labelFr: 'Finance', labelEn: 'Finance' },
  { value: 'it', labelFr: 'IT', labelEn: 'IT' },
  { value: 'quality', labelFr: 'Qualité', labelEn: 'Quality' },
  { value: 'regulatory', labelFr: 'Réglementaire', labelEn: 'Regulatory' },
  { value: 'audit', labelFr: 'Audit', labelEn: 'Audit' },
  { value: 'other', labelFr: 'Autre', labelEn: 'Other' },
];

export const DEPARTMENTS: Department[] = [
  // ===== STRATÉGIQUE (8) =====
  { code: 'DIRECTION', labelFr: 'Direction Générale', labelEn: 'Executive Management', category: 'strategique' },
  { code: 'COMITE', labelFr: 'Comité de Direction', labelEn: 'Executive Committee', category: 'strategique' },
  { code: 'DIRECTION_AQ', labelFr: 'Direction AQ', labelEn: 'Quality Direction', category: 'strategique', parentCode: 'DIRECTION' },
  { code: 'DRH', labelFr: 'Direction des Ressources Humaines', labelEn: 'HR Direction', category: 'strategique' },
  { code: 'DRH_AQ', labelFr: 'DRH Assurance Qualité', labelEn: 'HR Quality Assurance', category: 'strategique', parentCode: 'DRH' },
  { code: 'DRH_DIRECTION', labelFr: 'DRH Direction', labelEn: 'HR Executive', category: 'strategique', parentCode: 'DRH' },
  { code: 'DRH_TECHNIQUE', labelFr: 'DRH Technique', labelEn: 'HR Technical', category: 'strategique', parentCode: 'DRH' },
  { code: 'DRH_LABO_QC', labelFr: 'DRH Laboratoire QC', labelEn: 'HR QC Lab', category: 'strategique', parentCode: 'DRH' },
  { code: 'JURIDIQUE', labelFr: 'Juridique', labelEn: 'Legal', category: 'strategique' },

  // ===== QUALITY (13) =====
  { code: 'AQ', labelFr: 'Assurance Qualité', labelEn: 'Quality Assurance', category: 'quality' },
  { code: 'AQ_DIRECTION', labelFr: 'AQ Direction', labelEn: 'QA Direction', category: 'quality', parentCode: 'AQ' },
  { code: 'AQ_REGLEMENTAIRE', labelFr: 'AQ Réglementaire', labelEn: 'QA Regulatory', category: 'quality', parentCode: 'AQ' },
  { code: 'AQ_ARCHIVES', labelFr: 'AQ Archives', labelEn: 'QA Archives', category: 'quality', parentCode: 'AQ' },
  { code: 'AQ_TECHNIQUE', labelFr: 'AQ Technique', labelEn: 'QA Technical', category: 'quality', parentCode: 'AQ' },
  { code: 'AQ_LABO', labelFr: 'AQ Laboratoire', labelEn: 'QA Laboratory', category: 'quality', parentCode: 'AQ' },
  { code: 'AQ_PRODUCTION', labelFr: 'AQ Production', labelEn: 'QA Production', category: 'quality', parentCode: 'AQ' },
  { code: 'AQ_COMPTA', labelFr: 'AQ Comptabilité', labelEn: 'QA Accounting', category: 'quality', parentCode: 'AQ' },
  { code: 'QUALITE', labelFr: 'Qualité', labelEn: 'Quality', category: 'quality' },
  { code: 'QUALITE_PROD', labelFr: 'Qualité Production', labelEn: 'Production Quality', category: 'quality' },
  { code: 'QUALITE_FOURN', labelFr: 'Qualité Fournisseurs', labelEn: 'Supplier Quality', category: 'quality' },
  { code: 'AUDIT_INT', labelFr: 'Audit Interne', labelEn: 'Internal Audit', category: 'quality' },
  { code: 'CAPA_MGT', labelFr: 'Gestion CAPA', labelEn: 'CAPA Management', category: 'quality' },

  // ===== REGULATORY (2) =====
  { code: 'AFFAIRES_REG', labelFr: 'Affaires Réglementaires', labelEn: 'Regulatory Affairs', category: 'regulatory' },
  { code: 'AFFAIRES_REG_DIRECTION', labelFr: 'Affaires Réglementaires Direction', labelEn: 'Regulatory Affairs Direction', category: 'regulatory', parentCode: 'AFFAIRES_REG' },

  // ===== AUDIT (2) =====
  { code: 'AUDITEURS', labelFr: 'Auditeurs', labelEn: 'Auditors', category: 'audit' },
  { code: 'AUDITEURS_AQ', labelFr: 'Auditeurs AQ', labelEn: 'QA Auditors', category: 'audit', parentCode: 'AUDITEURS' },

  // ===== QC LAB (9) =====
  { code: 'LABO_PCQ', labelFr: 'Laboratoire PCQ', labelEn: 'QC Lab', category: 'qc_lab' },
  { code: 'LABO_PCQ_RD', labelFr: 'Labo PCQ R&D', labelEn: 'QC Lab R&D', category: 'qc_lab', parentCode: 'LABO_PCQ' },
  { code: 'LABO_PCQ_MAINT', labelFr: 'Labo PCQ Maintenance', labelEn: 'QC Lab Maintenance', category: 'qc_lab', parentCode: 'LABO_PCQ' },
  { code: 'LABO_PCQ_AQ', labelFr: 'Labo PCQ AQ', labelEn: 'QC Lab QA', category: 'qc_lab', parentCode: 'LABO_PCQ' },
  { code: 'LABO_MICRO', labelFr: 'Microbiologie', labelEn: 'Microbiology', category: 'qc_lab' },
  { code: 'LABO_MICRO_HSE', labelFr: 'Labo Micro HSE', labelEn: 'Micro Lab HSE', category: 'qc_lab', parentCode: 'LABO_MICRO' },
  { code: 'LABO_MICRO_RD', labelFr: 'Labo Micro R&D', labelEn: 'Micro Lab R&D', category: 'qc_lab', parentCode: 'LABO_MICRO' },
  { code: 'LABO_STAB', labelFr: 'Stabilité', labelEn: 'Stability', category: 'qc_lab' },
  { code: 'OOS_TEAM', labelFr: 'Équipe OOS', labelEn: 'OOS Team', category: 'qc_lab' },
  { code: 'LABO_CHIM', labelFr: 'Chimie Analytique', labelEn: 'Analytical Chemistry', category: 'qc_lab' },
  { code: 'LABO_BIO', labelFr: 'Biologie', labelEn: 'Biology', category: 'qc_lab' },
  { code: 'LABO_PHYS', labelFr: 'Physique', labelEn: 'Physics Lab', category: 'qc_lab' },
  { code: 'ECHANT', labelFr: 'Échantillonnage', labelEn: 'Sampling', category: 'qc_lab' },

  // ===== PRODUCTION (4) =====
  { code: 'PRODUCTION', labelFr: 'Production', labelEn: 'Production', category: 'production' },
  { code: 'PRODUCTION_AQ', labelFr: 'Production AQ', labelEn: 'Production QA', category: 'production', parentCode: 'PRODUCTION' },
  { code: 'PRODUCTION_QC', labelFr: 'Production QC', labelEn: 'Production QC', category: 'production', parentCode: 'PRODUCTION' },
  { code: 'PRODUCTION_SUPPLY', labelFr: 'Production Supply Chain', labelEn: 'Production Supply', category: 'production', parentCode: 'PRODUCTION' },

  // ===== R&D (5) =====
  { code: 'RD', labelFr: 'Recherche & Développement', labelEn: 'R&D', category: 'rd' },
  { code: 'RD_LABO', labelFr: 'R&D Laboratoire', labelEn: 'R&D Lab', category: 'rd', parentCode: 'RD' },
  { code: 'RD_PRODUCTION', labelFr: 'R&D Production', labelEn: 'R&D Production', category: 'rd', parentCode: 'RD' },
  { code: 'RD_JURIDIQUE', labelFr: 'R&D Juridique', labelEn: 'R&D Legal', category: 'rd', parentCode: 'RD' },
  { code: 'RD_QC', labelFr: 'R&D QC', labelEn: 'R&D QC', category: 'rd', parentCode: 'RD' },
  { code: 'RD_DM', labelFr: 'R&D Dispositifs Médicaux', labelEn: 'Medical Device R&D', category: 'rd' },
  { code: 'RD_PROCESS', labelFr: 'R&D Procédés', labelEn: 'Process R&D', category: 'rd' },
  { code: 'RD_FORMULATION', labelFr: 'Formulation', labelEn: 'Formulation', category: 'rd' },
  { code: 'RD_VALIDATION', labelFr: 'Validation R&D', labelEn: 'R&D Validation', category: 'rd' },

  // ===== UTILITIES (5) =====
  { code: 'UTILITES', labelFr: 'Utilités', labelEn: 'Utilities', category: 'utilities' },
  { code: 'STATION_EAU', labelFr: 'Station de Traitement Eau', labelEn: 'Water Treatment Station', category: 'utilities' },
  { code: 'STATION_EAU_QC', labelFr: 'Station Eau QC', labelEn: 'Water Station QC', category: 'utilities', parentCode: 'STATION_EAU' },
  { code: 'UTILITES_MAINT', labelFr: 'Utilités Maintenance', labelEn: 'Utilities Maintenance', category: 'utilities', parentCode: 'UTILITES' },
  { code: 'UTILITES_HSE', labelFr: 'Utilités HSE', labelEn: 'Utilities HSE', category: 'utilities', parentCode: 'UTILITES' },
  { code: 'UTIL', labelFr: 'Utilités (alias)', labelEn: 'Utilities (alias)', category: 'utilities' },
  { code: 'UTIL_EAU', labelFr: 'Eau Purifiée / PPI', labelEn: 'Purified Water / WFI', category: 'utilities' },
  { code: 'UTIL_AIR', labelFr: 'Air / HVAC', labelEn: 'Air / HVAC', category: 'utilities' },
  { code: 'UTIL_GAZ', labelFr: 'Gaz Techniques', labelEn: 'Technical Gases', category: 'utilities' },
  { code: 'UTIL_VAPEUR', labelFr: 'Vapeur', labelEn: 'Steam', category: 'utilities' },

  // ===== MAINTENANCE (8) =====
  { code: 'MAINTENANCE', labelFr: 'Maintenance', labelEn: 'Maintenance', category: 'maintenance' },
  { code: 'MAINTENANCE_SUPPLY', labelFr: 'Maintenance Supply Chain', labelEn: 'Maintenance Supply', category: 'maintenance', parentCode: 'MAINTENANCE' },
  { code: 'MAINT_ELEC', labelFr: 'Maintenance Électrique', labelEn: 'Electrical Maintenance', category: 'maintenance', parentCode: 'MAINTENANCE' },
  { code: 'MAINT_PLB', labelFr: 'Maintenance Plomberie', labelEn: 'Plumbing Maintenance', category: 'maintenance', parentCode: 'MAINTENANCE' },
  { code: 'MAINT_MEC', labelFr: 'Maintenance Mécanique', labelEn: 'Mechanical Maintenance', category: 'maintenance', parentCode: 'MAINTENANCE' },
  { code: 'MAINT_FRD', labelFr: 'Maintenance Froid', labelEn: 'Refrigeration Maintenance', category: 'maintenance', parentCode: 'MAINTENANCE' },
  { code: 'MAINT_AUTO', labelFr: 'Maintenance Automatisme', labelEn: 'Automation Maintenance', category: 'maintenance', parentCode: 'MAINTENANCE' },
  { code: 'MAINT_STRUCT', labelFr: 'Maintenance Structure', labelEn: 'Structural Maintenance', category: 'maintenance', parentCode: 'MAINTENANCE' },
  { code: 'MAINT_PREV', labelFr: 'Maintenance Préventive', labelEn: 'Preventive Maintenance', category: 'maintenance' },
  { code: 'MAINT_CORR', labelFr: 'Maintenance Corrective', labelEn: 'Corrective Maintenance', category: 'maintenance' },
  { code: 'MAINT_CALIB', labelFr: 'Calibration', labelEn: 'Calibration', category: 'maintenance' },

  // ===== HSE (11) =====
  { code: 'HSE', labelFr: 'HSE', labelEn: 'HSE', category: 'hse' },
  { code: 'HSE_MAINT', labelFr: 'HSE Maintenance', labelEn: 'HSE Maintenance', category: 'hse', parentCode: 'HSE' },
  { code: 'HSE_DIRECTION', labelFr: 'HSE Direction', labelEn: 'HSE Direction', category: 'hse', parentCode: 'HSE' },
  { code: 'HSE_LABO_MICRO', labelFr: 'HSE Labo Micro', labelEn: 'HSE Micro Lab', category: 'hse', parentCode: 'HSE' },
  { code: 'HSE_SUPPLY', labelFr: 'HSE Supply Chain', labelEn: 'HSE Supply Chain', category: 'hse', parentCode: 'HSE' },
  { code: 'HSE_PRODUCTION', labelFr: 'HSE Production', labelEn: 'HSE Production', category: 'hse', parentCode: 'HSE' },
  { code: 'HSE_QC', labelFr: 'HSE QC', labelEn: 'HSE QC', category: 'hse', parentCode: 'HSE' },
  { code: 'HSE_EPI', labelFr: 'HSE EPI', labelEn: 'HSE PPE', category: 'hse', parentCode: 'HSE' },
  { code: 'HSE_DECHETS', labelFr: 'HSE Déchets', labelEn: 'HSE Waste', category: 'hse', parentCode: 'HSE' },
  { code: 'HSE_INCENDIE', labelFr: 'HSE Incendie', labelEn: 'HSE Fire Safety', category: 'hse', parentCode: 'HSE' },
  { code: 'HSE_ENVIRONNEMENT', labelFr: 'Environnement', labelEn: 'Environment', category: 'hse' },
  { code: 'HSE_HYGIENE', labelFr: 'Hygiène', labelEn: 'Hygiene', category: 'hse' },
  { code: 'HSE_SECURITE', labelFr: 'Sécurité', labelEn: 'Safety', category: 'hse' },

  // ===== SUPPLY CHAIN (10) =====
  { code: 'SUPPLY_CHAIN', labelFr: 'Supply Chain', labelEn: 'Supply Chain', category: 'supply_chain' },
  { code: 'SC_RECEPTION', labelFr: 'SC Réception', labelEn: 'SC Receiving', category: 'supply_chain', parentCode: 'SUPPLY_CHAIN' },
  { code: 'SC_ENTREPOT', labelFr: 'SC Entrepôt', labelEn: 'SC Warehouse', category: 'supply_chain', parentCode: 'SUPPLY_CHAIN' },
  { code: 'SC_EXPEDITION', labelFr: 'SC Expédition', labelEn: 'SC Shipping', category: 'supply_chain', parentCode: 'SUPPLY_CHAIN' },
  { code: 'SC_QC', labelFr: 'SC QC', labelEn: 'SC QC', category: 'supply_chain', parentCode: 'SUPPLY_CHAIN' },
  { code: 'SC_DIRECTION', labelFr: 'SC Direction', labelEn: 'SC Direction', category: 'supply_chain', parentCode: 'SUPPLY_CHAIN' },
  { code: 'SC_AQ', labelFr: 'SC Assurance Qualité', labelEn: 'SC Quality Assurance', category: 'supply_chain', parentCode: 'SUPPLY_CHAIN' },
  { code: 'SC_MAINT', labelFr: 'SC Maintenance', labelEn: 'SC Maintenance', category: 'supply_chain', parentCode: 'SUPPLY_CHAIN' },
  { code: 'SC_HSE', labelFr: 'SC HSE', labelEn: 'SC HSE', category: 'supply_chain', parentCode: 'SUPPLY_CHAIN' },
  { code: 'SC_COMPTA', labelFr: 'SC Comptabilité', labelEn: 'SC Accounting', category: 'supply_chain', parentCode: 'SUPPLY_CHAIN' },
  { code: 'ACHATS', labelFr: 'Achats', labelEn: 'Procurement', category: 'supply_chain' },
  { code: 'RECEPTION', labelFr: 'Réception', labelEn: 'Goods Receiving', category: 'supply_chain' },
  { code: 'STOCKAGE', labelFr: 'Stockage', labelEn: 'Warehousing', category: 'supply_chain' },
  { code: 'EXPEDITION', labelFr: 'Expédition', labelEn: 'Shipping', category: 'supply_chain' },
  { code: 'LOGISTIQUE', labelFr: 'Logistique', labelEn: 'Logistics', category: 'supply_chain' },

  // ===== COMMERCIAL (3) =====
  { code: 'COMMERCIAL', labelFr: 'Commercial', labelEn: 'Commercial', category: 'commercial' },
  { code: 'COMMERCIAL_AQ', labelFr: 'Commercial AQ', labelEn: 'Commercial QA', category: 'commercial', parentCode: 'COMMERCIAL' },
  { code: 'COMMERCIAL_SUPPLY', labelFr: 'Commercial Supply', labelEn: 'Commercial Supply', category: 'commercial', parentCode: 'COMMERCIAL' },
  { code: 'VENTES', labelFr: 'Ventes', labelEn: 'Sales', category: 'commercial' },
  { code: 'MARKETING', labelFr: 'Marketing', labelEn: 'Marketing', category: 'commercial' },
  { code: 'SAV', labelFr: 'Service Après-Vente', labelEn: 'After-Sales Service', category: 'commercial' },
  { code: 'RECLAMATIONS', labelFr: 'Réclamations Client', labelEn: 'Customer Complaints', category: 'commercial' },

  // ===== FINANCE (5) =====
  { code: 'FINANCE', labelFr: 'Finance', labelEn: 'Finance', category: 'finance' },
  { code: 'COMPTA', labelFr: 'Comptabilité', labelEn: 'Accounting', category: 'finance' },
  { code: 'COMPTA_DIRECTION', labelFr: 'Comptabilité Direction', labelEn: 'Accounting Direction', category: 'finance', parentCode: 'COMPTA' },
  { code: 'COMPTA_SC', labelFr: 'Comptabilité Supply Chain', labelEn: 'Accounting SC', category: 'finance', parentCode: 'COMPTA' },
  { code: 'FINANCE_AQ', labelFr: 'Finance AQ', labelEn: 'Finance QA', category: 'finance', parentCode: 'FINANCE' },
  { code: 'CONTROLE_GESTION', labelFr: 'Contrôle de Gestion', labelEn: 'Management Accounting', category: 'finance' },

  // ===== IT (2) =====
  { code: 'INFORMATIQUE', labelFr: 'Informatique', labelEn: 'IT', category: 'it' },
  { code: 'IT_AQ', labelFr: 'IT Assurance Qualité', labelEn: 'IT Quality Assurance', category: 'it', parentCode: 'INFORMATIQUE' },
  { code: 'IT', labelFr: 'IT (alias)', labelEn: 'IT (alias)', category: 'it' },
  { code: 'IT_INFRA', labelFr: 'Infrastructure IT', labelEn: 'IT Infrastructure', category: 'it' },
  { code: 'IT_APPS', labelFr: 'Applications', labelEn: 'Applications', category: 'it' },
  { code: 'IT_SECURITE', labelFr: 'Sécurité IT', labelEn: 'IT Security', category: 'it' },
  { code: 'IT_VALIDATION', labelFr: 'Validation Informatique', labelEn: 'Computer System Validation', category: 'it' },

  // ===== TRANSVERSAL (3) =====
  { code: 'TOUS_DEPARTEMENTS', labelFr: 'Tous Départements', labelEn: 'All Departments', category: 'transversal' },
  { code: 'DIRECTION_SUPPLY_AQ', labelFr: 'Direction Supply AQ', labelEn: 'Direction Supply QA', category: 'transversal' },
  { code: 'METRO', labelFr: 'Métrologie', labelEn: 'Metrology', category: 'transversal' },
  { code: 'DOC', labelFr: 'Gestion Documentaire', labelEn: 'Document Control', category: 'transversal' },
  { code: 'FORMATION', labelFr: 'Formation', labelEn: 'Training', category: 'transversal' },
  { code: 'AMELIO', labelFr: 'Amélioration Continue', labelEn: 'Continuous Improvement', category: 'transversal' },
  { code: 'PROD_CONDITIONNEMENT', labelFr: 'Conditionnement', labelEn: 'Packaging', category: 'transversal' },
  { code: 'PROD_FABRICATION', labelFr: 'Fabrication', labelEn: 'Manufacturing', category: 'transversal' },
  { code: 'PROD_STERILISATION', labelFr: 'Stérilisation', labelEn: 'Sterilization', category: 'transversal' },
  { code: 'PROD_ASSEMBLAGE', labelFr: 'Assemblage', labelEn: 'Assembly', category: 'transversal' },
  { code: 'PROD_PREPARATION', labelFr: 'Préparation', labelEn: 'Preparation', category: 'transversal' },
  { code: 'ENTREE_PRODUCTION', labelFr: 'Magasin Production', labelEn: 'Production Storage', category: 'transversal' },
  { code: 'CC_EQUIPEMENT', labelFr: 'CC Équipement', labelEn: 'CC Equipment', category: 'transversal' },
  { code: 'CC_METHODE', labelFr: 'CC Méthode', labelEn: 'CC Method', category: 'transversal' },
  { code: 'CC_REGLEMENTAIRE', labelFr: 'CC Réglementaire', labelEn: 'CC Regulatory', category: 'transversal' },
  { code: 'CC_DOCUMENTATION', labelFr: 'CC Documentation', labelEn: 'CC Documentation', category: 'transversal' },
  { code: 'DL_DIRECTION', labelFr: 'DL Direction', labelEn: 'Batch Record Direction', category: 'transversal' },
  { code: 'DL_QA', labelFr: 'DL QA', labelEn: 'Batch Record QA', category: 'transversal' },

  // ===== OTHER =====
  { code: 'RH', labelFr: 'Ressources Humaines', labelEn: 'Human Resources', category: 'other' },
  { code: 'COMMUNICATION', labelFr: 'Communication', labelEn: 'Communication', category: 'other' },
  { code: 'AUTRE', labelFr: 'Autre', labelEn: 'Other', category: 'other' },
];

export function getDepartmentByCode(code: string): Department | undefined {
  return DEPARTMENTS.find(d => d.code === code);
}

export function getDepartmentsByCategory(category: DepartmentCategory): Department[] {
  return DEPARTMENTS.filter(d => d.category === category);
}
