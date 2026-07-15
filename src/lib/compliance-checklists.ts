// Compliance checklists — ISO 13485:2016, ICH Q10, IVDR EU 2017/746
// Replicated from smq-iso-13485-pro — Updated with correct IVDR articles & missing ICH Q10 clauses

export type ClauseCategory = 'quality_system' | 'management' | 'resources' | 'realization' | 'measurement' | 'improvement';
export type ClauseStatus = 'compliant' | 'partially' | 'non_compliant' | 'not_assessed';

export interface ComplianceClause {
  id: string;
  clause: string;
  title: string;
  category: ClauseCategory;
  description: string;
  evidenceFields: string[];
  calculator: (data: ComplianceData) => { percent: number; status: ClauseStatus; evidence: string[] };
}

export interface ComplianceData {
  approvedDocCount: number;
  totalDocCount: number;
  inReviewDocCount: number;
  recordDocCount: number;
  validationDocCount: number;
  completedAuditCount: number;
  totalAuditCount: number;
  completedTraining: number;
  totalTraining: number;
  openRisk: number;
  totalRisk: number;
  releasedBatch: number;
  totalBatch: number;
  batchWithProductCode: number;
  closedNcr: number;
  totalNcr: number;
  closedCapa: number;
  totalCapa: number;
  capaWithRootCause: number;
  qualifiedSupplierCount: number;
  totalSupplierCount: number;
  customRecordTypeCounts: number;
}

export interface Checklist {
  id: 'iso13485' | 'ichq10' | 'ivdr';
  name: string;
  standard: string;
  industries: string[];
  clauses: ComplianceClause[];
}

export function statusFromPct(p: number): ClauseStatus {
  if (p >= 80) return 'compliant';
  if (p >= 50) return 'partially';
  if (p > 0) return 'non_compliant';
  return 'not_assessed';
}

function pct(num: number, den: number): number {
  if (den === 0) return 100;
  return Math.round((num / den) * 100);
}

