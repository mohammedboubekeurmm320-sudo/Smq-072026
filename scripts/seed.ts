import { db } from '../src/lib/db'
import bcrypt from 'bcryptjs'

async function main() {
  // Create standards
  const standards = [
    { code: 'ISO 13485:2016', name: 'Dispositifs médicaux — Systèmes de management de la qualité — Exigences à des fins réglementaires', version: '2016', description: 'Norme principale pour les SMQ des dispositifs médicaux.' },
    { code: 'ISO 9001:2015', name: 'Systèmes de management de la qualité — Exigences', version: '2015', description: 'Norme générique du SMQ.' },
    { code: 'ISO 14971:2019', name: 'Gestion des risques appliquée aux dispositifs médicaux', version: '2019', description: 'Analyse et gestion des risques des DM.' },
    { code: 'ISO 14001:2015', name: 'Systèmes de management environnemental', version: '2015', description: 'Norme environnementale.' },
    { code: 'ISO 27001:2022', name: 'Sécurité de l\'information', version: '2022', description: 'Système de management de la sécurité de l\'information.' },
    { code: 'ISO 45001:2018', name: 'Santé et sécurité au travail', version: '2018', description: 'Système de management SST.' },
    { code: 'IEC 62304:2006', name: 'Logiciels de dispositifs médicaux — Processus du cycle de vie', version: '2006', description: 'Cycle de vie des logiciels médicaux.' },
    { code: 'FDA 21 CFR 820', name: 'QSR - Quality System Regulation', version: 'current', description: 'Réglementation FDA pour les DM.' }
  ]
  for (const s of standards) {
    await db.standard.upsert({
      where: { code: s.code },
      update: {},
      create: s
    })
  }

  // Create demo organization
  const org = await db.organization.upsert({
    where: { id: 'demo-org-001' },
    update: {},
    create: {
      id: 'demo-org-001',
      name: 'MediQuality Devices SARL',
      address: '12 rue de l\'Innovation',
      city: 'Lyon',
      country: 'France',
      type: 'manufacturer',
      contactEmail: 'contact@mediquality.fr',
      contactPhone: '+33 4 72 00 00 00'
    }
  })

  // Attach standards
  const iso13485 = await db.standard.findUnique({ where: { code: 'ISO 13485:2016' } })
  const iso14971 = await db.standard.findUnique({ where: { code: 'ISO 14971:2019' } })
  const iso9001 = await db.standard.findUnique({ where: { code: 'ISO 9001:2015' } })
  if (iso13485) await db.organizationStandard.upsert({ where: { organizationId_standardId: { organizationId: org.id, standardId: iso13485.id } }, update: {}, create: { organizationId: org.id, standardId: iso13485.id, certified: true, certifiedAt: new Date('2024-01-15') } })
  if (iso14971) await db.organizationStandard.upsert({ where: { organizationId_standardId: { organizationId: org.id, standardId: iso14971.id } }, update: {}, create: { organizationId: org.id, standardId: iso14971.id, certified: true, certifiedAt: new Date('2024-02-10') } })
  if (iso9001) await db.organizationStandard.upsert({ where: { organizationId_standardId: { organizationId: org.id, standardId: iso9001.id } }, update: {}, create: { organizationId: org.id, standardId: iso9001.id, certified: false } })

  // Create users
  const pwd = await bcrypt.hash('admin123', 10)
  const users = [
    { id: 'user-admin-001', email: 'admin@mediquality.fr', name: 'Sophie Martin', role: 'ADMIN', position: 'Directrice Générale', department: 'Direction' },
    { id: 'user-qm-001', email: 'quality@mediquality.fr', name: 'Pierre Dubois', role: 'QUALITY_MANAGER', position: 'Responsable Qualité', department: 'Qualité' },
    { id: 'user-eng-001', email: 'engineer@mediquality.fr', name: 'Marie Leroy', role: 'ENGINEER', position: 'Ingénieur R&D', department: 'R&D' },
    { id: 'user-aud-001', email: 'auditor@mediquality.fr', name: 'Jean Bernard', role: 'AUDITOR', position: 'Auditeur Interne', department: 'Qualité' }
  ]
  for (const u of users) {
    await db.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, organizationId: org.id, passwordHash: pwd }
    })
  }

  const qm = await db.user.findUnique({ where: { email: 'quality@mediquality.fr' } })
  const eng = await db.user.findUnique({ where: { email: 'engineer@mediquality.fr' } })
  const admin = await db.user.findUnique({ where: { email: 'admin@mediquality.fr' } })

  if (qm && eng && admin) {
    const docs = [
      { code: 'MAN-001', title: 'Manuel Qualité', version: '3.1', status: 'APPROVED', category: 'manual', summary: 'Manuel Qualité ISO 13485', ownerId: qm.id, reviewerId: eng.id, approverId: admin.id, effectiveDate: new Date('2024-01-20'), nextReviewDate: new Date('2026-01-20') },
      { code: 'PRO-001', title: 'Procédure de contrôle des documents', version: '2.0', status: 'APPROVED', category: 'procedure', summary: 'Maîtrise des documents selon ISO 13485 §4.2.4', ownerId: qm.id, reviewerId: admin.id, approverId: admin.id, effectiveDate: new Date('2024-03-01'), nextReviewDate: new Date('2026-03-01') },
      { code: 'PRO-002', title: 'Procédure de gestion des risques', version: '1.5', status: 'APPROVED', category: 'procedure', summary: 'Gestion des risques selon ISO 14971', ownerId: eng.id, reviewerId: qm.id, approverId: admin.id, effectiveDate: new Date('2024-04-15'), nextReviewDate: new Date('2026-04-15') },
      { code: 'PRO-003', title: 'Procédure d\'audit interne', version: '1.2', status: 'APPROVED', category: 'procedure', summary: 'Audit interne selon ISO 13485 §8.2.4', ownerId: qm.id, reviewerId: admin.id, approverId: admin.id, effectiveDate: new Date('2024-02-01'), nextReviewDate: new Date('2026-02-01') },
      { code: 'PRO-004', title: 'Procédure CAPA', version: '1.0', status: 'IN_REVIEW', category: 'procedure', summary: 'Actions correctives et préventives', ownerId: qm.id, reviewerId: eng.id, approverId: null },
      { code: 'INS-001', title: 'Instruction de contrôle final', version: '4.0', status: 'APPROVED', category: 'instruction', summary: 'Contrôle final du produit DM-100', ownerId: eng.id, reviewerId: qm.id, approverId: admin.id, effectiveDate: new Date('2024-05-10'), nextReviewDate: new Date('2025-11-10') },
      { code: 'FOR-001', title: 'Formulaire de non-conformité', version: '1.0', status: 'APPROVED', category: 'form', summary: 'Enregistrement des non-conformités', ownerId: qm.id, reviewerId: null, approverId: admin.id, effectiveDate: new Date('2024-01-15') },
      { code: 'POL-001', title: 'Politique Qualité', version: '2.0', status: 'APPROVED', category: 'policy', summary: 'Politique qualité de l\'entreprise', ownerId: admin.id, reviewerId: qm.id, approverId: admin.id, effectiveDate: new Date('2024-01-05') }
    ]
    for (const d of docs) {
      await db.document.create({
        data: { ...d, organizationId: org.id, content: `# ${d.title}\n\nVersion ${d.version}\n\n${d.summary}\n\n(Document exemple généré par le seed)` }
      })
    }

    const risks = [
      { title: 'Risque de contamination du produit', description: 'Contamination possible durant la production', process: 'Production', hazard: 'Contamination microbiologique', severity: 5, probability: 3, detectability: 2, rpn: 30, mitigation: 'Salle blanche ISO 7 + contrôles microbiologiques', status: 'MITIGATED', ownerId: qm.id },
      { title: 'Erreur d\'étiquetage', description: 'Risque d\'erreur sur étiquetage final', process: 'Conditionnement', hazard: 'Étiquetage incorrect', severity: 4, probability: 2, detectability: 3, rpn: 24, mitigation: 'Vérification double contrôle', status: 'MITIGATED', ownerId: eng.id },
      { title: 'Défaillance logiciel embarqué', description: 'Bug possible dans le logiciel de contrôle', process: 'R&D', hazard: 'Bug logiciel', severity: 5, probability: 2, detectability: 4, rpn: 40, mitigation: 'Tests unitaires + validation IEC 62304', status: 'ANALYZED', ownerId: eng.id }
    ]
    for (const r of risks) await db.risk.create({ data: { ...r, organizationId: org.id } })

    const audits = [
      { title: 'Audit interne QMS 2024 T1', type: 'internal', scope: 'SMQ complet', plannedDate: new Date('2024-03-15'), conductedDate: new Date('2024-03-15'), status: 'COMPLETED', findings: '3 non-conformités mineures identifiées', conclusion: 'SMQ conforme', leadAuditorId: qm.id },
      { title: 'Audit fournisseur Plasticorp', type: 'supplier', scope: 'Évaluation fournisseur matière première', plannedDate: new Date('2024-09-10'), conductedDate: new Date('2024-09-10'), status: 'COMPLETED', findings: 'Système qualité acceptable', conclusion: 'Approbation recommandée', leadAuditorId: qm.id },
      { title: 'Audit interne QMS 2024 T3', type: 'internal', scope: 'Processus production', plannedDate: new Date('2024-10-20'), status: 'PLANNED', leadAuditorId: qm.id }
    ]
    for (const a of audits) await db.audit.create({ data: { ...a, organizationId: org.id } })

    const nc1 = await db.nonconformity.create({
      data: { reference: 'NC-2024-001', title: 'Étiquetage non conforme lot 2024-045', description: 'Date de péremption incorrecte sur 50 unités', source: 'internal_audit', severity: 'major', status: 'CLOSED', ownerId: qm.id, detectedDate: new Date('2024-03-15'), closedDate: new Date('2024-04-30'), organizationId: org.id }
    })
    const nc2 = await db.nonconformity.create({
      data: { reference: 'NC-2024-002', title: 'Écart procédure de contrôle réception', description: 'Contrôle dimensionnel non réalisé sur lot matière première', source: 'process', severity: 'minor', status: 'ACTION', ownerId: eng.id, detectedDate: new Date('2024-08-12'), organizationId: org.id }
    })
    await db.nonconformity.create({
      data: { reference: 'NC-2024-003', title: 'Réclamation client - défaut d\'emballage', description: '3 réclamations client sur emballage endommagé', source: 'customer_complaint', severity: 'major', status: 'INVESTIGATION', ownerId: qm.id, detectedDate: new Date('2024-09-25'), organizationId: org.id }
    })

    await db.cAPA.create({
      data: { reference: 'CAPA-2024-001', type: 'CORRECTIVE', title: 'Correctif étiquetage lot 2024-045', description: 'Ré-étiquetage et quarantaine du lot', rootCause: 'Erreur opérateur - formation insuffisante', action: 'Ré-étiquetage + formation renforcée', dueDate: new Date('2024-04-15'), completedDate: new Date('2024-04-10'), status: 'VERIFIED', ownerId: qm.id, nonconformityId: nc1.id, organizationId: org.id }
    })
    await db.cAPA.create({
      data: { reference: 'CAPA-2024-002', type: 'CORRECTIVE', title: 'Mise à jour procédure contrôle réception', description: 'Mise à jour de la procédure pour inclure contrôle dimensionnel systématique', rootCause: 'Procédure incomplète', action: 'Révision PRO-005 + formation', dueDate: new Date('2024-09-30'), status: 'IN_PROGRESS', ownerId: eng.id, nonconformityId: nc2.id, organizationId: org.id }
    })
    await db.cAPA.create({
      data: { reference: 'CAPA-2024-003', type: 'PREVENTIVE', title: 'Prévention défauts emballage', description: 'Renforcement du contrôle emballage en fin de ligne', rootCause: 'Procédure emballage à renforcer', action: 'Nouvelle procédure + contrôle automatique', dueDate: new Date('2024-11-30'), status: 'OPEN', ownerId: qm.id, organizationId: org.id }
    })

    const trainings = [
      { name: 'Formation ISO 13485:2016', description: 'Sensibilisation à la norme', category: 'regulatory', userId: eng.id, conductedDate: new Date('2024-02-10'), completedDate: new Date('2024-02-10'), status: 'COMPLETED', score: 85 },
      { name: 'Gestion des risques ISO 14971', description: 'Analyse des risques produits', category: 'quality', userId: qm.id, conductedDate: new Date('2024-03-01'), completedDate: new Date('2024-03-01'), status: 'COMPLETED', score: 92 },
      { name: 'Audit interne', description: 'Techniques d\'audit', category: 'quality', userId: qm.id, conductedDate: new Date('2024-01-20'), completedDate: new Date('2024-01-20'), status: 'COMPLETED', score: 88 },
      { name: 'Formation IEC 62304', description: 'Cycle de vie logiciel médical', category: 'technical', userId: eng.id, status: 'PLANNED' },
      { name: 'Sécurité au travail', description: 'Formation SST annuelle', category: 'safety', userId: qm.id, conductedDate: new Date('2024-09-01'), status: 'IN_PROGRESS' }
    ]
    for (const t of trainings) await db.training.create({ data: { ...t, organizationId: org.id } })

    const suppliers = [
      { name: 'Plasticorp SAS', contactName: 'Marc Petit', email: 'contact@plasticorp.fr', phone: '+33 4 78 00 00 00', category: 'Matière première', evaluation: 'APPROVED', evaluationDate: new Date('2024-01-15'), riskLevel: 'low', notes: 'Fournisseur stratégique certifié ISO 13485' },
      { name: 'MedPack Solutions', contactName: 'Laura Garcia', email: 'sales@medpack.com', phone: '+33 1 42 00 00 00', category: 'Emballage', evaluation: 'APPROVED', evaluationDate: new Date('2024-02-01'), riskLevel: 'medium', notes: 'Bon fournisseur d\'emballages stériles' },
      { name: 'TechComponents Ltd', contactName: 'John Smith', email: 'info@techcomponents.com', phone: '+44 20 7000 0000', category: 'Composants électroniques', evaluation: 'CONDITIONAL', evaluationDate: new Date('2024-05-10'), riskLevel: 'high', notes: 'À ré-évaluer suite à retard de livraison' },
      { name: 'LogiTrans', contactName: 'Ahmed Benali', email: 'contact@logitrans.fr', phone: '+33 4 91 00 00 00', category: 'Transport', evaluation: 'PENDING', riskLevel: 'medium', notes: 'Nouveau fournisseur en cours d\'évaluation' }
    ]
    for (const s of suppliers) await db.supplier.create({ data: { ...s, organizationId: org.id } })

    const processes = [
      { name: 'Conception et développement', description: 'Processus de conception des DM selon ISO 13485 §7.3', type: 'core', ownerId: eng.id, inputs: 'Besoins client, exigences réglementaires', outputs: 'Dossier technique, prototypes', kpi: 'Délai de mise sur le marché', status: 'active' },
      { name: 'Production', description: 'Fabrication des dispositifs médicaux', type: 'core', ownerId: eng.id, inputs: 'Matières premières, instructions', outputs: 'Produits finis', kpi: 'Taux de conformité, taux de rebut', status: 'active' },
      { name: 'Contrôle qualité', description: 'Contrôles qualité produits et processus', type: 'support', ownerId: qm.id, inputs: 'Produits à contrôler, procédures', outputs: 'Rapports de contrôle, libération', kpi: 'Taux de non-conformité', status: 'active' },
      { name: 'Management de la qualité', description: 'Pilotage du SMQ', type: 'management', ownerId: qm.id, inputs: 'Données qualité, audits', outputs: 'Revue de direction, CAPA', kpi: 'Conformité ISO 13485', status: 'active' },
      { name: 'Achats', description: 'Évaluation et gestion des fournisseurs', type: 'support', ownerId: admin.id, inputs: 'Besoins d\'achat', outputs: 'Commandes, évaluations fournisseurs', kpi: 'Délai de livraison fournisseurs', status: 'active' }
    ]
    for (const p of processes) await db.process.create({ data: { ...p, organizationId: org.id } })
  }

  console.log('✓ Seed terminé')
  console.log('  Comptes:')
  console.log('    admin@mediquality.fr / admin123 (ADMIN)')
  console.log('    quality@mediquality.fr / admin123 (QUALITY_MANAGER)')
  console.log('    engineer@mediquality.fr / admin123 (ENGINEER)')
  console.log('    auditor@mediquality.fr / admin123 (AUDITOR)')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await db.$disconnect() })
