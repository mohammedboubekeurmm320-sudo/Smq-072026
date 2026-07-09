'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useModule } from '@/hooks/useModule'
import { ModuleShell, type ModuleConfig } from '@/components/shared/ModuleShell'
import { Shield, AlertTriangle, AlertOctagon, ArrowLeftRight, ClipboardCheck, BarChart3, GraduationCap, Package, Truck } from 'lucide-react'

// ============================================================================
// CAPA Module
// ============================================================================
const capaConfig: ModuleConfig<any> = {
  title: 'CAPA',
  subtitle: 'Actions Correctives et Préventives (ISO 13485 §8.5.2 / §8.5.3)',
  recordTypeSlug: 'capa', icon: Shield, numberPrefix: 'CAPA', numberField: 'capaNumber', statusField: 'status',
  createPermission: 'capa.create', editPermission: 'capa.update', deletePermission: 'capa.delete',
  statusFilters: [
    { value: 'Open', label: 'Ouvert' }, { value: 'Investigation', label: 'Investigation' },
    { value: 'Implementation', label: 'Implémentation' }, { value: 'Effectiveness Check', label: 'Vérification' },
    { value: 'Closed', label: 'Clôturé' },
  ],
  typeFilters: { field: 'capaType', label: 'Type', options: [
    { value: 'Corrective', label: 'Corrective' }, { value: 'Preventive', label: 'Préventive' },
  ]},
  fields: [
    { name: 'capaNumber', label: 'N° CAPA', hideInForm: true },
    { name: 'title', label: 'Titre', required: true },
    { name: 'capaType', label: 'Type', type: 'select', options: [{ value: 'Corrective', label: 'Corrective' }, { value: 'Preventive', label: 'Préventive' }] },
    { name: 'priority', label: 'Priorité', type: 'select', options: [{ value: 'Critical', label: 'Critique' }, { value: 'High', label: 'Haute' }, { value: 'Medium', label: 'Moyenne' }, { value: 'Low', label: 'Basse' }] },
    { name: 'source', label: 'Source', type: 'select', options: [
      { value: 'Non-Conformance', label: 'Non-conformité' }, { value: 'Audit Finding', label: 'Constat d\'audit' },
      { value: 'Customer Complaint', label: 'Réclamation client' }, { value: 'Management Review', label: 'Revue de direction' },
      { value: 'Process Monitoring', label: 'Surveillance processus' }, { value: 'Supplier Issue', label: 'Problème fournisseur' },
    ]},
    { name: 'description', label: 'Description', type: 'textarea' },
    { name: 'problemStatement', label: 'Énoncé du problème', type: 'textarea' },
    { name: 'rootCauseAnalysis', label: 'Analyse cause racine', type: 'textarea' },
    { name: 'rootCauseCategory', label: 'Catégorie cause racine (5M+M+Mgmt)', type: 'select', options: [
      { value: 'Man', label: 'Main d\'œuvre (Man)' }, { value: 'Machine', label: 'Machine' }, { value: 'Method', label: 'Méthode' },
      { value: 'Material', label: 'Matériau' }, { value: 'Measurement', label: 'Mesure' }, { value: 'Environment', label: 'Environnement' },
      { value: 'Management', label: 'Management' },
    ]},
    { name: 'correctiveAction', label: 'Action corrective', type: 'textarea' },
    { name: 'effectivenessVerificationMethod', label: 'Méthode vérification efficacité', type: 'textarea' },
    { name: 'effectivenessCriteria', label: 'Critères d\'efficacité', type: 'text' },
    { name: 'effectivenessResult', label: 'Résultat', type: 'select', options: [
      { value: 'Effective', label: 'Efficace' }, { value: 'Not Effective', label: 'Non efficace' }, { value: 'Pending Review', label: 'En attente revue' },
    ]},
    { name: 'dueDate', label: 'Échéance', type: 'date' },
  ],
}

export function CapaView() {
  const { profile } = useAuth()
  const { items, create, update, remove } = useModule('/api/capas')
  return (
    <ModuleShell
      config={capaConfig}
      records={items}
      onCreate={create}
      onUpdate={update}
      onDelete={remove}
      onTransition={async (id, target, sigHash) => {
        const patch: any = { status: target }
        if (target === 'Closed' && sigHash) patch.closedDate = new Date().toISOString()
        await update(id, patch)
        return { ok: true }
      }}
    />
  )
}