// ============================================================================
// ISO 13485:2016 Checklist — 15 clauses
// ============================================================================
export const ISO_13485_CHECKLIST: Checklist = {
  id: 'iso13485',
  name: 'ISO 13485:2016 Compliance Checklist',
  standard: 'ISO 13485:2016',
  industries: ['medical_device', 'combination_product'],
  clauses: [
    { id: 'iso-4.1', clause: '4.1', title: 'Exigences Générales', category: 'quality_system', description: 'Mise en place et maintien d\'un SMQ, identification des processus nécessaires', evidenceFields: ['documents', 'processes'], calculator: (d) => { const p = pct(d.approvedDocCount, d.totalDocCount); return { percent: p, status: statusFromPct(p), evidence: [`${d.approvedDocCount}/${d.totalDocCount} documents approuvés`] }; } },
    { id: 'iso-4.2', clause: '4.2', title: 'Exigences Documentaires', category: 'quality_system', description: 'Manuel qualité, procédures documentées, enregistrements qualité', evidenceFields: ['documents'], calculator: (d) => { const p = pct(d.approvedDocCount, d.totalDocCount); return { percent: p, status: statusFromPct(p), evidence: [`${d.approvedDocCount}/${d.totalDocCount} documents approuvés`] }; } },
    { id: 'iso-4.2.3', clause: '4.2.3', title: 'Contrôle des Documents', category: 'quality_system', description: 'Approbation, révision, distribution et modification des documents', evidenceFields: ['documents'], calculator: (d) => { const p = pct(d.approvedDocCount + d.inReviewDocCount, d.totalDocCount); return { percent: p, status: statusFromPct(p), evidence: [`${d.approvedDocCount + d.inReviewDocCount}/${d.totalDocCount} documents en révision ou approuvés`] }; } },
    { id: 'iso-4.2.4', clause: '4.2.4', title: 'Contrôle des Enregistrements', category: 'quality_system', description: 'Identification, stockage, protection, récupération, rétention et disposition', evidenceFields: ['documents'], calculator: (d) => { const p = pct(d.recordDocCount, d.totalDocCount); return { percent: p, status: statusFromPct(p), evidence: [`${d.recordDocCount}/${d.totalDocCount} enregistrements`] }; } },
    { id: 'iso-5', clause: '5', title: 'Responsabilité de la Direction', category: 'management', description: 'Engagement, focus client, politique qualité, planification, revue de direction', evidenceFields: ['audits'], calculator: (d) => { const p = pct(d.completedAuditCount, d.totalAuditCount); return { percent: p, status: statusFromPct(p), evidence: [`${d.completedAuditCount}/${d.totalAuditCount} audits terminés`] }; } },
    { id: 'iso-5.6', clause: '5.6', title: 'Revue de Direction', category: 'management', description: 'Entrées, sorties et documentation de la revue de direction', evidenceFields: ['audits'], calculator: (d) => { const p = pct(d.completedAuditCount, d.totalAuditCount); return { percent: p, status: statusFromPct(p), evidence: [`${d.completedAuditCount}/${d.totalAuditCount} audits terminés`] }; } },
    { id: 'iso-6', clause: '6', title: 'Management des Ressources', category: 'resources', description: 'Mise à disposition des ressources, ressources humaines, infrastructures', evidenceFields: ['training'], calculator: (d) => { const p = pct(d.completedTraining, d.totalTraining); return { percent: p, status: statusFromPct(p), evidence: [`${d.completedTraining}/${d.totalTraining} formations terminées`] }; } },
    { id: 'iso-7.1', clause: '7.1', title: 'Planification de la Réalisation du Produit', category: 'realization', description: 'Planification des processus de réalisation, gestion des risques', evidenceFields: ['risks'], calculator: (d) => { const p = pct(d.totalRisk - d.openRisk, d.totalRisk); return { percent: p, status: statusFromPct(p), evidence: [`${d.totalRisk - d.openRisk}/${d.totalRisk} risques clos ou mitigés`] }; } },
    { id: 'iso-7.5', clause: '7.5', title: 'Production et Prestations de Service', category: 'realization', description: 'Contrôle de la production, identification et traçabilité, propriété client', evidenceFields: ['batches'], calculator: (d) => { const p = pct(d.releasedBatch, d.totalBatch); return { percent: p, status: statusFromPct(p), evidence: [`${d.releasedBatch}/${d.totalBatch} lots libérés`] }; } },
    { id: 'iso-7.5.6', clause: '7.5.6', title: 'Validation des Processus', category: 'realization', description: 'Validation des processus de production pour lesquels les résultats ne peuvent pas être vérifiés', evidenceFields: ['documents'], calculator: (d) => { const p = pct(d.validationDocCount, d.totalDocCount); return { percent: p, status: statusFromPct(p), evidence: [`${d.validationDocCount}/${d.totalDocCount} documents de validation`] }; } },
    { id: 'iso-7.5.9', clause: '7.5.9', title: 'Traçabilité', category: 'realization', description: 'Traçabilité du dispositif médical, enregistrement de l\'historique du lot', evidenceFields: ['batches'], calculator: (d) => { const p = pct(d.batchWithProductCode, d.totalBatch); return { percent: p, status: statusFromPct(p), evidence: [`${d.batchWithProductCode}/${d.totalBatch} lots avec code produit`] }; } },
    { id: 'iso-8.2', clause: '8.2', title: 'Surveillance et Mesure', category: 'measurement', description: 'Retours d\'information, audit interne, surveillance et mesure des processus', evidenceFields: ['audits'], calculator: (d) => { const p = pct(d.completedAuditCount, d.totalAuditCount); return { percent: p, status: statusFromPct(p), evidence: [`${d.completedAuditCount}/${d.totalAuditCount} audits terminés`] }; } },
    { id: 'iso-8.3', clause: '8.3', title: 'Produit Non Conforme', category: 'measurement', description: 'Identification, documentation, isolation et disposition des produits non conformes', evidenceFields: ['ncrs'], calculator: (d) => { const p = pct(d.closedNcr, d.totalNcr); return { percent: p, status: statusFromPct(p), evidence: [`${d.closedNcr}/${d.totalNcr} NCR clôturées`] }; } },
    { id: 'iso-8.4', clause: '8.4', title: 'Analyse des Données', category: 'improvement', description: 'Analyse des données pour évaluer la conformité du SMQ', evidenceFields: ['capas'], calculator: (d) => { const p = pct(d.capaWithRootCause, d.totalCapa); return { percent: p, status: statusFromPct(p), evidence: [`${d.capaWithRootCause}/${d.totalCapa} CAPAs avec cause racine identifiée`] }; } },
    { id: 'iso-8.5', clause: '8.5', title: 'Amélioration', category: 'improvement', description: 'Actions correctives et préventives, amélioration continue', evidenceFields: ['capas'], calculator: (d) => { const p = pct(d.closedCapa, d.totalCapa); return { percent: p, status: statusFromPct(p), evidence: [`${d.closedCapa}/${d.totalCapa} CAPAs clôturées`] }; } },
  ],
};

