// Seed script — populates SQLite DB with demo organization + users + records
import { db } from '../src/lib/db'
import { hashPassword } from '../src/lib/auth-server'
import { INDUSTRY_CONFIG, STANDARDS_BY_INDUSTRY, type IndustryType } from '../src/types/qms'

async function main() {
  console.log('🌱 Starting seed...')

  // 1. Create organization
  const orgId = 'org_demo_001'
  const existingOrg = await db.organization.findUnique({ where: { id: orgId } }).catch(() => null)
  if (existingOrg) {
    console.log('⚠️  Demo org already exists. Delete db/custom.db and re-run to re-seed.')
    process.exit(0)
  }

  const settings = {
    setup_completed: true,
    industry_type: 'medical_device' as IndustryType,
    applicable_standards: STANDARDS_BY_INDUSTRY.medical_device,
    active_modules: [...INDUSTRY_CONFIG.medical_device.recommendedModules, 'oos_oot', 'deviations'],
    company_name: 'MediQuality Devices SARL',
    country: 'France', city: 'Lyon', org_size: '50-200',
    notifications: { capa_overdue: true, ncr_overdue: true, document_expiry: true, training_overdue: true, audit_due: true },
  }

  const org = await db.organization.create({
    data: { id: orgId, name: 'MediQuality Devices SARL', slug: 'mediquality-devices', settings: JSON.stringify(settings) },
  })
  console.log(`✓ Organization: ${org.name}`)

  // 2. Create users
  const pwd = await hashPassword('admin123')
  const users = [
    { id: 'u_admin', email: 'admin@mediquality.fr', fullName: 'Sophie Martin', role: 'admin' as const, department: 'DIRECTION', jobTitle: 'Directrice Générale' },
    { id: 'u_qm', email: 'quality@mediquality.fr', fullName: 'Pierre Dubois', role: 'quality_manager' as const, department: 'AQ', jobTitle: 'Responsable Qualité' },
    { id: 'u_dc', email: 'doc@mediquality.fr', fullName: 'Marie Leroy', role: 'document_controller' as const, department: 'DOC', jobTitle: 'Gestionnaire Documentaire' },
    { id: 'u_aud', email: 'auditor@mediquality.fr', fullName: 'Jean Bernard', role: 'auditor' as const, department: 'AUDIT_INT', jobTitle: 'Auditeur Interne' },
    { id: 'u_op', email: 'operator@mediquality.fr', fullName: 'Lucas Petit', role: 'operator' as const, department: 'PROD', jobTitle: 'Opérateur Production' },
  ]
  for (const u of users) {
    await db.profile.create({ data: { ...u, passwordHash: pwd, organizationId: orgId, active: true } })
    await db.organizationMember.create({ data: { organizationId: orgId, profileId: u.id, role: u.role === 'admin' ? 'owner' : 'member', status: 'active' } })
  }
  console.log(`✓ ${users.length} users created`)

  // 3. Seed system record types
  await seedSystemRecordTypes(orgId, 'u_admin')
  console.log(`✓ 10 system record types`)

  // 4. Seed documents
  const docs = [
    { documentNumber: 'MQ-001', title: 'Manuel Qualité', docType: 'MANUEL', status: 'Approved', version: '3.1', classification: 'Internal', code: 'MQ-001', isoClause: '4.2.1', documentLevel: 1, departmentCode: 'AQ', owner: 'Pierre Dubois', summary: 'Manuel Qualité ISO 13485:2016', effectiveDate: new Date('2024-01-20'), nextReview: new Date('2026-01-20'), isPrerequisite: true, retentionPeriod: '10 ans', reviewCycleMonths: 24, authorId: 'u_qm', approverId: 'u_admin' },
    { documentNumber: 'PR-4.2.4', title: 'Procédure de Contrôle des Enregistrements', docType: 'PROCEDURE', status: 'Approved', version: '2.0', classification: 'Internal', code: 'PR-4.2.4', isoClause: '4.2.4', documentLevel: 2, departmentCode: 'DOC', owner: 'Marie Leroy', summary: 'Maîtrise des enregistrements qualité', effectiveDate: new Date('2024-03-01'), nextReview: new Date('2026-03-01'), retentionPeriod: '5 ans', reviewCycleMonths: 24, authorId: 'u_dc', approverId: 'u_qm' },
    { documentNumber: 'PR-8.5.2', title: 'Procédure CAPA', docType: 'PROCEDURE', status: 'Approved', version: '1.5', classification: 'Internal', code: 'PR-8.5.2', isoClause: '8.5.2', documentLevel: 2, departmentCode: 'AQ', owner: 'Pierre Dubois', summary: 'Actions correctives et préventives', effectiveDate: new Date('2024-04-15'), nextReview: new Date('2026-04-15'), retentionPeriod: '5 ans', reviewCycleMonths: 24, authorId: 'u_qm', approverId: 'u_admin' },
    { documentNumber: 'PR-8.2.4', title: "Procédure d'Audit Interne", docType: 'PROCEDURE', status: 'Approved', version: '1.2', classification: 'Internal', code: 'PR-8.2.4', isoClause: '8.2.4', documentLevel: 2, departmentCode: 'AUDIT_INT', owner: 'Pierre Dubois', summary: 'Planification et réalisation des audits internes', effectiveDate: new Date('2024-02-01'), nextReview: new Date('2026-02-01'), retentionPeriod: '5 ans', reviewCycleMonths: 24, authorId: 'u_aud', approverId: 'u_qm' },
    { documentNumber: 'PR-7.1', title: 'Procédure de Gestion des Risques', docType: 'PROCEDURE', status: 'Approved', version: '1.5', classification: 'Internal', code: 'PR-7.1', isoClause: '7.1', documentLevel: 2, departmentCode: 'AQ', owner: 'Pierre Dubois', summary: 'Gestion des risques selon ISO 14971', effectiveDate: new Date('2024-04-15'), nextReview: new Date('2026-04-15'), retentionPeriod: '5 ans', reviewCycleMonths: 24, authorId: 'u_qm', approverId: 'u_admin' },
    { documentNumber: 'WI-PROD-001', title: 'Instruction de Contrôle Final', docType: 'INSTRUCTION', status: 'Approved', version: '4.0', classification: 'Internal', code: 'WI-PROD-001', isoClause: '7.5.1', documentLevel: 4, departmentCode: 'PROD', owner: 'Lucas Petit', summary: 'Contrôle final du produit DM-100', effectiveDate: new Date('2024-05-10'), nextReview: new Date('2025-11-10'), retentionPeriod: '3 ans', reviewCycleMonths: 18, authorId: 'u_op', approverId: 'u_qm' },
    { documentNumber: 'FORM-NC-001', title: 'Formulaire de Non-Conformité', docType: 'FORMULAIRE', status: 'Approved', version: '1.0', classification: 'Internal', code: 'FORM-NC-001', isoClause: '8.3', documentLevel: 4, departmentCode: 'AQ', owner: 'Pierre Dubois', summary: 'Enregistrement des non-conformités', effectiveDate: new Date('2024-01-15'), nextReview: new Date('2026-01-15'), retentionPeriod: '5 ans', reviewCycleMonths: 24, authorId: 'u_qm', approverId: 'u_admin' },
    { documentNumber: 'POL-001', title: 'Politique Qualité', docType: 'POLITIQUE', status: 'Approved', version: '2.0', classification: 'Internal', code: 'POL-001', isoClause: '5.3', documentLevel: 1, departmentCode: 'DIRECTION', owner: 'Sophie Martin', summary: "Politique qualité de l'entreprise", effectiveDate: new Date('2024-01-05'), nextReview: new Date('2026-01-05'), retentionPeriod: '10 ans', reviewCycleMonths: 24, authorId: 'u_admin', approverId: 'u_admin' },
    { documentNumber: 'DL-001', title: 'Dossier Maître de Lot - DM-100', docType: 'MASTER_BATCH', status: 'Approved', version: '2.0', classification: 'Internal', code: 'DL-001', isoClause: '7.5.1', documentLevel: 2, departmentCode: 'PROD', owner: 'Lucas Petit', summary: 'Dossier maître pour la fabrication du DM-100', effectiveDate: new Date('2024-06-01'), nextReview: new Date('2026-06-01'), isTemplate: true, retentionPeriod: '15 ans', reviewCycleMonths: 36, authorId: 'u_op', approverId: 'u_qm' },
  ]
  for (const d of docs) {
    await db.document.create({ data: { ...d, organizationId: orgId, createdById: d.authorId } as any })
  }
  console.log(`✓ ${docs.length} documents`)

  // 5. Seed CAPAs
  const capa1 = await db.cAPA.create({ data: {
    capaNumber: 'CAPA-2024-001', title: 'Correctif étiquetage lot 2024-045', capaType: 'Corrective', priority: 'High', status: 'Closed',
    source: 'Non-Conformance', description: 'Ré-étiquetage et quarantaine du lot',
    problemStatement: '50 unités avec date de péremption incorrecte',
    rootCauseAnalysis: "Formation insuffisante sur le nouveau système d'étiquetage",
    rootCauseCategory: 'Man', fiveWhysJson: JSON.stringify(['Opérateur non formé', 'Pas de procédure de formation documentée', 'Récente mise en place du nouvel équipement']),
    correctiveAction: 'Ré-étiquetage complet du lot + formation renforcée opérateurs',
    effectivenessVerificationMethod: 'Audit de poste sur 3 mois',
    effectivenessCriteria: '0 NC étiquetage sur 3 mois',
    effectivenessResult: 'Effective',
    dueDate: new Date('2024-04-15'), closedDate: new Date('2024-04-10'),
    ownerId: 'u_qm', assignedToId: 'u_qm', organizationId: orgId, createdById: 'u_qm', createdDate: new Date('2024-03-15'),
  } as any })
  const capa2 = await db.cAPA.create({ data: {
    capaNumber: 'CAPA-2024-002', title: 'Mise à jour procédure contrôle réception', capaType: 'Corrective', priority: 'Medium', status: 'Implementation',
    source: 'Process Monitoring', description: 'Révision de la procédure pour inclure contrôle dimensionnel',
    problemStatement: 'Contrôle dimensionnel non réalisé sur lot matière première',
    rootCauseAnalysis: 'Procédure de réception incomplète',
    rootCauseCategory: 'Method', fiveWhysJson: JSON.stringify(['Procédure ne mentionne pas le contrôle', 'Révision oubliée lors du dernier changement fournisseur']),
    correctiveAction: 'Révision PR-7.4.1 + formation équipe réception',
    effectivenessVerificationMethod: 'Vérification mensuelle des fiches de réception',
    effectivenessCriteria: '100% des fiches avec contrôle dimensionnel',
    effectivenessResult: 'Pending Review',
    dueDate: new Date('2024-09-30'),
    ownerId: 'u_dc', assignedToId: 'u_dc', organizationId: orgId, createdById: 'u_qm', createdDate: new Date('2024-08-12'),
  } as any })
  const capa3 = await db.cAPA.create({ data: {
    capaNumber: 'CAPA-2024-003', title: 'Prévention défauts emballage', capaType: 'Preventive', priority: 'Medium', status: 'Investigation',
    source: 'Process Monitoring', description: 'Renforcement du contrôle emballage en fin de ligne',
    problemStatement: '3 réclamations client sur emballage endommagé en 6 mois',
    rootCauseAnalysis: 'Pas de contrôle systématique post-conditionnement',
    rootCauseCategory: 'Method',
    correctiveAction: 'Installation caméra de contrôle + procédure WI-PACK-002',
    dueDate: new Date('2024-11-30'),
    ownerId: 'u_qm', organizationId: orgId, createdById: 'u_qm', createdDate: new Date('2024-09-25'),
  } as any })
  console.log(`✓ 3 CAPAs`)

  // 6. Seed NCRs
  const ncr1 = await db.nonConformance.create({ data: {
    ncrNumber: 'NCR-2024-001', title: 'Étiquetage non conforme lot 2024-045', ncrType: 'Product', status: 'Closed', severity: 'Major',
    source: 'Audit interne', description: 'Date de péremption incorrecte sur 50 unités',
    lotNumber: '2024-045', quantityAffected: '50', disposition: 'Rework',
    linkedCapaId: capa1.id, affectedProduct: 'DM-100', containmentActions: 'Quarantaine immédiate du lot',
    impactAssessment: 'Impact qualité mineur - produit toujours conforme mais étiquetage erroné',
    dueDate: new Date('2024-04-01'), closedSignedAt: new Date('2024-04-30'),
    ownerId: 'u_qm', organizationId: orgId, createdDate: new Date('2024-03-15'),
  } as any })
  const ncr2 = await db.nonConformance.create({ data: {
    ncrNumber: 'NCR-2024-002', title: 'Écart procédure de contrôle réception', ncrType: 'Process', status: 'Pending Disposition', severity: 'Minor',
    source: 'Processus', description: 'Contrôle dimensionnel non réalisé sur lot matière première PAL-2024-08',
    lotNumber: 'PAL-2024-08', quantityAffected: '1 palette', disposition: 'Use As Is',
    linkedCapaId: capa2.id, affectedProduct: 'Matière première POLY-001',
    dueDate: new Date('2024-09-15'),
    ownerId: 'u_op', organizationId: orgId, createdDate: new Date('2024-08-12'),
  } as any })
  const ncr3 = await db.nonConformance.create({ data: {
    ncrNumber: 'NCR-2024-003', title: "Réclamation client - défaut d'emballage", ncrType: 'Product', status: 'Under Investigation', severity: 'Major',
    source: 'Customer Complaint', description: '3 réclamations client sur emballage endommagé en 6 mois',
    lotNumber: '2024-031, 2024-038, 2024-042', quantityAffected: '5 unités', disposition: 'Pending',
    linkedCapaId: capa3.id, affectedProduct: 'DM-100',
    dueDate: new Date('2024-10-30'),
    ownerId: 'u_qm', organizationId: orgId, createdDate: new Date('2024-09-25'),
  } as any })
  console.log(`✓ 3 NCRs`)

  // 7. Seed deviations
  await db.deviation.create({ data: {
    devNumber: 'DEV-2024-001', title: 'Déviation température salle de conditionnement', deviationType: 'Unplanned', status: 'Pending QA Review', severity: 'Major',
    category: 'Environment', description: 'Température dépassée de 2°C pendant 30 minutes',
    deviationDetails: 'Salle 3 - température 24°C au lieu de 22°C ±2',
    justification: 'Maintenance HVAC en cours', riskAssessment: 'Faible - produit non sensible',
    correctiveAction: 'Vérification HVAC', preventiveAction: 'Calendrier de maintenance révisé',
    sopReference: 'PR-HVAC-001', expectedResult: '22°C ±2', actualResult: '24°C pendant 30min',
    productStage: 'In-Process', quarantine: false,
    lotNumber: '2024-050', productCode: 'DM-100', quantityAffected: '500',
    dueDate: new Date('2024-09-20'), detectedDate: new Date('2024-09-15'),
    ownerId: 'u_op', organizationId: orgId,
  } as any })
  console.log(`✓ 1 deviation`)

  // 8. Seed change controls
  await db.changeControl.create({ data: {
    ccNumber: 'CC-2024-001', title: "Mise à jour procédure d'audit interne", ccType: 'Planned', status: 'In Implementation', priority: 'Medium',
    category: 'Document', description: 'Révision PR-8.2.4 pour intégrer les exigences MDSAP',
    justification: 'Préparation à la certification MDSAP', proposedChange: 'Ajout section MDSAP',
    riskAssessment: 'Faible', impactAnalysis: 'Aucun impact produit',
    affectedAreas: 'Département Qualité', impactOnValidatedSystems: false,
    implementationPlan: 'Révision + formation + déploiement', implementationDate: new Date('2024-10-01'),
    regulatoryTrigger: 'MDSAP',
    dueDate: new Date('2024-10-01'), requestedById: 'u_dc', ownerId: 'u_dc', organizationId: orgId,
  } as any })
  console.log(`✓ 1 change control`)

  // 9. Seed audits
  await db.audit.create({ data: {
    auditNumber: 'AUD-2024-001', title: 'Audit interne QMS 2024 T1', auditType: 'Internal', status: 'Completed',
    auditScope: 'SMQ complet selon ISO 13485', scheduledDate: new Date('2024-03-15'), completedDate: new Date('2024-03-15'),
    leadAuditorId: 'u_aud', auditeesJson: JSON.stringify(['Pierre Dubois', 'Marie Leroy']),
    auditCriteria: 'ISO 13485:2016, FDA 21 CFR 820', complianceRating: 'Compliant with minor gaps',
    findingsJson: JSON.stringify([
      { id: 'f1', description: 'Étiquetage non conforme lot 2024-045', severity: 'Major', referenceClause: '7.5.1', correctiveActionRequired: true, capaId: capa1.id },
      { id: 'f2', description: 'Procédure de réception incomplète', severity: 'Minor', referenceClause: '7.4.1', correctiveActionRequired: true, capaId: capa2.id },
      { id: 'f3', description: 'Absence de revue documentaire pour PR-7.5.1', severity: 'Observation', referenceClause: '4.2.3', correctiveActionRequired: false },
    ]),
    completedSignatureHash: 'AUD-DEMO-HASH', completedSignedAt: new Date('2024-03-15'), completedSignedById: 'u_aud',
    organizationId: orgId,
  } as any })
  await db.audit.create({ data: {
    auditNumber: 'AUD-2024-002', title: 'Audit interne QMS 2024 T3 - Production', auditType: 'Internal', status: 'Planned',
    auditScope: 'Processus production', scheduledDate: new Date('2024-10-20'),
    leadAuditorId: 'u_aud', auditeesJson: JSON.stringify(['Lucas Petit']),
    auditCriteria: 'ISO 13485:2016 §7.5', findingsJson: '[]',
    organizationId: orgId,
  } as any })
  console.log(`✓ 2 audits`)

  // 10. Seed risks
  await db.risk.create({ data: {
    riskNumber: 'RSK-2024-001', title: 'Risque de contamination du produit', category: 'Product', status: 'Mitigated',
    hazardDescription: 'Contamination microbiologique durant la production',
    riskOwner: 'Pierre Dubois', regulatoryReference: 'ISO 14971 §5.4',
    controlType: 'protective_measures', verificationMethod: 'Contrôles microbiologiques hebdomadaires',
    riskAcceptability: 'ALARP', probability: 3, impact: 5, detectability: 2, rpn: 30, riskLevel: 'Medium',
    mitigation: 'Salle blanche ISO 7 + contrôles microbiologiques + double emballage stérile',
    residualRisk: 'Faible', residualProbability: 1, residualImpact: 5, residualDetectability: 2, residualRpn: 10,
    ownerId: 'u_qm', organizationId: orgId,
  } as any })
  await db.risk.create({ data: {
    riskNumber: 'RSK-2024-002', title: "Erreur d'étiquetage", category: 'Process', status: 'Mitigated',
    hazardDescription: 'Erreur sur étiquetage final (lot, date, produit)',
    riskOwner: 'Lucas Petit', regulatoryReference: 'ISO 13485 §7.5.1',
    controlType: 'protective_measures', verificationMethod: 'Double contrôle visuel',
    riskAcceptability: 'ALARP', probability: 2, impact: 4, detectability: 3, rpn: 24, riskLevel: 'Medium',
    mitigation: 'Vérification double contrôle + système caméra',
    residualRisk: 'Très faible', residualProbability: 1, residualImpact: 4, residualDetectability: 2, residualRpn: 8,
    ownerId: 'u_op', organizationId: orgId,
  } as any })
  await db.risk.create({ data: {
    riskNumber: 'RSK-2024-003', title: 'Défaillance logiciel embarqué', category: 'Product', status: 'Open',
    hazardDescription: 'Bug possible dans le logiciel de contrôle du DM-200',
    riskOwner: 'Marie Leroy', regulatoryReference: 'IEC 62304',
    controlType: 'inherent_safe_design', verificationMethod: 'Tests unitaires + validation IEC 62304',
    riskAcceptability: 'ALARP', probability: 2, impact: 5, detectability: 4, rpn: 40, riskLevel: 'Medium',
    mitigation: 'Tests unitaires + validation IEC 62304 en cours',
    ownerId: 'u_dc', organizationId: orgId,
  } as any })
  console.log(`✓ 3 risks`)

  // 11. Seed trainings
  await db.training.create({ data: { title: 'Formation ISO 13485:2016', trainingType: 'Regulatory', status: 'Completed', assignedToId: 'u_op', dueDate: new Date('2024-02-10'), completedDate: new Date('2024-02-10'), description: 'Sensibilisation à la norme ISO 13485', metadataJson: JSON.stringify({ deliveryMethod: 'Classroom', trainer: 'Pierre Dubois', passingScore: 80, category: 'GMP' }), organizationId: orgId } } as any)
  await db.training.create({ data: { title: 'Gestion des risques ISO 14971', trainingType: 'Skill', status: 'Completed', assignedToId: 'u_qm', dueDate: new Date('2024-03-01'), completedDate: new Date('2024-03-01'), description: 'Analyse des risques produits selon ISO 14971', metadataJson: JSON.stringify({ deliveryMethod: 'Online', passingScore: 70, category: 'Quality' }), organizationId: orgId } } as any)
  await db.training.create({ data: { title: 'Audit interne - Techniques et méthodes', trainingType: 'Skill', status: 'Completed', assignedToId: 'u_aud', dueDate: new Date('2024-01-20'), completedDate: new Date('2024-01-20'), description: "Formation aux techniques d'audit interne", metadataJson: JSON.stringify({ deliveryMethod: 'Classroom', passingScore: 75, category: 'Quality' }), organizationId: orgId } } as any)
  await db.training.create({ data: { title: 'Formation IEC 62304 - Logiciels médicaux', trainingType: 'Regulatory', status: 'Planned', assignedToId: 'u_dc', dueDate: new Date('2024-12-15'), description: 'Cycle de vie logiciel médical', metadataJson: JSON.stringify({ deliveryMethod: 'Webinar', category: 'GMP' }), organizationId: orgId } } as any)
  await db.training.create({ data: { title: 'Sécurité au travail - SST 2024', trainingType: 'Skill', status: 'In Progress', assignedToId: 'u_op', dueDate: new Date('2024-09-30'), description: 'Formation SST annuelle', metadataJson: JSON.stringify({ deliveryMethod: 'Blended', category: 'Safety' }), organizationId: orgId } } as any)
  console.log(`✓ 5 trainings`)

  // 12. Seed batch records
  await db.batchRecord.create({ data: {
    lotNumber: 'LOT-2024-045', productName: 'DM-100 - Cathéter', productCode: 'DM-100',
    batchSize: '5000', batchSizeUnit: 'units', masterFormulaId: 'DL-001',
    sopReference: 'WI-PROD-001', manufacturingDate: new Date('2024-09-01'), expiryDate: new Date('2027-09-01'),
    status: 'Released', isLocked: true, qaReleaseDate: new Date('2024-09-10'), qaReleasedById: 'u_qm',
    stepsJson: JSON.stringify([
      { id: 's1', stepOrder: 1, stepName: 'Pesée matière première', expectedValue: '5000g', actualValue: '5000g', status: 'Completed', stepType: 'Weighing', operatorId: 'u_op', performedAt: '2024-09-01T08:00:00Z', signatureHash: 'STEP-HASH-1' },
      { id: 's2', stepOrder: 2, stepName: 'Mélange', expectedValue: '30min à 200rpm', actualValue: '30min à 200rpm', status: 'Completed', stepType: 'Mixing', operatorId: 'u_op', performedAt: '2024-09-01T09:00:00Z', signatureHash: 'STEP-HASH-2' },
      { id: 's3', stepOrder: 3, stepName: 'Contrôle QC', expectedValue: 'Conforme', actualValue: 'Conforme', status: 'Completed', stepType: 'QC Testing', operatorId: 'u_qm', performedAt: '2024-09-02T10:00:00Z', signatureHash: 'STEP-HASH-3' },
    ]),
    rawMaterialsJson: JSON.stringify([
      { material: 'POLY-001', lotNumber: 'PAL-2024-08', supplier: 'Plasticorp SAS', status: 'Verified' },
      { material: 'ADD-002', lotNumber: 'ADD-2024-12', supplier: 'MedPack Solutions', status: 'Verified' },
    ]),
    organizationId: orgId,
  } as any })
  await db.batchRecord.create({ data: {
    lotNumber: 'LOT-2024-050', productName: 'DM-100 - Cathéter', productCode: 'DM-100',
    batchSize: '5000', batchSizeUnit: 'units', masterFormulaId: 'DL-001',
    sopReference: 'WI-PROD-001', manufacturingDate: new Date('2024-09-20'), expiryDate: new Date('2027-09-20'),
    status: 'Pending QA Review', isLocked: false,
    stepsJson: JSON.stringify([
      { id: 's5', stepOrder: 1, stepName: 'Pesée', expectedValue: '5000g', actualValue: '5000g', status: 'Completed', stepType: 'Weighing', operatorId: 'u_op' },
      { id: 's6', stepOrder: 2, stepName: 'Mélange', expectedValue: '30min à 200rpm', actualValue: '32min à 195rpm', status: 'Completed', stepType: 'Mixing', operatorId: 'u_op' },
    ]),
    rawMaterialsJson: JSON.stringify([{ material: 'POLY-001', lotNumber: 'PAL-2024-10', supplier: 'Plasticorp SAS', status: 'Pending' }]),
    organizationId: orgId,
  } as any })
  console.log(`✓ 2 batch records`)

  // 13. Seed suppliers
  await db.supplier.create({ data: {
    supplierCode: 'SUP-001', name: 'Plasticorp SAS', category: 'Raw Material', status: 'Qualified',
    qualificationDate: new Date('2024-01-15'), nextReviewDate: new Date('2026-01-15'),
    certificationsJson: JSON.stringify(['ISO 13485:2016', 'ISO 9001:2015']), performanceScore: 92,
    qualificationMethod: 'On-Site Audit', qualificationDocRef: 'AUD-2024-001',
    website: 'https://plasticorp.fr', primaryContactName: 'Marc Petit', primaryContactEmail: 'contact@plasticorp.fr', primaryContactPhone: '+33 4 78 00 00 00',
    street: '15 rue des Polymères', city: 'Lyon', stateProvince: 'Rhône', postalCode: '69000', country: 'France',
    emergencyContactName: 'Marc Petit', emergencyContactPhone: '+33 6 00 00 00 00',
    notes: 'Fournisseur stratégique certifié ISO 13485', organizationId: orgId,
  } as any })
  await db.supplier.create({ data: {
    supplierCode: 'SUP-002', name: 'MedPack Solutions', category: 'Packaging', status: 'Qualified',
    qualificationDate: new Date('2024-02-01'), nextReviewDate: new Date('2026-02-01'),
    certificationsJson: JSON.stringify(['ISO 13485:2016', 'ISO 11607']), performanceScore: 85,
    qualificationMethod: 'Questionnaire',
    primaryContactName: 'Laura Garcia', primaryContactEmail: 'sales@medpack.com', primaryContactPhone: '+33 1 42 00 00 00',
    city: 'Paris', country: 'France', notes: "Bon fournisseur d'emballages stériles", organizationId: orgId,
  } as any })
  await db.supplier.create({ data: {
    supplierCode: 'SUP-003', name: 'TechComponents Ltd', category: 'Equipment', status: 'Conditional',
    qualificationDate: new Date('2024-05-10'), nextReviewDate: new Date('2024-11-10'),
    certificationsJson: JSON.stringify(['ISO 9001:2015']), performanceScore: 65,
    qualificationMethod: 'Certificate Review',
    primaryContactName: 'John Smith', primaryContactEmail: 'info@techcomponents.com', primaryContactPhone: '+44 20 7000 0000',
    city: 'London', country: 'UK', notes: 'À ré-évaluer suite à retard de livraison', organizationId: orgId,
  } as any })
  console.log(`✓ 3 suppliers`)

  // 14. Seed record links (cross-module interactions)
  await db.recordLink.create({ data: { organizationId: orgId, sourceRecordId: capa1.id, sourceRecordType: 'capa', targetRecordId: ncr1.id, targetRecordType: 'ncr', linkType: 'caused_by', description: 'CAPA causée par cette NCR', createdById: 'u_qm' } })
  await db.recordLink.create({ data: { organizationId: orgId, sourceRecordId: ncr1.id, sourceRecordType: 'ncr', targetRecordId: capa1.id, targetRecordType: 'capa', linkType: 'corrected_by', description: 'NCR corrigée par cette CAPA', createdById: 'u_qm' } })
  await db.recordLink.create({ data: { organizationId: orgId, sourceRecordId: ncr2.id, sourceRecordType: 'ncr', targetRecordId: capa2.id, targetRecordType: 'capa', linkType: 'corrected_by', description: 'NCR corrigée par CAPA', createdById: 'u_qm' } })
  await db.recordLink.create({ data: { organizationId: orgId, sourceRecordId: ncr3.id, sourceRecordType: 'ncr', targetRecordId: capa3.id, targetRecordType: 'capa', linkType: 'corrected_by', description: 'Réclamation traitée par CAPA préventive', createdById: 'u_qm' } })
  await db.recordLink.create({ data: { organizationId: orgId, sourceRecordId: capa3.id, sourceRecordType: 'capa', targetRecordId: capa1.id, targetRecordType: 'capa', linkType: 'derived_from', description: 'CAPA préventive dérivée de la CAPA corrective initiale', createdById: 'u_qm' } })
  console.log(`✓ 5 record links`)

  // 15. Seed form templates + instances
  const capaTemplate = await db.formTemplate.create({ data: {
    title: 'Template CAPA (Standard)', version: '1.0', description: 'Template standard pour les actions correctives et préventives',
    fieldsJson: JSON.stringify([
      { id: 'f1', name: 'problemStatement', label: 'Énoncé du problème', type: 'textarea', required: true },
      { id: 'f2', name: 'rootCause', label: 'Cause racine', type: 'textarea', required: true },
      { id: 'f3', name: 'correctiveAction', label: 'Action corrective', type: 'textarea', required: true },
    ]),
    isActive: true, status: 'Approved', moduleType: 'capa',
    workflowJson: JSON.stringify({ type: 'sequential', approvers: [{ role: 'quality_manager', order: 1 }, { role: 'admin', order: 2 }], eSignatureRequired: true, lockAfterSubmission: true }),
    complianceJson: JSON.stringify({ auditTrailEnabled: true, printFriendlyLayout: true, cfrPart11Compliance: true }),
    signaturesJson: JSON.stringify([{ id: 'sig1', signedById: 'u_qm', signerName: 'Pierre Dubois', signerRole: 'quality_manager', signatureType: 'approval', signatureHash: 'SIG-DEMO-CAPA-TPL', revoked: false, createdAt: new Date().toISOString() }]),
    currentApprovalStep: 2, effectiveDate: new Date(),
    organizationId: orgId, createdById: 'u_qm',
  } as any })
  await db.formInstance.create({ data: {
    templateId: capaTemplate.id, templateVersion: '1.0', referenceNumber: 'CAPA-FORM-001',
    valuesJson: JSON.stringify({ problemStatement: 'Démo : problème identifié', rootCause: 'Démo : cause racine', correctiveAction: 'Démo : action corrective' }),
    status: 'Approved', isLocked: true, submittedById: 'u_qm', submittedAt: new Date(),
    signatureHash: 'SIG-INSTANCE-DEMO',
    signaturesJson: JSON.stringify([{ id: 'sig_i1', signedById: 'u_admin', signerName: 'Sophie Martin', signerRole: 'admin', signatureType: 'approval', signatureHash: 'SIG-INSTANCE-DEMO', revoked: false, createdAt: new Date().toISOString() }]),
    currentApprovalStep: 2,
    approvalHistoryJson: JSON.stringify([
      { step: 1, approverId: 'u_qm', approverName: 'Pierre Dubois', approverRole: 'quality_manager', decision: 'Approved', comment: 'Conforme', signatureHash: 'SIG-STEP1', timestamp: new Date().toISOString() },
      { step: 2, approverId: 'u_admin', approverName: 'Sophie Martin', approverRole: 'admin', decision: 'Approved', comment: 'Approuvé', signatureHash: 'SIG-STEP2', timestamp: new Date().toISOString() },
    ]),
    recordTypeSlug: 'capa', organizationId: orgId, createdById: 'u_qm',
  } as any })
  console.log(`✓ 1 form template + 1 instance`)

  // 16. Seed scheduled reports
  await db.scheduledReport.create({ data: { name: 'Rapport mensuel CAPA', reportType: 'capa_summary', format: 'pdf', frequency: 'monthly', recipientsJson: JSON.stringify(['quality@mediquality.fr', 'admin@mediquality.fr']), filtersJson: '{}', status: 'active', lastRunAt: new Date(Date.now() - 7 * 24 * 3600 * 1000), nextRunAt: new Date(Date.now() + 23 * 24 * 3600 * 1000), lastResult: 'success: 12 enregistrements', organizationId: orgId } } as any)
  await db.scheduledReport.create({ data: { name: 'Revue trimestrielle direction', reportType: 'management_review', format: 'pdf', frequency: 'quarterly', recipientsJson: JSON.stringify(['admin@mediquality.fr']), filtersJson: '{}', status: 'active', nextRunAt: new Date(Date.now() + 45 * 24 * 3600 * 1000), organizationId: orgId } } as any)
  await db.scheduledReport.create({ data: { name: 'Statut formations hebdomadaire', reportType: 'training_status', format: 'csv', frequency: 'weekly', recipientsJson: JSON.stringify(['quality@mediquality.fr']), filtersJson: '{}', status: 'paused', lastRunAt: new Date(Date.now() - 14 * 24 * 3600 * 1000), lastResult: 'success: 5 enregistrements', organizationId: orgId } } as any)
  console.log(`✓ 3 scheduled reports`)

  console.log('\n✅ Seed completed successfully!')
  console.log('\n📋 Demo accounts (password: admin123):')
  console.log('   admin@mediquality.fr (Administrateur)')
  console.log('   quality@mediquality.fr (Responsable Qualité)')
  console.log('   doc@mediquality.fr (Contrôleur Documentaire)')
  console.log('   auditor@mediquality.fr (Auditeur)')
  console.log('   operator@mediquality.fr (Opérateur)')
}

