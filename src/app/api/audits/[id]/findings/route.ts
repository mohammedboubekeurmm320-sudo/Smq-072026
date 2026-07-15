// ============================================================
// GET / POST /api/audits/[id]/findings
// GET lists findings for a specific audit
// POST creates a new finding for an audit
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/server-with-context'
import { requireAuth, requirePermission } from '@/lib/auth-server'

function ok(data: any, status = 200) {
  return NextResponse.json({ success: true, data }, { status })
}
function err(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status })
}

const VALID_SEVERITIES = ['Critical', 'Major', 'Minor', 'Observation']

/**
// GET /api/audits/[id]/findings
// List all findings for a specific audit
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
    const { id } = await params

    const { client } = await getAuthenticatedClient(request)
    if (!client) return err('Unauthorized', 401)

    // Verify audit exists
    const { data: audit, error: auditError } = await client
      .from('audits')
      .select('id, title')
      .eq('id', id)
      .single()

    if (auditError || !audit) return err('Audit not found', 404)

    // Findings are stored as JSON in the audit's findings column
    // or as separate records. We support both patterns.
    const { data, error } = await client
      .from('audits')
      .select('findings')
      .eq('id', id)
      .single()

    if (error) return err(error.message)

    const findings = data?.findings
      ? (typeof data.findings === 'string' ? JSON.parse(data.findings) : data.findings)
      : []

    return ok({ auditId: id, findings })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return err('Non authentifié', 401)
    return err(e.message || 'Server error', 500)
  }
}

/**
// POST /api/audits/[id]/findings
// Add a new finding to an audit
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePermission('audit.create')
    const { id } = await params

    const { client } = await getAuthenticatedClient(request)
    if (!client) return err('Unauthorized', 401)

    // Verify audit exists
    const { data: audit, error: auditError } = await client
      .from('audits')
      .select('id, findings')
      .eq('id', id)
      .single()

    if (auditError || !audit) return err('Audit not found', 404)

    const body = await request.json()
    const { description, severity, referenceClause, correctiveActionRequired, capaId } = body as {
      description: string
      severity: string
      referenceClause?: string
      correctiveActionRequired?: boolean
      capaId?: string
    }

    if (!description || typeof description !== 'string') return err('description is required')
    if (!severity || !VALID_SEVERITIES.includes(severity)) {
      return err(`severity must be one of: ${VALID_SEVERITIES.join(', ')}`)
    }

    // Parse existing findings
    const existingFindings = audit.findings
      ? (typeof audit.findings === 'string' ? JSON.parse(audit.findings) : audit.findings)
      : []

    const newFinding = {
      id: crypto.randomUUID(),
      description,
      severity,
      referenceClause: referenceClause || null,
      correctiveActionRequired: correctiveActionRequired ?? true,
      capaId: capaId || null,
      createdAt: new Date().toISOString(),
      createdBy: session.profile.id,
    }

    existingFindings.push(newFinding)

    // Update audit with new findings array
    const { data, error } = await client
      .from('audits')
      .update({ findings: JSON.stringify(existingFindings) })
      .eq('id', id)
      .select()
      .single()

    if (error) return err(error.message)
    return ok({ finding: newFinding }, 201)
  } catch (e: any) {
    if (e.message === 'Non authentifié') return err('Non authentifié', 401)
    if (e.message === 'Permissions insuffisantes') return err('Permissions insuffisantes', 403)
    return err(e.message || 'Server error', 500)
  }
}