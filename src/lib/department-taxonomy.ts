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
  // Strategique
  { code: 'DIRECTION', labelFr: 'Direction Générale', labelEn: 'Executive Management', category: 'strategique' },
  { code: 'COMITE', labelFr: 'Comité de Direction', labelEn: 'Executive Committee', category: 'strategique' },
  // Transversal
  { code: 'AQ', labelFr: 'Assurance Qualité', labelEn: 'Quality Assurance', category: 'transversal' },
  { code: 'METRO', labelFr: 'Métrologie', labelEn: 'Metrology', category: 'transversal' },
  { code: 'DOC', labelFr: 'Gestion Documentaire', labelEn: 'Document Control', category: 'transversal' },
  { code: 'FORMATION', labelFr: 'Formation', labelEn: 'Training', category: 'transversal' },
  { code: 'AMELIO', labelFr: 'Amélioration Continue', labelEn: 'Continuous Improvement', category: 'transversal' },
  // QC Lab
  { code: 'LABO_PCQ', labelFr: 'Laboratoire PCQ', labelEn: 'QC Lab', category: 'qc_lab' },
  { code: 'LABO_MICRO', labelFr: 'Microbiologie', labelEn: 'Microbiology', category: 'qc_lab' },
  { code: 'LABO_CHIM', labelFr: 'Chimie Analytique', labelEn: 'Analytical Chemistry', category: 'qc_lab' },
  { code: 'LABO_BIO', labelFr: 'Biologie', labelEn: 'Biology', category: 'qc_lab' },
  { code: 'LABO_PHYS', labelFr: 'Physique', labelEn: 'Physics Lab', category: 'qc_lab' },
  { code: 'ECHANT', labelFr: 'Échantillonnage', labelEn: 'Sampling', category: 'qc_lab' },
  // Production
  { code: 'PROD', labelFr: 'Production', labelEn: 'Production', category: 'production' },
  { code: 'PROD_CONDITIONNEMENT', labelFr: 'Conditionnement', labelEn: 'Packaging', category: 'production' },
  { code: 'PROD_FABRICATION', labelFr: 'Fabrication', labelEn: 'Manufacturing', category: 'production' },
  { code: 'PROD_STERILISATION', labelFr: 'Stérilisation', labelEn: 'Sterilization', category: 'production' },
  { code: 'PROD_ASSEMBLAGE', labelFr: 'Assemblage', labelEn: 'Assembly', category: 'production' },
  { code: 'PROD_PREPARATION', labelFr: 'Préparation', labelEn: 'Preparation', category: 'production' },
  { code: 'ENTREE_PRODUCTION', labelFr: 'Magasin Production', labelEn: 'Production Storage', category: 'production' },
  // R&D
  { code: 'RD', labelFr: 'Recherche & Développement', labelEn: 'R&D', category: 'rd' },
  { code: 'RD_DM', labelFr: 'R&D Dispositifs Médicaux', labelEn: 'Medical Device R&D', category: 'rd' },
  { code: 'RD_PROCESS', labelFr: 'R&D Procédés', labelEn: 'Process R&D', category: 'rd' },
  { code: 'RD_FORMULATION', labelFr: 'Formulation', labelEn: 'Formulation', category: 'rd' },
  { code: 'RD_VALIDATION', labelFr: 'Validation R&D', labelEn: 'R&D Validation', category: 'rd' },
  // Utilities
  { code: 'UTIL', labelFr: 'Utilités', labelEn: 'Utilities', category: 'utilities' },
  { code: 'UTIL_EAU', labelFr: 'Eau Purifiée / PPI', labelEn: 'Purified Water / WFI', category: 'utilities' },
  { code: 'UTIL_AIR', labelFr: 'Air / HVAC', labelEn: 'Air / HVAC', category: 'utilities' },
  { code: 'UTIL_GAZ', labelFr: 'Gaz Techniques', labelEn: 'Technical Gases', category: 'utilities' },
  { code: 'UTIL_VAPEUR', labelFr: 'Vapeur', labelEn: 'Steam', category: 'utilities' },
  // Maintenance
  { code: 'MAINT', labelFr: 'Maintenance', labelEn: 'Maintenance', category: 'maintenance' },
  { code: 'MAINT_PREV', labelFr: 'Maintenance Préventive', labelEn: 'Preventive Maintenance', category: 'maintenance' },
  { code: 'MAINT_CORR', labelFr: 'Maintenance Corrective', labelEn: 'Corrective Maintenance', category: 'maintenance' },
  { code: 'MAINT_CALIB', labelFr: 'Calibration', labelEn: 'Calibration', category: 'maintenance' },
  // HSE
  { code: 'HSE', labelFr: 'HSE', labelEn: 'HSE', category: 'hse' },
  { code: 'HSE_SECURITE', labelFr: 'Sécurité', labelEn: 'Safety', category: 'hse' },
  { code: 'HSE_ENVIRONNEMENT', labelFr: 'Environnement', labelEn: 'Environment', category: 'hse' },
  { code: 'HSE_HYGIENE', labelFr: 'Hygiène', labelEn: 'Hygiene', category: 'hse' },
  // Supply Chain
  { code: 'SUPPLY_CHAIN', labelFr: 'Supply Chain', labelEn: 'Supply Chain', category: 'supply_chain' },
  { code: 'ACHATS', labelFr: 'Achats', labelEn: 'Procurement', category: 'supply_chain' },
  { code: 'RECEPTION', labelFr: 'Réception', labelEn: 'Goods Receiving', category: 'supply_chain' },
  { code: 'STOCKAGE', labelFr: 'Stockage', labelEn: 'Warehousing', category: 'supply_chain' },
  { code: 'EXPEDITION', labelFr: 'Expédition', labelEn: 'Shipping', category: 'supply_chain' },
  { code: 'LOGISTIQUE', labelFr: 'Logistique', labelEn: 'Logistics', category: 'supply_chain' },
  // Commercial
  { code: 'COMMERCIAL', labelFr: 'Commercial', labelEn: 'Commercial', category: 'commercial' },
  { code: 'VENTES', labelFr: 'Ventes', labelEn: 'Sales', category: 'commercial' },
  { code: 'MARKETING', labelFr: 'Marketing', labelEn: 'Marketing', category: 'commercial' },
  { code: 'SAV', labelFr: 'Service Après-Vente', labelEn: 'After-Sales Service', category: 'commercial' },
  { code: 'RECLAMATIONS', labelFr: 'Réclamations Client', labelEn: 'Customer Complaints', category: 'commercial' },
  // Finance
  { code: 'FINANCE', labelFr: 'Finance', labelEn: 'Finance', category: 'finance' },
  { code: 'COMPTA', labelFr: 'Comptabilité', labelEn: 'Accounting', category: 'finance' },
  { code: 'CONTROLE_GESTION', labelFr: 'Contrôle de Gestion', labelEn: 'Management Accounting', category: 'finance' },
  // IT
  { code: 'IT', labelFr: 'Informatique', labelEn: 'IT', category: 'it' },
  { code: 'IT_INFRA', labelFr: 'Infrastructure IT', labelEn: 'IT Infrastructure', category: 'it' },
  { code: 'IT_APPS', labelFr: 'Applications', labelEn: 'Applications', category: 'it' },
  { code: 'IT_SECURITE', labelFr: 'Sécurité IT', labelEn: 'IT Security', category: 'it' },
  { code: 'IT_VALIDATION', labelFr: 'Validation Informatique', labelEn: 'Computer System Validation', category: 'it' },
  // Quality
  { code: 'QUALITE', labelFr: 'Qualité', labelEn: 'Quality', category: 'quality' },
  { code: 'QUALITE_PROD', labelFr: 'Qualité Production', labelEn: 'Production Quality', category: 'quality' },
  { code: 'QUALITE_FOURN', labelFr: 'Qualité Fournisseurs', labelEn: 'Supplier Quality', category: 'quality' },
  { code: 'AUDIT_INT', labelFr: 'Audit Interne', labelEn: 'Internal Audit', category: 'quality' },
  { code: 'CAPA_MGT', labelFr: 'Gestion CAPA', labelEn: 'CAPA Management', category: 'quality' },
  // Regulatory
  { code: 'REG', labelFr: 'Affaires Réglementaires', labelEn: 'Regulatory Affairs', category: 'regulatory' },
  { code: 'REG_ENREGISTREMENT', labelFr: 'Enregistrement Produits', labelEn: 'Product Registration', category: 'regulatory' },
  { code: 'REG_VIGILANCE', labelFr: 'Matériovigilance', labelEn: 'Post-Market Surveillance', category: 'regulatory' },
  { code: 'REG_CE', labelFr: 'Marquage CE', labelEn: 'CE Marking', category: 'regulatory' },
  { code: 'REG_FDA', labelFr: 'Affaires FDA', labelEn: 'FDA Affairs', category: 'regulatory' },
  // Audit
  { code: 'AUDIT', labelFr: 'Audit', labelEn: 'Audit', category: 'audit' },
  // Other
  { code: 'RH', labelFr: 'Ressources Humaines', labelEn: 'Human Resources', category: 'other' },
  { code: 'JURIDIQUE', labelFr: 'Juridique', labelEn: 'Legal', category: 'other' },
  { code: 'COMMUNICATION', labelFr: 'Communication', labelEn: 'Communication', category: 'other' },
  { code: 'AUTRE', labelFr: 'Autre', labelEn: 'Other', category: 'other' },
];

export function getDepartmentByCode(code: string): Department | undefined {
  return DEPARTMENTS.find(d => d.code === code);
}

export function getDepartmentsByCategory(category: DepartmentCategory): Department[] {
  return DEPARTMENTS.filter(d => d.category === category);
}