// ============================================================================
// ICH Q10 Checklist — 15 clauses (added 3.2.1 Root Cause + 5.1 Supplier Qualification)
// ============================================================================
export const ICH_Q10_CHECKLIST: Checklist = {
  id: 'ichq10',
  name: 'ICH Q10 Pharmaceutical Quality System Checklist',
  standard: 'ICH Q10',
  industries: ['pharmaceutical', 'biotech'],
  clauses: [
    { id: 'ichq10-1', clause: '1', title: 'Pharmaceutical Quality System', category: 'quality_system', description: 'Objectifs du PQS, cadre et applicabilité', evidenceFields: ['documents'], calculator: (d) => { const p = pct(d.approvedDocCount, d.totalDocCount); return { percent: p, status: statusFromPct(p), evidence: [`${d.approvedDocCount}/${d.totalDocCount} documents approuvés`] }; } },
    { id: 'ichq10-2.1', clause: '2.1', title: 'Leadership', category: 'management', description: 'Engagement de la direction, qualité comme responsabilité partagée', evidenceFields: ['audits'], calculator: (d) => { const p = pct(d.completedAuditCount, d.totalAuditCount); return { percent: p, status: statusFromPct(p), evidence: [`${d.completedAuditCount}/${d.totalAuditCount} audits`] }; } },
    { id: 'ichq10-2.2', clause: '2.2', title: 'Quality Culture', category: 'management', description: 'Culture qualité, transparence, communication', evidenceFields: ['audits'], calculator: (d) => { const p = pct(d.completedAuditCount, d.totalAuditCount); return { percent: p, status: statusFromPct(p), evidence: [`${d.completedAuditCount}/${d.totalAuditCount} audits`] }; } },
    { id: 'ichq10-2.3', clause: '2.3', title: 'Quality Risk Management', category: 'management', description: 'Intégration de l\'ICH Q9 dans le PQS', evidenceFields: ['risks'], calculator: (d) => { const p = pct(d.totalRisk - d.openRisk, d.totalRisk); return { percent: p, status: statusFromPct(p), evidence: [`${d.totalRisk - d.openRisk}/${d.totalRisk} risques traités`] }; } },
    { id: 'ichq10-3.1', clause: '3.1', title: 'Process Performance & Product Quality Monitoring', category: 'measurement', description: 'Surveillance des indicateurs critiques', evidenceFields: ['ncrs'], calculator: (d) => { const p = pct(d.closedNcr, d.totalNcr); return { percent: p, status: statusFromPct(p), evidence: [`${d.closedNcr}/${d.totalNcr} NCR clos`] }; } },
    { id: 'ichq10-3.2', clause: '3.2', title: 'CAPA System', category: 'improvement', description: 'Système d\'actions correctives et préventives', evidenceFields: ['capas'], calculator: (d) => { const p = pct(d.closedCapa, d.totalCapa); return { percent: p, status: statusFromPct(p), evidence: [`${d.closedCapa}/${d.totalCapa} CAPAs clos`] }; } },
    { id: 'ichq10-3.2.1', clause: '3.2.1', title: 'Root Cause Investigation', category: 'improvement', description: 'Investigation systématique de la cause racine pour chaque CAPA (ICH Q10 §3.2.1)', evidenceFields: ['capas'], calculator: (d) => { const p = pct(d.capaWithRootCause, d.totalCapa); return { percent: p, status: statusFromPct(p), evidence: [`${d.capaWithRootCause}/${d.totalCapa} CAPAs avec cause racine documentée`] }; } },
    { id: 'ichq10-3.3', clause: '3.3', title: 'Change Management', category: 'improvement', description: 'Système de gestion du changement', evidenceFields: ['capas'], calculator: (d) => { const p = pct(d.capaWithRootCause, d.totalCapa); return { percent: p, status: statusFromPct(p), evidence: [`${d.capaWithRootCause}/${d.totalCapa} CAPAs documentées`] }; } },
    { id: 'ichq10-3.4', clause: '3.4', title: 'Management Review', category: 'management', description: 'Revue de direction du PQS', evidenceFields: ['audits'], calculator: (d) => { const p = pct(d.completedAuditCount, d.totalAuditCount); return { percent: p, status: statusFromPct(p), evidence: [`${d.completedAuditCount}/${d.totalAuditCount} audits`] }; } },
    { id: 'ichq10-4.1', clause: '4.1', title: 'Training & Personnel', category: 'resources', description: 'Formation et qualification du personnel', evidenceFields: ['training'], calculator: (d) => { const p = pct(d.completedTraining, d.totalTraining); return { percent: p, status: statusFromPct(p), evidence: [`${d.completedTraining}/${d.totalTraining} formations`] }; } },
    { id: 'ichq10-4.2', clause: '4.2', title: 'Documentation', category: 'quality_system', description: 'Documentation du PQS, manuel qualité', evidenceFields: ['documents'], calculator: (d) => { const p = pct(d.approvedDocCount, d.totalDocCount); return { percent: p, status: statusFromPct(p), evidence: [`${d.approvedDocCount}/${d.totalDocCount} documents`] }; } },
    { id: 'ichq10-5', clause: '5', title: 'Manufacturing Operations', category: 'realization', description: 'Opérations de fabrication, contrôle en cours', evidenceFields: ['batches'], calculator: (d) => { const p = pct(d.releasedBatch, d.totalBatch); return { percent: p, status: statusFromPct(p), evidence: [`${d.releasedBatch}/${d.totalBatch} lots libérés`] }; } },
    { id: 'ichq10-5.1', clause: '5.1', title: 'Supplier Qualification', category: 'realization', description: 'Qualification et évaluation des fournisseurs, audit qualité fournisseur (ICH Q10 §5.1)', evidenceFields: ['suppliers'], calculator: (d) => { const p = pct(d.qualifiedSupplierCount, d.totalSupplierCount); return { percent: p, status: statusFromPct(p), evidence: [`${d.qualifiedSupplierCount}/${d.totalSupplierCount} fournisseurs qualifiés`] }; } },
    { id: 'ichq10-6', clause: '6', title: 'Laboratory Controls', category: 'measurement', description: 'Contrôles laboratoires, OOS/OOT', evidenceFields: ['ncrs'], calculator: (d) => { const p = pct(d.closedNcr, d.totalNcr); return { percent: p, status: statusFromPct(p), evidence: [`${d.closedNcr}/${d.totalNcr} NCR clos`] }; } },
    { id: 'ichq10-7', clause: '7', title: 'Continuous Improvement', category: 'improvement', description: 'Amélioration continue du PQS', evidenceFields: ['capas'], calculator: (d) => { const p = pct(d.closedCapa, d.totalCapa); return { percent: p, status: statusFromPct(p), evidence: [`${d.closedCapa}/${d.totalCapa} CAPAs clos`] }; } },
  ],
};

