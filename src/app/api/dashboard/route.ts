// ============================================================
// Route API Dashboard: /api/dashboard
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { getDashboardKPIs, getDeadlines } from '@/lib/crud-service'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const view = searchParams.get('view') || 'kpi'

  if (view === 'deadlines') {
    const days = parseInt(searchParams.get('days') || '7')
    const result = await getDeadlines(request, days)
    if (result.error) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 })
    }
    return NextResponse.json({ success: true, data: result.data })
  }

  const result = await getDashboardKPIs(request)
  if (result.error) {
    return NextResponse.json({ success: false, error: result.error }, { status: 500 })
  }
  return NextResponse.json({ success: true, data: result.data })
}