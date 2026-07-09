// Compliance checklists — ISO 13485:2016, ICH Q10, IVDR EU 2017/746
// Replicated from smq-iso-13485-pro

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
// ICH Q10 Checklist — 13 clauses
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
    { id: 'ichq10-3.3', clause: '3.3', title: 'Change Management', category: 'improvement', description: 'Système de gestion du changement', evidenceFields: ['capas'], calculator: (d) => { const p = pct(d.capaWithRootCause, d.totalCapa); return { percent: p, status: statusFromPct(p), evidence: [`${d.capaWithRootCause}/${d.totalCapa} CAPAs documentées`] }; } },
    { id: 'ichq10-3.4', clause: '3.4', title: 'Management Review', category: 'management', description: 'Revue de direction du PQS', evidenceFields: ['audits'], calculator: (d) => { const p = pct(d.completedAuditCount, d.totalAuditCount); return { percent: p, status: statusFromPct(p), evidence: [`${d.completedAuditCount}/${d.totalAuditCount} audits`] }; } },
    { id: 'ichq10-4.1', clause: '4.1', title: 'Training & Personnel', category: 'resources', description: 'Formation et qualification du personnel', evidenceFields: ['training'], calculator: (d) => { const p = pct(d.completedTraining, d.totalTraining); return { percent: p, status: statusFromPct(p), evidence: [`${d.completedTraining}/${d.totalTraining} formations`] }; } },
    { id: 'ichq10-4.2', clause: '4.2', title: 'Documentation', category: 'quality_system', description: 'Documentation du PQS, manuel qualité', evidenceFields: ['documents'], calculator: (d) => { const p = pct(d.approvedDocCount, d.totalDocCount); return { percent: p, status: statusFromPct(p), evidence: [`${d.approvedDocCount}/${d.totalDocCount} documents`] }; } },
    { id: 'ichq10-5', clause: '5', title: 'Manufacturing Operations', category: 'realization', description: 'Opérations de fabrication, contrôle en cours', evidenceFields: ['batches'], calculator: (d) => { const p = pct(d.releasedBatch, d.totalBatch); return { percent: p, status: statusFromPct(p), evidence: [`${d.releasedBatch}/${d.totalBatch} lots libérés`] }; } },
    { id: 'ichq10-6', clause: '6', title: 'Laboratory Controls', category: 'measurement', description: 'Contrôles laboratoires, OOS/OOT', evidenceFields: ['ncrs'], calculator: (d) => { const p = pct(d.closedNcr, d.totalNcr); return { percent: p, status: statusFromPct(p), evidence: [`${d.closedNcr}/${d.totalNcr} NCR clos`] }; } },
    { id: 'ichq10-7', clause: '7', title: 'Continuous Improvement', category: 'improvement', description: 'Amélioration continue du PQS', evidenceFields: ['capas'], calculator: (d) => { const p = pct(d.closedCapa, d.totalCapa); return { percent: p, status: statusFromPct(p), evidence: [`${d.closedCapa}/${d.totalCapa} CAPAs clos`] }; } },
  ],
};