// ============================================================================
// IVDR EU 2017/746 Checklist — 12 articles (correct article numbering)
// Articles: 4, 8, 10, 10(4), 10(9), 12, 13, 15, 16, 56, 83, 87
// ============================================================================
export const IVDR_CHECKLIST: Checklist = {
  id: 'ivdr',
  name: 'IVDR EU 2017/746 Compliance Checklist',
  standard: 'IVDR EU 2017/746',
  industries: ['ivd'],
  clauses: [
    { id: 'ivdr-art4', clause: 'Art. 4', title: 'Exigences Générales de Sécurité et Performance', category: 'quality_system', description: 'Art. 4 — Exigences de sécurité et de performance pour les dispositifs médicaux de diagnostic in vitro', evidenceFields: ['documents'], calculator: (d) => { const p = pct(d.approvedDocCount, d.totalDocCount); return { percent: p, status: statusFromPct(p), evidence: [`${d.approvedDocCount}/${d.totalDocCount} documents approuvés`] }; } },
    { id: 'ivdr-art8', clause: 'Art. 8', title: 'Obligations des Fabricants', category: 'management', description: 'Art. 8 — Responsabilités générales du fabricant, système de management de la qualité', evidenceFields: ['documents'], calculator: (d) => { const p = pct(d.approvedDocCount, d.totalDocCount); return { percent: p, status: statusFromPct(p), evidence: [`${d.approvedDocCount}/${d.totalDocCount} documents`] }; } },
    { id: 'ivdr-art10', clause: 'Art. 10', title: 'Documentation Technique', category: 'quality_system', description: 'Art. 10 — Contenu de la documentation technique, IFU, preuve de conformité', evidenceFields: ['documents'], calculator: (d) => { const p = pct(d.approvedDocCount, d.totalDocCount); return { percent: p, status: statusFromPct(p), evidence: [`${d.approvedDocCount}/${d.totalDocCount} documents`] }; } },
    { id: 'ivdr-art10-4', clause: 'Art. 10(4)', title: 'Preuves de Conformité', category: 'quality_system', description: 'Art. 10(4) — Preuves de conformité aux exigences de sécurité et de performance', evidenceFields: ['documents'], calculator: (d) => { const p = pct(d.validationDocCount, d.totalDocCount); return { percent: p, status: statusFromPct(p), evidence: [`${d.validationDocCount}/${d.totalDocCount} documents de validation/performance`] }; } },
    { id: 'ivdr-art10-9', clause: 'Art. 10(9)', title: 'Identification Unique des Dispositifs (UDI)', category: 'realization', description: 'Art. 10(9) — Système UDI, affectation UDI-DI, base de données EUDAMED', evidenceFields: ['batches'], calculator: (d) => { const p = pct(d.batchWithProductCode, d.totalBatch); return { percent: p, status: statusFromPct(p), evidence: [`${d.batchWithProductCode}/${d.totalBatch} lots avec code produit (UDI)`] }; } },
    { id: 'ivdr-art12', clause: 'Art. 12', title: 'Évaluation des Performances Analytiques et Cliniques', category: 'realization', description: 'Art. 12 — Plan d\'évaluation des performances, études de performance analytique et clinique', evidenceFields: ['documents'], calculator: (d) => { const p = pct(d.validationDocCount, d.totalDocCount); return { percent: p, status: statusFromPct(p), evidence: [`${d.validationDocCount}/${d.totalDocCount} documents d\'évaluation de performance`] }; } },
    { id: 'ivdr-art13', clause: 'Art. 13', title: 'Plan de Revue Post-Commercialisation (PRCG)', category: 'measurement', description: 'Art. 13 — Plan de revue de conformité globale, collecte de données de performance', evidenceFields: ['audits'], calculator: (d) => { const p = pct(d.completedAuditCount, d.totalAuditCount); return { percent: p, status: statusFromPct(p), evidence: [`${d.completedAuditCount}/${d.totalAuditCount} audits de revue`] }; } },
    { id: 'ivdr-art15', clause: 'Art. 15', title: 'Vigilance et Signalement des Incidents', category: 'measurement', description: 'Art. 15 — Obligations de signalement, rapport de tendances, registre des incidents', evidenceFields: ['ncrs'], calculator: (d) => { const p = pct(d.closedNcr, d.totalNcr); return { percent: p, status: statusFromPct(p), evidence: [`${d.closedNcr}/${d.totalNcr} incidents clôturés`] }; } },
    { id: 'ivdr-art16', clause: 'Art. 16', title: 'Actions Correctives de Sécurité (FSCA)', category: 'improvement', description: 'Art. 16 — Mesures correctives de sécurité, notifications aux autorités et utilisateurs', evidenceFields: ['capas'], calculator: (d) => { const p = pct(d.closedCapa, d.totalCapa); return { percent: p, status: statusFromPct(p), evidence: [`${d.closedCapa}/${d.totalCapa} actions correctives closes`] }; } },
    { id: 'ivdr-art56', clause: 'Art. 56', title: 'Organismes Notifiés — Désignation', category: 'management', description: 'Art. 56 — Désignation, surveillance et évaluation des organismes notifiés', evidenceFields: ['audits'], calculator: (d) => { const p = pct(d.completedAuditCount, d.totalAuditCount); return { percent: p, status: statusFromPct(p), evidence: [`${d.completedAuditCount}/${d.totalAuditCount} audits réalisés`] }; } },
    { id: 'ivdr-art83', clause: 'Art. 83', title: 'Exigences Relatives aux Essais Cliniques', category: 'realization', description: 'Art. 83 — Investigations cliniques, autorisation, rapport de sécurité, droits des sujets', evidenceFields: ['documents', 'risks'], calculator: (d) => { const p = pct(d.totalRisk - d.openRisk, d.totalRisk); return { percent: p, status: statusFromPct(p), evidence: [`${d.totalRisk - d.openRisk}/${d.totalRisk} risques de l\'essai gérés`] }; } },
    { id: 'ivdr-art87', clause: 'Art. 87', title: 'Dispositions Transitoires', category: 'management', description: 'Art. 87 — Délais de transition, certificats délivrés conformément à la directive IVDD 98/79/CE', evidenceFields: ['documents'], calculator: (d) => { const p = pct(d.approvedDocCount, d.totalDocCount); return { percent: p, status: statusFromPct(p), evidence: [`${d.approvedDocCount}/${d.totalDocCount} documents conformes`] }; } },
  ],
};