// ============================================================================
// NCR Module
// ============================================================================
const ncrConfig: ModuleConfig<any> = {
  title: 'Non-Conformités',
  subtitle: 'Maîtrise du produit non conforme (ISO 13485 §8.3)',
  recordTypeSlug: 'ncr', icon: AlertTriangle, numberPrefix: 'NCR', numberField: 'ncrNumber', statusField: 'status',
  createPermission: 'ncr.create', editPermission: 'ncr.update', deletePermission: 'ncr.delete',
  statusFilters: [
    { value: 'Open', label: 'Ouvert' }, { value: 'Under Investigation', label: 'Investigation' },
    { value: 'Pending Disposition', label: 'Disposition' }, { value: 'Closed', label: 'Clôturé' },
  ],
  typeFilters: { field: 'ncrType', label: 'Type', options: [
    { value: 'Product', label: 'Produit' }, { value: 'Process', label: 'Processus' }, { value: 'System', label: 'Système' },
    { value: 'Supplier', label: 'Fournisseur' }, { value: 'OOS', label: 'OOS' }, { value: 'OOT', label: 'OOT' },
  ]},
  fields: [
    { name: 'ncrNumber', label: 'N° NCR', hideInForm: true },
    { name: 'title', label: 'Titre', required: true },
    { name: 'ncrType', label: 'Type', type: 'select', options: [
      { value: 'Product', label: 'Produit' }, { value: 'Process', label: 'Processus' }, { value: 'System', label: 'Système' },
      { value: 'Supplier', label: 'Fournisseur' }, { value: 'OOS', label: 'OOS' }, { value: 'OOT', label: 'OOT' },
    ]},
    { name: 'severity', label: 'Sévérité', type: 'select', options: [
      { value: 'Critical', label: 'Critique' }, { value: 'Major', label: 'Majeure' }, { value: 'Minor', label: 'Mineure' },
    ]},
    { name: 'source', label: 'Source', type: 'text' },
    { name: 'description', label: 'Description', type: 'textarea' },
    { name: 'lotNumber', label: 'N° Lot', type: 'text' },
    { name: 'quantityAffected', label: 'Quantité affectée', type: 'text' },
    { name: 'disposition', label: 'Disposition', type: 'select', options: [
      { value: 'Use As Is', label: 'Utiliser tel quel' }, { value: 'Rework', label: 'Retravailler' },
      { value: 'Scrap', label: 'Mettre au rebut' }, { value: 'Return to Supplier', label: 'Retourner au fournisseur' },
      { value: 'Concession', label: 'Concession' }, { value: 'Pending', label: 'En attente' },
    ]},
    { name: 'affectedProduct', label: 'Produit affecté', type: 'text' },
    { name: 'containmentActions', label: 'Actions de confinement', type: 'textarea' },
    { name: 'impactAssessment', label: 'Évaluation d\'impact', type: 'textarea' },
    { name: 'dueDate', label: 'Échéance', type: 'date' },
  ],
}

export function NcrView() {
  const { items, create, update, remove } = useModule('/api/ncrs')
  const { profile } = useAuth()
  return (
    <ModuleShell
      config={ncrConfig}
      records={items}
      onCreate={create}
      onUpdate={update}
      onDelete={remove}
      onTransition={async (id, target, sigHash) => {
        const patch: any = { status: target }
        if (target === 'Closed' && sigHash) {
          patch.closedSignedAt = new Date().toISOString()
          patch.closedSignatureHash = sigHash
          patch.closedById = profile?.id
        }
        await update(id, patch)
        return { ok: true }
      }}
    />
  )
}

