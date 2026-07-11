import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { supabase } from '@/lib/supabase'
import { toCamelCase } from '@/lib/db'
import { getServerSession } from '@/lib/auth-server'
import { apiSuccess, apiError } from '@/lib/api-helpers'

export async function GET() {
  try {
    const session = await getServerSession()
    if (!session) return apiError('Non authentifié', 401)
    const orgId = session.profile.organizationId

    // Fetch the organization record
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single()

    if (orgError || !orgData) return apiError('Organisation introuvable', 404)

    // Count queries for each related table (replaces Prisma _count)
    const countTables = [
      'profiles', 'documents', 'capas', 'non_conformances',
      'deviations', 'change_controls', 'audits', 'risks',
      'training', 'batch_records', 'record_links',
    ]

    const countPromises = countTables.map(table =>
      supabase.from(table).select('id', { count: 'exact', head: true }).eq('organization_id', orgId)
    )

    const countResults = await Promise.all(countPromises)

    const countMap: Record<string, number> = {}
    const tableToModel: Record<string, string> = {
      profiles: 'profiles',
      documents: 'documents',
      capas: 'capas',
      non_conformances: 'nonConformances',
      deviations: 'deviations',
      change_controls: 'changeControls',
      audits: 'audits',
      risks: 'risks',
      training: 'trainings',
      batch_records: 'batchRecords',
      record_links: 'recordLinks',
    }

    countTables.forEach((table, i) => {
      countMap[tableToModel[table]] = countResults[i].count ?? 0
    })

    const org = {
      ...toCamelCase(orgData),
      _count: countMap,
    }

    return apiSuccess({ organization: org })
  } catch (e: any) {
    return apiError(e.message, 500)
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) return apiError('Non authentifié', 401)
    const body = await req.json()
    const { name, settings, ...rest } = body

    const existing = await db.organization.findUnique({ where: { id: session.profile.organizationId } })
    if (!existing) return apiError('Organisation introuvable', 404)

    const updated = await db.organization.update({
      where: { id: session.profile.organizationId },
      data: {
        ...(name !== undefined && { name }),
        ...(settings !== undefined && { settings: typeof settings === 'string' ? settings : JSON.stringify(settings) }),
        ...rest,
      },
    })
    return apiSuccess({ organization: updated })
  } catch (e: any) {
    return apiError(e.message, 500)
  }
}