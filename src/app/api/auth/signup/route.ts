import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, createSession, setSessionCookie } from '@/lib/auth-server'
import { apiSuccess, apiError, logAudit } from '@/lib/api-helpers'
import { INDUSTRY_CONFIG, STANDARDS_BY_INDUSTRY, CORE_MODULES, type IndustryType } from '@/types/qms'

export async function POST(req: NextRequest) {
  try {
    const { email, password, fullName, orgName, industry } = await req.json()
    if (!email || !password || !fullName || !orgName) return apiError('Champs obligatoires manquants', 400)

    const existing = await db.profile.findUnique({ where: { email: String(email).toLowerCase().trim() } })
    if (existing) return apiError('Cet email est déjà utilisé', 409)

    const slug = orgName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    const ind = (industry || 'medical_device') as IndustryType
    const indConfig = INDUSTRY_CONFIG[ind] || INDUSTRY_CONFIG.medical_device
    const settings = {
      setup_completed: true,
      industry_type: ind,
      applicable_standards: STANDARDS_BY_INDUSTRY[ind] || STANDARDS_BY_INDUSTRY.medical_device,
      active_modules: indConfig.recommendedModules,
      company_name: orgName,
      notifications: { capa_overdue: true, ncr_overdue: true, document_expiry: true, training_overdue: true, audit_due: true },
    }

    const org = await db.organization.create({
      data: { name: orgName, slug, settings: JSON.stringify(settings) },
    })
    const profile = await db.profile.create({
      data: {
        email: String(email).toLowerCase().trim(),
        fullName, role: 'admin',
        passwordHash: await hashPassword(password),
        organizationId: org.id,
      },
    })
    await db.organizationMember.create({
      data: { organizationId: org.id, profileId: profile.id, role: 'owner', status: 'active' },
    })

    // Seed system record types for this org
    await seedSystemRecordTypes(org.id, profile.id)

    const token = await createSession(profile.id)
    await setSessionCookie(token)
    await logAudit(org.id, 'CREATE', 'organizations', org.id, profile.id, profile.email, undefined, { name: orgName })
    await logAudit(org.id, 'CREATE', 'profiles', profile.id, profile.id, profile.email)

    return apiSuccess({
      profile: {
        id: profile.id, email: profile.email, fullName: profile.fullName, role: profile.role,
        organizationId: profile.organizationId,
      },
      organization: { id: org.id, name: org.name, slug: org.slug, settings: settings },
    }, 201)
  } catch (e: any) {
    return apiError(e.message || 'Erreur serveur', 500)
  }
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
  const eSig: Record<string, boolean> = { capa: true, ncr: true, deviation: true, change_control: true, audit: true, risk: true, training: true, supplier: true, batch_record: true, oos_oot: true }

  for (const slug of slugs) {
    await db.recordTypeDefinition.create({
      data: {
        slug, name: names[slug], nameEn: slug, icon: 'FileText',
        description: `${names[slug]} (système)`,
        statusFlowJson: JSON.stringify(flows[slug]),
        defaultFieldsJson: '[]',
        complianceRefsJson: JSON.stringify(compliance[slug] || []),
        isSystem: true, isActive: true, requiresEsig: eSig[slug], minApproverCount: 1,
        version: 1, organizationId: orgId, createdById: profileId,
      },
    })
  }
}