// ============================================================================
// Deviation Module
// ============================================================================
const deviationConfig: ModuleConfig<any> = {
  title: 'Déviations',
  subtitle: 'Déviations planifiées et non planifiées (ISO 13485 §7.1 / §7.5.1)',
  recordTypeSlug: 'deviation', icon: AlertOctagon, numberPrefix: 'DEV', numberField: 'devNumber', statusField: 'status',
  createPermission: 'deviation.create', editPermission: 'deviation.update', deletePermission: 'deviation.delete',
  statusFilters: [
    { value: 'Open', label: 'Ouvert' }, { value: 'Under Investigation', label: 'Investigation' },
    { value: 'Pending QA Review', label: 'Revue QA' }, { value: 'Approved', label: 'Approuvé' }, { value: 'Closed', label: 'Clôturé' },
  ],
  typeFilters: { field: 'category', label: 'Catégorie', options: [
    { value: 'Process', label: 'Processus' }, { value: 'Equipment', label: 'Équipement' }, { value: 'Material', label: 'Matériau' },
    { value: 'Environment', label: 'Environnement' }, { value: 'Personnel', label: 'Personnel' }, { value: 'Documentation', label: 'Documentation' },
  ]},
  fields: [
    { name: 'devNumber', label: 'N° Déviation', hideInForm: true },
    { name: 'title', label: 'Titre', required: true },
    { name: 'deviationType', label: 'Type', type: 'select', options: [{ value: 'Planned', label: 'Planifiée' }, { value: 'Unplanned', label: 'Non planifiée' }] },
    { name: 'severity', label: 'Sévérité', type: 'select', options: [{ value: 'Critical', label: 'Critique' }, { value: 'Major', label: 'Majeure' }, { value: 'Minor', label: 'Mineure' }] },
    { name: 'category', label: 'Catégorie', type: 'select', options: [
      { value: 'Process', label: 'Processus' }, { value: 'Equipment', label: 'Équipement' }, { value: 'Material', label: 'Matériau' },
      { value: 'Environment', label: 'Environnement' }, { value: 'Personnel', label: 'Personnel' }, { value: 'Documentation', label: 'Documentation' },
    ]},
    { name: 'description', label: 'Description', type: 'textarea' },
    { name: 'deviationDetails', label: 'Détails', type: 'textarea' },
    { name: 'justification', label: 'Justification', type: 'textarea' },
    { name: 'riskAssessment', label: 'Évaluation des risques', type: 'textarea' },
    { name: 'correctiveAction', label: 'Action corrective', type: 'textarea' },
    { name: 'preventiveAction', label: 'Action préventive', type: 'textarea' },
    { name: 'sopReference', label: 'Référence SOP', type: 'text' },
    { name: 'expectedResult', label: 'Résultat attendu', type: 'text' },
    { name: 'actualResult', label: 'Résultat actuel', type: 'text' },
    { name: 'productStage', label: 'Étape produit', type: 'select', options: [
      { value: 'Raw Material', label: 'Matière première' }, { value: 'In-Process', label: 'En cours' },
      { value: 'Finished Product', label: 'Produit fini' }, { value: 'Stability', label: 'Stabilité' }, { value: 'Other', label: 'Autre' },
    ]},
    { name: 'lotNumber', label: 'N° Lot', type: 'text' },
    { name: 'productCode', label: 'Code produit', type: 'text' },
    { name: 'quantityAffected', label: 'Quantité affectée', type: 'text' },
    { name: 'containmentAction', label: 'Action de confinement', type: 'textarea' },
    { name: 'dueDate', label: 'Échéance', type: 'date' },
  ],
}

export function DeviationView() {
  const { items, create, update, remove } = useModule('/api/deviations')
  return (
    <ModuleShell config={deviationConfig} records={items} onCreate={create} onUpdate={update} onDelete={remove}
      onTransition={async (id, target) => { await update(id, { status: target }); return { ok: true } }}
    />
  )
}