export const CHECKLISTS: Checklist[] = [ISO_13485_CHECKLIST, ICH_Q10_CHECKLIST, IVDR_CHECKLIST];

export function getChecklistById(id: string): Checklist | undefined {
  return CHECKLISTS.find(c => c.id === id);
}

export function getChecklistForIndustry(industry: string): Checklist {
  const mapping: Record<string, string> = {
    medical_device: 'iso13485', pharmaceutical: 'ichq10', biotech: 'ichq10',
    ivd: 'ivdr', combination_product: 'iso13485',
  };
  return getChecklistById(mapping[industry] || 'iso13485')!;
}

export function buildComplianceData(input: {
  documents?: any[]; capas?: any[]; ncrs?: any[]; audits?: any[];
  training?: any[]; risks?: any[]; batchRecords?: any[]; suppliers?: any[];
  changeControls?: any[]; deviations?: any[]; customInstances?: any[];
}): ComplianceData {
  const docs = input.documents || [];
  const capas = input.capas || [];
  const ncrs = input.ncrs || [];
  const audits = input.audits || [];
  const training = input.training || [];
  const risks = input.risks || [];
  const batches = input.batchRecords || [];
  const suppliers = input.suppliers || [];

  return {
    approvedDocCount: docs.filter((d: any) => d.status === 'Approved' || d.status === 'Effective').length,
    totalDocCount: docs.length,
    inReviewDocCount: docs.filter((d: any) => d.status === 'Under Review').length,
    recordDocCount: docs.filter((d: any) => ['ENREGISTREMENT', 'REGISTRE', 'Form'].includes(d.doc_type || d.docType)).length,
    validationDocCount: docs.filter((d: any) => d.validation_phase || d.validationPhase || d.doc_type === 'MASTER_BATCH').length,
    completedAuditCount: audits.filter((a: any) => a.status === 'Completed').length,
    totalAuditCount: audits.length,
    completedTraining: training.filter((t: any) => t.status === 'Completed').length,
    totalTraining: training.length,
    openRisk: risks.filter((r: any) => r.status === 'Open').length,
    totalRisk: risks.length,
    releasedBatch: batches.filter((b: any) => b.status === 'Released').length,
    totalBatch: batches.length,
    batchWithProductCode: batches.filter((b: any) => b.product_code || b.productCode).length,
    closedNcr: ncrs.filter((n: any) => n.status === 'Closed').length,
    totalNcr: ncrs.length,
    closedCapa: capas.filter((c: any) => c.status === 'Closed').length,
    totalCapa: capas.length,
    capaWithRootCause: capas.filter((c: any) => c.root_cause_category || c.rootCauseCategory || c.root_cause_analysis || c.rootCauseAnalysis).length,
    qualifiedSupplierCount: suppliers.filter((s: any) => s.status === 'Qualified').length,
    totalSupplierCount: suppliers.length,
    customRecordTypeCounts: input.customInstances?.length || 0,
  };
}