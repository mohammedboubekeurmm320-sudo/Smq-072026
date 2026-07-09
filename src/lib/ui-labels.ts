export const LABELS = {
  // Document status
  docStatus: (s: string) => {
    const map: Record<string, string> = {
      DRAFT: 'Brouillon',
      IN_REVIEW: 'En révision',
      APPROVED: 'Approuvé',
      OBSOLETE: 'Obsolète'
    }
    return map[s] || s
  },
  docCategory: (s: string) => {
    const map: Record<string, string> = {
      manual: 'Manuel',
      procedure: 'Procédure',
      instruction: 'Instruction',
      record: 'Enregistrement',
      form: 'Formulaire',
      policy: 'Politique'
    }
    return map[s] || s
  },
  riskStatus: (s: string) => {
    const map: Record<string, string> = {
      IDENTIFIED: 'Identifié',
      ANALYZED: 'Analysé',
      MITIGATED: 'Atténué',
      CLOSED: 'Clôturé'
    }
    return map[s] || s
  },
  auditStatus: (s: string) => {
    const map: Record<string, string> = {
      PLANNED: 'Planifié',
      IN_PROGRESS: 'En cours',
      COMPLETED: 'Terminé',
      CANCELLED: 'Annulé'
    }
    return map[s] || s
  },
  auditType: (s: string) => {
    const map: Record<string, string> = {
      internal: 'Interne',
      external: 'Externe',
      supplier: 'Fournisseur'
    }
    return map[s] || s
  },
  ncStatus: (s: string) => {
    const map: Record<string, string> = {
      OPEN: 'Ouverte',
      INVESTIGATION: 'Investigation',
      ACTION: 'Action',
      CLOSED: 'Clôturée'
    }
    return map[s] || s
  },
  ncSeverity: (s: string) => {
    const map: Record<string, string> = {
      minor: 'Mineure',
      major: 'Majeure',
      critical: 'Critique'
    }
    return map[s] || s
  },
  ncSource: (s: string) => {
    const map: Record<string, string> = {
      internal_audit: 'Audit interne',
      external_audit: 'Audit externe',
      customer_complaint: 'Réclamation client',
      supplier: 'Fournisseur',
      process: 'Processus'
    }
    return map[s] || s
  },
  capaStatus: (s: string) => {
    const map: Record<string, string> = {
      OPEN: 'Ouverte',
      IN_PROGRESS: 'En cours',
      COMPLETED: 'Terminée',
      VERIFIED: 'Vérifiée'
    }
    return map[s] || s
  },
  capaType: (s: string) => {
    const map: Record<string, string> = {
      CORRECTIVE: 'Corrective',
      PREVENTIVE: 'Préventive'
    }
    return map[s] || s
  },
  trainingStatus: (s: string) => {
    const map: Record<string, string> = {
      PLANNED: 'Planifiée',
      IN_PROGRESS: 'En cours',
      COMPLETED: 'Terminée'
    }
    return map[s] || s
  },
  trainingCategory: (s: string) => {
    const map: Record<string, string> = {
      quality: 'Qualité',
      technical: 'Technique',
      regulatory: 'Réglementaire',
      safety: 'Sécurité'
    }
    return map[s] || s
  },
  supplierEvaluation: (s: string) => {
    const map: Record<string, string> = {
      PENDING: 'En attente',
      APPROVED: 'Approuvé',
      CONDITIONAL: 'Conditionnel',
      REJECTED: 'Rejeté'
    }
    return map[s] || s
  },
  supplierRisk: (s: string) => {
    const map: Record<string, string> = {
      low: 'Faible',
      medium: 'Moyen',
      high: 'Élevé'
    }
    return map[s] || s
  },
  processType: (s: string) => {
    const map: Record<string, string> = {
      core: 'Cœur de métier',
      support: 'Support',
      management: 'Management'
    }
    return map[s] || s
  },
  role: (s: string) => {
    const map: Record<string, string> = {
      SUPER_ADMIN: 'Super Administrateur',
      ADMIN: 'Administrateur',
      QUALITY_MANAGER: 'Responsable Qualité',
      ENGINEER: 'Ingénieur',
      AUDITOR: 'Auditeur',
      VIEWER: 'Observateur'
    }
    return map[s] || s
  }
}

export function fmtDate(d?: string | null): string {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return '—'
  }
}

export function fmtDateTime(d?: string | null): string {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return '—'
  }
}

export function rpnLevel(rpn: number): { label: string; color: string; bg: string } {
  if (rpn >= 80) return { label: 'Élevé', color: 'text-red-700', bg: 'bg-red-100 border-red-200' }
  if (rpn >= 30) return { label: 'Moyen', color: 'text-amber-700', bg: 'bg-amber-100 border-amber-200' }
  return { label: 'Faible', color: 'text-green-700', bg: 'bg-green-100 border-green-200' }
}

export function statusBadge(s: string): string {
  const map: Record<string, string> = {
    DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
    IN_REVIEW: 'bg-amber-100 text-amber-700 border-amber-200',
    APPROVED: 'bg-green-100 text-green-700 border-green-200',
    OBSOLETE: 'bg-red-100 text-red-700 border-red-200',
    IDENTIFIED: 'bg-slate-100 text-slate-700 border-slate-200',
    ANALYZED: 'bg-amber-100 text-amber-700 border-amber-200',
    MITIGATED: 'bg-blue-100 text-blue-700 border-blue-200',
    CLOSED: 'bg-green-100 text-green-700 border-green-200',
    PLANNED: 'bg-slate-100 text-slate-700 border-slate-200',
    IN_PROGRESS: 'bg-blue-100 text-blue-700 border-blue-200',
    COMPLETED: 'bg-green-100 text-green-700 border-green-200',
    CANCELLED: 'bg-red-100 text-red-700 border-red-200',
    OPEN: 'bg-red-100 text-red-700 border-red-200',
    INVESTIGATION: 'bg-amber-100 text-amber-700 border-amber-200',
    ACTION: 'bg-blue-100 text-blue-700 border-blue-200',
    VERIFIED: 'bg-green-100 text-green-700 border-green-200',
    PENDING: 'bg-amber-100 text-amber-700 border-amber-200',
    APPROVED_supply: 'bg-green-100 text-green-700 border-green-200',
    CONDITIONAL: 'bg-amber-100 text-amber-700 border-amber-200',
    REJECTED: 'bg-red-100 text-red-700 border-red-200'
  }
  return map[s] || 'bg-slate-100 text-slate-700 border-slate-200'
}