// ============================================================================
// Change Control Module
// ============================================================================
const ccConfig: ModuleConfig<any> = {
  title: 'Contrôle des Changements',
  subtitle: 'Maîtrise des modifications (ISO 13485 §7.3.7 / §8.5.1)',
  recordTypeSlug: 'change_control', icon: ArrowLeftRight, numberPrefix: 'CC', numberField: 'ccNumber', statusField: 'status',
  createPermission: 'changecontrol.create', editPermission: 'changecontrol.update', deletePermission: 'changecontrol.delete',
  statusFilters: [
    { value: 'Requested', label: 'Demandé' }, { value: 'Under Review', label: 'En revue' },
    { value: 'Approved', label: 'Approuvé' }, { value: 'In Implementation', label: 'En implémentation' },
    { value: 'Completed', label: 'Terminé' }, { value: 'Rejected', label: 'Rejeté' },
  ],
  typeFilters: { field: 'category', label: 'Catégorie', options: [
    { value: 'Process', label: 'Processus' }, { value: 'Equipment', label: 'Équipement' }, { value: 'Facility', label: 'Installation' },
    { value: 'Document', label: 'Document' }, { value: 'Material', label: 'Matériau' }, { value: 'Computer System', label: 'Système informatique' },
    { value: 'Organizational', label: 'Organisationnel' }, { value: 'Manufacturing', label: 'Fabrication' },
    { value: 'Regulatory', label: 'Réglementaire' }, { value: 'Supply Chain', label: 'Supply Chain' },
    { value: 'Warehouse', label: 'Entrepôt' }, { value: 'Other', label: 'Autre' },
  ]},
  fields: [
    { name: 'ccNumber', label: 'N° CC', hideInForm: true },
    { name: 'title', label: 'Titre', required: true },
    { name: 'ccType', label: 'Type', type: 'select', options: [{ value: 'Planned', label: 'Planifié' }, { value: 'Unplanned', label: 'Non planifié' }, { value: 'Emergency', label: 'Urgence' }] },
    { name: 'priority', label: 'Priorité', type: 'select', options: [{ value: 'Critical', label: 'Critique' }, { value: 'High', label: 'Haute' }, { value: 'Medium', label: 'Moyenne' }, { value: 'Low', label: 'Basse' }] },
    { name: 'category', label: 'Catégorie', type: 'select', options: [
      { value: 'Process', label: 'Processus' }, { value: 'Equipment', label: 'Équipement' }, { value: 'Facility', label: 'Installation' },
      { value: 'Document', label: 'Document' }, { value: 'Material', label: 'Matériau' }, { value: 'Computer System', label: 'Système informatique' },
      { value: 'Organizational', label: 'Organisationnel' }, { value: 'Manufacturing', label: 'Fabrication' },
      { value: 'Regulatory', label: 'Réglementaire' }, { value: 'Supply Chain', label: 'Supply Chain' },
      { value: 'Warehouse', label: 'Entrepôt' }, { value: 'Other', label: 'Autre' },
    ]},
    { name: 'description', label: 'Description', type: 'textarea' },
    { name: 'justification', label: 'Justification', type: 'textarea' },
    { name: 'proposedChange', label: 'Changement proposé', type: 'textarea' },
    { name: 'riskAssessment', label: 'Évaluation des risques', type: 'textarea' },
    { name: 'impactAnalysis', label: 'Analyse d\'impact', type: 'textarea' },
    { name: 'affectedAreas', label: 'Zones affectées', type: 'text' },
    { name: 'implementationPlan', label: 'Plan d\'implémentation', type: 'textarea' },
    { name: 'implementationDate', label: 'Date d\'implémentation', type: 'date' },
    { name: 'dueDate', label: 'Échéance', type: 'date' },
  ],
}

export function ChangeControlView() {
  const { items, create, update, remove } = useModule('/api/change-controls')
  return (
    <ModuleShell config={ccConfig} records={items} onCreate={create} onUpdate={update} onDelete={remove}
      onTransition={async (id, target) => { await update(id, { status: target }); return { ok: true } }}
    />
  )
}

