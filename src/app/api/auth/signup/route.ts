// ============================================================
// SIGNUP API: Créer un compte organisation + profil admin
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { hashPassword } from '@/lib/auth-server'
import { signSession } from '@/lib/session'
import { INDUSTRY_CONFIG, STANDARDS_BY_INDUSTRY, type IndustryType } from '@/types/qms'
import { randomUUID } from 'crypto'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(req: NextRequest) {
  try {
    const { email, password, fullName, orgName, industry } = await req.json()
    if (!email || !password || !fullName || !orgName) {
      return NextResponse.json({ success: false, error: 'Champs obligatoires manquants' }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Vérifier email unique
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (existing) {
      return NextResponse.json({ success: false, error: 'Cet email est déjà utilisé' }, { status: 409 })
    }

    // Créer l'organisation
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

    const orgId = randomUUID()
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({ id: orgId, name: orgName, slug, settings: JSON.stringify(settings), updated_at: new Date().toISOString() })
      .select()
      .single()

    if (orgError) {
      return NextResponse.json({ success: false, error: orgError.message }, { status: 500 })
    }

    // Créer le profil admin
    const passwordHash = await hashPassword(password)
    const profileId = randomUUID()
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: profileId,
        email: email.toLowerCase().trim(),
        full_name: fullName,
        role: 'admin',
        password_hash: passwordHash,
        organization_id: org.id,
        active: true,
        updated_at: new Date().toISOString(),
      })
      .select('id, email, full_name, role, organization_id')
      .single()

    if (profileError) {
      // Rollback: supprimer l'org
      await supabase.from('organizations').delete().eq('id', org.id)
      return NextResponse.json({ success: false, error: profileError.message }, { status: 500 })
    }

    // Ajouter le membership
    await supabase.from('organization_members').insert({
      id: randomUUID(),
      organization_id: org.id,
      user_id: profile.id,
      role: 'owner',
      status: 'active',
    })

    // Créer la session en base pour révocation
    const { data: sessionRow } = await supabase
      .from('sessions')
      .insert({
        id: randomUUID(),
        profile_id: profile.id,
        user_agent: req.headers.get('user-agent') || null,
        ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      .select('id')
      .single()

    const sessionToken = await signSession({
      sub: profile.id,
      email: profile.email,
      name: profile.full_name,
      organizationId: org.id,
      role: 'admin',
      sid: sessionRow?.id,
    })

    // Seed system record types
    await seedSystemRecordTypes(supabase, org.id, profile.id)

    const response = NextResponse.json({
      success: true,
      data: {
        profile: {
          id: profile.id, email: profile.email, full_name: profile.full_name,
          role: profile.role, organization_id: profile.organization_id,
        },
        organization: { id: org.id, name: org.name, slug: org.slug },
      },
    }, { status: 201 })

    response.cookies.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24,
    })
    response.cookies.set('current_org_id', org.id, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    })

    return response
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message || 'Erreur serveur' }, { status: 500 })
  }
}

async function seedSystemRecordTypes(supabase: any, orgId: string, profileId: string) {
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

  const rows = slugs.map(slug => ({
    id: randomUUID(),
    slug, name: names[slug], name_en: slug, icon: 'FileText',
    description: `${names[slug]} (système)`,
    status_flow_json: JSON.stringify(flows[slug]),
    default_fields_json: '[]',
    compliance_refs_json: JSON.stringify(compliance[slug] || []),
    is_system: true, is_active: true, requires_esig: eSig[slug], min_approver_count: 1,
    version: 1, organization_id: orgId, created_by: profileId,
  }))

  await supabase.from('record_type_definitions').insert(rows)
}