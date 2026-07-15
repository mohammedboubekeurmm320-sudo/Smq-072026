// ============================================================
// GET /api/export/management-review
// Export management review data as HTML report
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/server-with-context'
import { requireAuth, requirePermission } from '@/lib/auth-server'

function err(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status })
}

/**
 * GET /api/export/management-review?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Export management review data as an HTML report
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requirePermission('reports.export')

    const { client } = await getAuthenticatedClient(request)
    if (!client) return err('Unauthorized', 401)

    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    // Fetch org info
    const orgId = session.profile.organizationId
    const { data: org } = await client
      .from('organizations')
      .select('name, settings')
      .eq('id', orgId)
      .single()

    // Fetch summary data in parallel
    const [docRes, capaRes, ncrRes, devRes, ccRes, auditRes, trainRes, riskRes] = await Promise.all([
      client.from('documents').select('id, status, doc_type, created_at').order('created_at', { ascending: false }).limit(5000),
      client.from('capas').select('id, status, priority, source, created_at, due_date').order('created_at', { ascending: false }).limit(5000),
      client.from('non_conformances').select('id, status, severity, created_at').order('created_at', { ascending: false }).limit(5000),
      client.from('deviations').select('id, status, category, created_at').order('created_at', { ascending: false }).limit(5000),
      client.from('change_controls').select('id, status, category, created_at').order('created_at', { ascending: false }).limit(5000),
      client.from('audits').select('id, status, audit_type, created_at').order('created_at', { ascending: false }).limit(5000),
      client.from('training').select('id, status, training_type, created_at').order('created_at', { ascending: false }).limit(5000),
      client.from('risks').select('id, status, risk_level, rpn, created_at').order('created_at', { ascending: false }).limit(5000),
    ])

    // Build HTML report
    const now = new Date().toLocaleString('fr-FR')
    const orgName = org?.name || 'Organization'
    const periodText = from && to ? `${from} to ${to}` : 'All time'

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Management Review Report - ${orgName}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
    h1 { color: #1a1a1a; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
    h2 { color: #374151; margin-top: 30px; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { border: 1px solid #d1d5db; padding: 8px 12px; text-align: left; }
    th { background-color: #f3f4f6; font-weight: 600; }
    .summary-card { display: inline-block; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px 24px; margin: 8px; }
    .summary-card h3 { margin: 0 0 4px; color: #6b7280; font-size: 12px; text-transform: uppercase; }
    .summary-card .value { font-size: 28px; font-weight: 700; color: #111827; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; }
    .header-right { text-align: right; color: #6b7280; }
    .status-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; }
    .status-open { background: #fef3c7; color: #92400e; }
    .status-closed { background: #d1fae5; color: #065f46; }
    .status-in-progress { background: #dbeafe; color: #1e40af; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Management Review Report</h1>
    <div class="header-right">
      <strong>${orgName}</strong><br>
      Period: ${periodText}<br>
      Generated: ${now}
    </div>
  </div>

  <h2>Executive Summary</h2>
  <div>
    <div class="summary-card">
      <h3>Documents</h3>
      <div class="value">${docRes.data?.length ?? 0}</div>
    </div>
    <div class="summary-card">
      <h3>CAPAs</h3>
      <div class="value">${capaRes.data?.length ?? 0}</div>
    </div>
    <div class="summary-card">
      <h3>NCRs</h3>
      <div class="value">${ncrRes.data?.length ?? 0}</div>
    </div>
    <div class="summary-card">
      <h3>Audits</h3>
      <div class="value">${auditRes.data?.length ?? 0}</div>
    </div>
    <div class="summary-card">
      <h3>Training</h3>
      <div class="value">${trainRes.data?.length ?? 0}</div>
    </div>
    <div class="summary-card">
      <h3>Risks</h3>
      <div class="value">${riskRes.data?.length ?? 0}</div>
    </div>
  </div>

  <h2>CAPA Status Breakdown</h2>
  <table>
    <thead><tr><th>Status</th><th>Count</th></tr></thead>
    <tbody>
      ${['Open', 'Investigation', 'Implementation', 'Effectiveness Check', 'Closed'].map(s => {
        const count = capaRes.data?.filter((c: any) => c.status === s).length ?? 0
        return `<tr><td>${s}</td><td>${count}</td></tr>`
      }).join('\n      ')}
    </tbody>
  </table>

  <h2>Non-Conformances by Severity</h2>
  <table>
    <thead><tr><th>Severity</th><th>Open</th><th>Closed</th><th>Total</th></tr></thead>
    <tbody>
      ${['Critical', 'Major', 'Minor'].map(s => {
        const all = ncrRes.data?.filter((n: any) => n.severity === s) ?? []
        const open = all.filter((n: any) => n.status !== 'Closed').length
        return `<tr><td>${s}</td><td>${open}</td><td>${all.length - open}</td><td>${all.length}</td></tr>`
      }).join('\n      ')}
    </tbody>
  </table>

  <h2>Deviation Categories</h2>
  <table>
    <thead><tr><th>Category</th><th>Count</th></tr></thead>
    <tbody>
      ${['Process', 'Equipment', 'Material', 'Environment', 'Personnel', 'Documentation'].map(c => {
        const count = devRes.data?.filter((d: any) => d.category === c).length ?? 0
        return `<tr><td>${c}</td><td>${count}</td></tr>`
      }).join('\n      ')}
    </tbody>
  </table>

  <h2>Change Control Status</h2>
  <table>
    <thead><tr><th>Status</th><th>Count</th></tr></thead>
    <tbody>
      ${['Requested', 'Under Review', 'Approved', 'In Implementation', 'Completed', 'Rejected'].map(s => {
        const count = ccRes.data?.filter((c: any) => c.status === s).length ?? 0
        return `<tr><td>${s}</td><td>${count}</td></tr>`
      }).join('\n      ')}
    </tbody>
  </table>

  <h2>Risk Summary</h2>
  <table>
    <thead><tr><th>Level</th><th>Count</th></tr></thead>
    <tbody>
      ${['Critical', 'High', 'Medium', 'Low'].map(l => {
        const count = riskRes.data?.filter((r: any) => r.risk_level === l).length ?? 0
        return `<tr><td>${l}</td><td>${count}</td></tr>`
      }).join('\n      ')}
    </tbody>
  </table>

  <hr style="margin-top: 40px;">
  <p style="color: #9ca3af; font-size: 12px;">
    This report was generated automatically by the QMS Management Review module.
    Confidential - For internal use only.
  </p>
</body>
</html>`

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="management_review_${new Date().toISOString().slice(0, 10)}.html"`,
      },
    })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return err('Non authentifié', 401)
    if (e.message === 'Permissions insuffisantes') return err('Permissions insuffisantes', 403)
    return err(e.message || 'Server error', 500)
  }
}