// ============================================================================
// Audit Module
// ============================================================================
const auditConfig: ModuleConfig<any> = {
  title: 'Audits',
  subtitle: 'Audit interne et externe (ISO 13485 §8.2.4)',
  recordTypeSlug: 'audit', icon: ClipboardCheck, numberPrefix: 'AUD', numberField: 'auditNumber', statusField: 'status',
  createPermission: 'audit.create', editPermission: 'audit.update', deletePermission: 'audit.delete',
  statusFilters: [
    { value: 'Planned', label: 'Planifié' }, { value: 'In Progress', label: 'En cours' }, { value: 'Completed', label: 'Terminé' },
  ],
  typeFilters: { field: 'auditType', label: 'Type', options: [
    { value: 'Internal', label: 'Interne' }, { value: 'External', label: 'Externe' }, { value: 'Supplier', label: 'Fournisseur' },
  ]},
  fields: [
    { name: 'auditNumber', label: 'N° Audit', hideInForm: true },
    { name: 'title', label: 'Titre', required: true },
    { name: 'auditType', label: 'Type', type: 'select', options: [{ value: 'Internal', label: 'Interne' }, { value: 'External', label: 'Externe' }, { value: 'Supplier', label: 'Fournisseur' }] },
    { name: 'auditScope', label: 'Périmètre', type: 'textarea' },
    { name: 'auditCriteria', label: 'Critères d\'audit', type: 'text' },
    { name: 'scheduledDate', label: 'Date planifiée', type: 'date' },
    { name: 'completedDate', label: 'Date de réalisation', type: 'date' },
    { name: 'complianceRating', label: 'Évaluation conformité', type: 'text' },
  ],
}

export function AuditView() {
  const { items, create, update, remove } = useModule('/api/audits')
  const { profile } = useAuth()
  return (
    <ModuleShell config={auditConfig} records={items} onCreate={create} onUpdate={update} onDelete={remove}
      onTransition={async (id, target, sigHash) => {
        const patch: any = { status: target }
        if (target === 'Completed' && sigHash) {
          patch.completedDate = new Date().toISOString()
          patch.completedSignatureHash = sigHash
          patch.completedSignedAt = new Date().toISOString()
          patch.completedSignedById = profile?.id
        }
        await update(id, patch)
        return { ok: true }
      }}
    />
  )
}

// ============================================================================
// Risk Module (FMEA + ISO 14971)
// ============================================================================
const riskConfig: ModuleConfig<any> = {
  title: 'Risques',
  subtitle: 'Gestion des risques FMEA + ISO 14971 (ISO 13485 §7.1)',
  recordTypeSlug: 'risk', icon: BarChart3, numberPrefix: 'RSK', numberField: 'riskNumber', statusField: 'status',
  createPermission: 'risk.create', editPermission: 'risk.update', deletePermission: 'risk.delete',
  statusFilters: [
    { value: 'Open', label: 'Ouvert' }, { value: 'Mitigated', label: 'Atténué' },
    { value: 'Accepted', label: 'Accepté' }, { value: 'Closed', label: 'Clôturé' },
  ],
  typeFilters: { field: 'category', label: 'Catégorie', options: [
    { value: 'Product', label: 'Produit' }, { value: 'Process', label: 'Processus' },
    { value: 'System', label: 'Système' }, { value: 'Supplier', label: 'Fournisseur' },
  ]},
  fields: [
    { name: 'riskNumber', label: 'N° Risque', hideInForm: true },
    { name: 'title', label: 'Titre', required: true },
    { name: 'category', label: 'Catégorie', type: 'select', options: [
      { value: 'Product', label: 'Produit' }, { value: 'Process', label: 'Processus' },
      { value: 'System', label: 'Système' }, { value: 'Supplier', label: 'Fournisseur' },
    ]},
    { name: 'hazardDescription', label: 'Description du danger (ISO 14971 §5.4)', type: 'textarea' },
    { name: 'riskOwner', label: 'Propriétaire du risque', type: 'text' },
    { name: 'regulatoryReference', label: 'Référence réglementaire', type: 'text' },
    { name: 'controlType', label: 'Type de contrôle', type: 'select', options: [
      { value: 'inherent_safe_design', label: 'Conception sûre inhérente' },
      { value: 'protective_measures', label: 'Mesures de protection' },
      { value: 'information_for_safety', label: 'Information de sécurité' },
    ]},
    { name: 'verificationMethod', label: 'Méthode de vérification', type: 'text' },
    { name: 'riskAcceptability', label: 'Acceptabilité du risque', type: 'select', options: [
      { value: 'acceptable', label: 'Acceptable' }, { value: 'ALARP', label: 'ALARP (aussi bas que raisonnablement possible)' },
      { value: 'unacceptable', label: 'Inacceptable' },
    ]},
    { name: 'probability', label: 'Probabilité (1-5)', type: 'number' },
    { name: 'impact', label: 'Impact (1-5)', type: 'number' },
    { name: 'detectability', label: 'DéTECTABILITÉ (1-5)', type: 'number' },
    { name: 'mitigation', label: 'Mesures d\'atténuation', type: 'textarea' },
    { name: 'residualRisk', label: 'Risque résiduel', type: 'text' },
  ],
}

