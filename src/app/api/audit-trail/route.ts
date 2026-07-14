// ============================================================
// Route API Audit Trail: /api/audit-trail
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { getAuditTrail } from '@/lib/crud-service'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const result = await getAuditTrail(request, {
    entityType: searchParams.get('entity') || undefined,
    recordId: searchParams.get('recordId') || undefined,
    limit: parseInt(searchParams.get('limit') || '50'),
  })

  if (result.error) {
    return NextResponse.json({ success: false, error: result.error }, { status: 500 })
  }
  return NextResponse.json({ success: true, data: result.data })
}