async function seedSystemRecordTypes(orgId: string, profileId: string) {
  const slugs = ['capa', 'ncr', 'deviation', 'change_control', 'audit', 'risk', 'training', 'supplier', 'batch_record', 'oos_oot']
  const names: Record<string, string> = {
    capa: 'CAPA', ncr: 'Non-Conformité', deviation: 'Déviation', change_control: 'Contrôle des Changements',
    audit: 'Audit', risk: 'Risque', training: 'Formation', supplier: 'Fournisseur',
    batch_record: 'Dossier de Lot', oos_oot: 'OOS/OOT',
  }
  const compliance: Record<string, any[]> = {
    capa: [{ standard: 'ISO 13485', clause: '8.5.2' }, { standard: 'ISO 13485', clause: '8.5.3' }],
    ncr: [{ standard: 'ISO 13485', clause: '8.3' }],
    deviation: [{ standard: 'ISO 13485', clause: '7.1' }],
    change_control: [{ standard: 'ISO 13485', clause: '7.3.7' }],
    audit: [{ standard: 'ISO 13485', clause: '8.2.4' }],
    risk: [{ standard: 'ISO 14971', clause: '5.4' }, { standard: 'ISO 13485', clause: '7.1' }],
    training: [{ standard: 'ISO 13485', clause: '6.2' }],
    supplier: [{ standard: 'ISO 13485', clause: '7.4' }],
    batch_record: [{ standard: 'ISO 13485', clause: '7.5.1' }, { standard: 'ISO 13485', clause: '7.5.9' }],
    oos_oot: [{ standard: 'ISO 13485', clause: '8.2.6' }],
  }
  const flows: Record<string, any[]> = {
    capa: [{ status: 'Open', label: 'Open' }, { status: 'Investigation', label: 'Investigation' }, { status: 'Implementation', label: 'Implementation' }, { status: 'Effectiveness Check', label: 'Effectiveness Check' }, { status: 'Closed', label: 'Closed' }],
    ncr: [{ status: 'Open', label: 'Open' }, { status: 'Under Investigation', label: 'Under Investigation' }, { status: 'Pending Disposition', label: 'Pending Disposition' }, { status: 'Closed', label: 'Closed' }],
    deviation: [{ status: 'Open', label: 'Open' }, { status: 'Under Investigation', label: 'Under Investigation' }, { status: 'Pending QA Review', label: 'Pending QA Review' }, { status: 'Approved', label: 'Approved' }, { status: 'Closed', label: 'Closed' }],
    change_control: [{ status: 'Requested', label: 'Requested' }, { status: 'Under Review', label: 'Under Review' }, { status: 'Approved', label: 'Approved' }, { status: 'In Implementation', label: 'In Implementation' }, { status: 'Completed', label: 'Completed' }],
    audit: [{ status: 'Planned', label: 'Planned' }, { status: 'In Progress', label: 'In Progress' }, { status: 'Completed', label: 'Completed' }],
    risk: [{ status: 'Open', label: 'Open' }, { status: 'Mitigated', label: 'Mitigated' }, { status: 'Closed', label: 'Closed' }],
    training: [{ status: 'Planned', label: 'Planned' }, { status: 'In Progress', label: 'In Progress' }, { status: 'Completed', label: 'Completed' }],
    supplier: [{ status: 'Under Evaluation', label: 'Under Evaluation' }, { status: 'Conditional', label: 'Conditional' }, { status: 'Qualified', label: 'Qualified' }],
    batch_record: [{ status: 'In Progress', label: 'In Progress' }, { status: 'Pending QA Review', label: 'Pending QA Review' }, { status: 'Released', label: 'Released' }],
    oos_oot: [{ status: 'Open', label: 'Open' }, { status: 'Under Investigation', label: 'Under Investigation' }, { status: 'Pending Disposition', label: 'Pending Disposition' }, { status: 'Closed', label: 'Closed' }],
  }
  for (const slug of slugs) {
    await db.recordTypeDefinition.create({
      data: {
        slug, name: names[slug], nameEn: slug, icon: 'FileText',
        description: `${names[slug]} (système)`,
        statusFlowJson: JSON.stringify(flows[slug]),
        defaultFieldsJson: '[]',
        complianceRefsJson: JSON.stringify(compliance[slug] || []),
        isSystem: true, isActive: true, requiresEsig: true, minApproverCount: 1,
        version: 1, organizationId: orgId, createdById: profileId,
      },
    })
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await db.$disconnect() })