export function RiskView() {
  const { items, create, update, remove } = useModule('/api/risks')
  return (
    <ModuleShell config={riskConfig} records={items} onCreate={create} onUpdate={update} onDelete={remove}
      onTransition={async (id, target) => { await update(id, { status: target }); return { ok: true } }}
    />
  )
}

// ============================================================================
// Training Module
// ============================================================================
const trainingConfig: ModuleConfig<any> = {
  title: 'Formation',
  subtitle: 'Compétences et formation (ISO 13485 §6.2)',
  recordTypeSlug: 'training', icon: GraduationCap, numberPrefix: 'TRN', numberField: 'title', statusField: 'status',
  createPermission: 'training.create', editPermission: 'training.update', deletePermission: 'training.delete',
  statusFilters: [
    { value: 'Planned', label: 'Planifiée' }, { value: 'In Progress', label: 'En cours' },
    { value: 'Completed', label: 'Terminée' }, { value: 'Overdue', label: 'En retard' },
  ],
  typeFilters: { field: 'trainingType', label: 'Type', options: [
    { value: 'Onboarding', label: 'Onboarding' }, { value: 'SOP', label: 'SOP' },
    { value: 'Regulatory', label: 'Réglementaire' }, { value: 'Skill', label: 'Compétence' },
    { value: 'Certification', label: 'Certification' },
  ]},
  fields: [
    { name: 'title', label: 'Titre', required: true },
    { name: 'trainingType', label: 'Type', type: 'select', options: [
      { value: 'Onboarding', label: 'Onboarding' }, { value: 'SOP', label: 'SOP' },
      { value: 'Regulatory', label: 'Réglementaire' }, { value: 'Skill', label: 'Compétence' },
      { value: 'Certification', label: 'Certification' },
    ]},
    { name: 'description', label: 'Description', type: 'textarea' },
    { name: 'dueDate', label: 'Échéance', type: 'date' },
    { name: 'completedDate', label: 'Date de completion', type: 'date' },
  ],
}

export function TrainingView() {
  const { items, create, update, remove } = useModule('/api/training')
  return (
    <ModuleShell config={trainingConfig} records={items} onCreate={create} onUpdate={update} onDelete={remove}
      onTransition={async (id, target) => {
        const patch: any = { status: target }
        if (target === 'Completed') patch.completedDate = new Date().toISOString()
        await update(id, patch)
        return { ok: true }
      }}
    />
  )
}

// ============================================================================
// Batch Record Module
// ============================================================================
const batchConfig: ModuleConfig<any> = {
  title: 'Dossiers de Lot',
  subtitle: 'Traçabilité et libération de lot (ISO 13485 §7.5.1 / §7.5.9)',
  recordTypeSlug: 'batch_record', icon: Package, numberPrefix: 'LOT', numberField: 'lotNumber', statusField: 'status',
  createPermission: 'batch.create', editPermission: 'batch.update', deletePermission: 'batch.delete',
  statusFilters: [
    { value: 'In Progress', label: 'En cours' }, { value: 'Pending QA Review', label: 'Revue QA' },
    { value: 'Released', label: 'Libéré' }, { value: 'Rejected', label: 'Rejeté' }, { value: 'Quarantine', label: 'Quarantaine' },
  ],
  fields: [
    { name: 'lotNumber', label: 'N° Lot', required: true },
    { name: 'productName', label: 'Nom du produit', required: true },
    { name: 'productCode', label: 'Code produit', type: 'text' },
    { name: 'batchSize', label: 'Taille du lot', type: 'text' },
    { name: 'batchSizeUnit', label: 'Unité', type: 'select', options: [
      { value: 'vials', label: 'Flacons' }, { value: 'units', label: 'Unités' },
      { value: 'tablets', label: 'Comprimés' }, { value: 'kg', label: 'kg' }, { value: 'liters', label: 'Litres' },
    ]},
    { name: 'sopReference', label: 'Référence SOP', type: 'text' },
    { name: 'manufacturingDate', label: 'Date de fabrication', type: 'date' },
    { name: 'expiryDate', label: 'Date d\'expiration', type: 'date' },
  ],
}

