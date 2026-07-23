// ============================================================
// Route API Organizations: /api/organizations
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/server-with-context'
import { getServerSession } from '@/lib/auth-server'

export async function GET() {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const { createClient } = await import('@supabase/supabase-js')
    const client = createClient(supabaseUrl, supabaseKey)

    const orgId = session.profile.organizationId

    const { data: orgData, error } = await client
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single()

    if (error || !orgData) {
      return NextResponse.json({ success: false, error: 'Organisation introuvable' }, { status: 404 })
    }

    // Counts
    const countTables = [
      'profiles', 'documents', 'capas', 'non_conformances',
      'deviations', 'change_controls', 'audits', 'risks',
      'training', 'batch_records',
    ]

    const countResults = await Promise.all(
      countTables.map(table =>
        client.from(table).select('id', { count: 'exact', head: true }).eq('organization_id', orgId)
      )
    )

    const _count: Record<string, number> = {}
    countTables.forEach((table, i) => {
      _count[table] = countResults[i].count ?? 0
    })

    return NextResponse.json({
      success: true,
      data: { organization: { ...orgData, _count } },
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
    }

    const body = await req.json()
    const { name, settings } = body
    const orgId = session.profile.organizationId

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const { createClient } = await import('@supabase/supabase-js')
    const client = createClient(supabaseUrl, supabaseKey)

    const updateData: Record<string, any> = {}
    if (name !== undefined) updateData.name = name
    if (settings !== undefined) updateData.settings = typeof settings === 'string' ? settings : JSON.stringify(settings)

    const { data, error } = await client
      .from('organizations')
      .update(updateData)
      .eq('id', orgId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, data: { organization: data } })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}