// ============================================================================
// IVDR EU 2017/746 Checklist — 12 clauses
// ============================================================================
export const IVDR_CHECKLIST: Checklist = {
  id: 'ivdr',
  name: 'IVDR EU 2017/746 Compliance Checklist',
  standard: 'IVDR EU 2017/746',
  industries: ['ivd'],
  clauses: [
    { id: 'ivdr-4', clause: '4', title: 'Exigences Générales S&D', category: 'quality_system', description: 'Exigences de sécurité et de performance pour les DV', evidenceFields: ['documents'], calculator: (d) => { const p = pct(d.approvedDocCount, d.totalDocCount); return { percent: p, status: statusFromPct(p), evidence: [`${d.approvedDocCount}/${d.totalDocCount} documents`] }; } },
    { id: 'ivdr-5', clause: '5', title: 'Instructions & Informations', category: 'quality_system', description: 'Instructions d\'utilisation, étiquetage', evidenceFields: ['documents'], calculator: (d) => { const p = pct(d.approvedDocCount, d.totalDocCount); return { percent: p, status: statusFromPct(p), evidence: [`${d.approvedDocCount}/${d.totalDocCount} documents`] }; } },
    { id: 'ivdr-6', clause: '6', title: 'Traceability (UDI)', category: 'realization', description: 'Identification unique des dispositifs (UDI)', evidenceFields: ['batches'], calculator: (d) => { const p = pct(d.batchWithProductCode, d.totalBatch); return { percent: p, status: statusFromPct(p), evidence: [`${d.batchWithProductCode}/${d.totalBatch} lots tracés`] }; } },
    { id: 'ivdr-8', clause: '8', title: 'Obligations Fabricants', category: 'management', description: 'Responsabilités fabricant, SMQ', evidenceFields: ['documents'], calculator: (d) => { const p = pct(d.approvedDocCount, d.totalDocCount); return { percent: p, status: statusFromPct(p), evidence: [`${d.approvedDocCount}/${d.totalDocCount} documents`] }; } },
    { id: 'ivdr-10', clause: '10', title: 'Documentation Technique', category: 'quality_system', description: 'Documentation technique requise', evidenceFields: ['documents'], calculator: (d) => { const p = pct(d.approvedDocCount, d.totalDocCount); return { percent: p, status: statusFromPct(p), evidence: [`${d.approvedDocCount}/${d.totalDocCount} documents`] }; } },
    { id: 'ivdr-11', clause: '11', title: 'Responsable Conformité Réglementaire', category: 'management', description: 'Personne responsable de la conformité réglementaire', evidenceFields: ['training'], calculator: (d) => { const p = pct(d.completedTraining, d.totalTraining); return { percent: p, status: statusFromPct(p), evidence: [`${d.completedTraining}/${d.totalTraining} formations`] }; } },
    { id: 'ivdr-12', clause: '12', title: 'Évaluation Performance', category: 'realization', description: 'Évaluation des performances analytiques et cliniques', evidenceFields: ['documents'], calculator: (d) => { const p = pct(d.validationDocCount, d.totalDocCount); return { percent: p, status: statusFromPct(p), evidence: [`${d.validationDocCount}/${d.totalDocCount} docs validation`] }; } },
    { id: 'ivdr-13', clause: '13', title: 'PRCG', category: 'measurement', description: 'Plan de revue de conformité globale (PRCG)', evidenceFields: ['audits'], calculator: (d) => { const p = pct(d.completedAuditCount, d.totalAuditCount); return { percent: p, status: statusFromPct(p), evidence: [`${d.completedAuditCount}/${d.totalAuditCount} audits`] }; } },
    { id: 'ivdr-14', clause: '14', title: 'Système Notification Incidents', category: 'measurement', description: 'Vigilance et notification d\'incidents graves', evidenceFields: ['ncrs'], calculator: (d) => { const p = pct(d.closedNcr, d.totalNcr); return { percent: p, status: statusFromPct(p), evidence: [`${d.closedNcr}/${d.totalNcr} NCR clos`] }; } },
    { id: 'ivdr-15', clause: '15', title: 'Mesures Correctives', category: 'improvement', description: 'Mesures correctives de sécurité (FSCA)', evidenceFields: ['capas'], calculator: (d) => { const p = pct(d.closedCapa, d.totalCapa); return { percent: p, status: statusFromPct(p), evidence: [`${d.closedCapa}/${d.totalCapa} CAPAs clos`] }; } },
    { id: 'ivdr-16', clause: '16', title: 'Demandes Conformité', category: 'regulatory' as any, description: 'Procédures d\'évaluation de conformité', evidenceFields: ['documents'], calculator: (d) => { const p = pct(d.approvedDocCount, d.totalDocCount); return { percent: p, status: statusFromPct(p), evidence: [`${d.approvedDocCount}/${d.totalDocCount} documents`] }; } },
    { id: 'ivdr-17', clause: '17', title: 'Marquage CE', category: 'quality_system', description: 'Marquage CE et déclaration de conformité', evidenceFields: ['documents'], calculator: (d) => { const p = pct(d.approvedDocCount, d.totalDocCount); return { percent: p, status: statusFromPct(p), evidence: [`${d.approvedDocCount}/${d.totalDocCount} documents`] }; } },
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

  return {
    approvedDocCount: docs.filter((d: any) => d.status === 'Approved' || d.status === 'Effective').length,
    totalDocCount: docs.length,
    inReviewDocCount: docs.filter((d: any) => d.status === 'Under Review').length,
    recordDocCount: docs.filter((d: any) => ['ENREGISTREMENT', 'REGISTRE', 'Form'].includes(d.docType)).length,
    validationDocCount: docs.filter((d: any) => d.validationPhase === 'IQ' || d.validationPhase === 'OQ' || d.validationPhase === 'PQ' || d.validationPhase === 'Full').length,
    completedAuditCount: audits.filter((a: any) => a.status === 'Completed').length,
    totalAuditCount: audits.length,
    completedTraining: training.filter((t: any) => t.status === 'Completed').length,
    totalTraining: training.length,
    openRisk: risks.filter((r: any) => r.status === 'Open').length,
    totalRisk: risks.length,
    releasedBatch: batches.filter((b: any) => b.status === 'Released').length,
    totalBatch: batches.length,
    batchWithProductCode: batches.filter((b: any) => b.productCode).length,
    closedNcr: ncrs.filter((n: any) => n.status === 'Closed').length,
    totalNcr: ncrs.length,
    closedCapa: capas.filter((c: any) => c.status === 'Closed').length,
    totalCapa: capas.length,
    capaWithRootCause: capas.filter((c: any) => c.rootCauseAnalysis || c.rootCauseCategory).length,
    customRecordTypeCounts: input.customInstances?.length || 0,
  };
}