export function BatchRecordView() {
  const { items, create, update, remove } = useModule('/api/batch-records')
  const { profile } = useAuth()
  return (
    <ModuleShell config={batchConfig} records={items} onCreate={create} onUpdate={update} onDelete={remove}
      onTransition={async (id, target, sigHash) => {
        const patch: any = { status: target }
        if (target === 'Released' && sigHash) {
          patch.qaReleaseDate = new Date().toISOString()
          patch.qaReleasedById = profile?.id
          patch.isLocked = true
        }
        await update(id, patch)
        return { ok: true }
      }}
    />
  )
}

// ============================================================================
// Supplier Module
// ============================================================================
const supplierConfig: ModuleConfig<any> = {
  title: 'Fournisseurs',
  subtitle: 'Évaluation et qualification des fournisseurs (ISO 13485 §7.4)',
  recordTypeSlug: 'supplier', icon: Truck, numberPrefix: 'SUP', numberField: 'supplierCode', statusField: 'status',
  createPermission: 'supplier.create', editPermission: 'supplier.update', deletePermission: 'supplier.delete',
  statusFilters: [
    { value: 'Under Evaluation', label: 'En évaluation' }, { value: 'Conditional', label: 'Conditionnel' },
    { value: 'Qualified', label: 'Qualifié' }, { value: 'Disqualified', label: 'Disqualifié' },
  ],
  typeFilters: { field: 'category', label: 'Catégorie', options: [
    { value: 'Raw Material', label: 'Matière première' }, { value: 'Packaging', label: 'Emballage' },
    { value: 'Equipment', label: 'Équipement' }, { value: 'Service', label: 'Service' },
    { value: 'Contract Manufacturer', label: 'Sous-traitant' }, { value: 'Laboratory', label: 'Laboratoire' },
    { value: 'Other', label: 'Autre' },
  ]},
  fields: [
    { name: 'supplierCode', label: 'Code fournisseur', required: true },
    { name: 'name', label: 'Nom', required: true },
    { name: 'category', label: 'Catégorie', type: 'select', options: [
      { value: 'Raw Material', label: 'Matière première' }, { value: 'Packaging', label: 'Emballage' },
      { value: 'Equipment', label: 'Équipement' }, { value: 'Service', label: 'Service' },
      { value: 'Contract Manufacturer', label: 'Sous-traitant' }, { value: 'Laboratory', label: 'Laboratoire' },
      { value: 'Other', label: 'Autre' },
    ]},
    { name: 'qualificationMethod', label: 'Méthode de qualification', type: 'select', options: [
      { value: 'On-Site Audit', label: 'Audit sur site' }, { value: 'Questionnaire', label: 'Questionnaire' },
      { value: 'Certificate Review', label: 'Revue certificats' }, { value: 'Third-Party Assessment', label: 'Évaluation tierce partie' },
      { value: 'Historical Performance', label: 'Performance historique' },
    ]},
    { name: 'qualificationDate', label: 'Date de qualification', type: 'date' },
    { name: 'nextReviewDate', label: 'Prochaine revue', type: 'date' },
    { name: 'performanceScore', label: 'Score de performance (0-100)', type: 'number' },
    { name: 'primaryContactName', label: 'Contact principal', type: 'text' },
    { name: 'primaryContactEmail', label: 'Email contact', type: 'text' },
    { name: 'primaryContactPhone', label: 'Téléphone contact', type: 'text' },
    { name: 'city', label: 'Ville', type: 'text' },
    { name: 'country', label: 'Pays', type: 'text' },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ],
}

export function SupplierView() {
  const { items, create, update, remove } = useModule('/api/suppliers')
  return (
    <ModuleShell config={supplierConfig} records={items} onCreate={create} onUpdate={update} onDelete={remove}
      onTransition={async (id, target) => { await update(id, { status: target }); return { ok: true } }}
    />
  )
}
