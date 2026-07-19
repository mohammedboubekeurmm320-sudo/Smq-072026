// ============================================================
// POST /api/reports/generate
// Generates real QMS reports (PDF, CSV, HTML) from live data
// ISO 13485 §4.2.2 — Quality records generation
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth-server'
import { generateReportData, type ReportType } from '@/lib/report-generators'
import { generatePdf, generateCsv, generateHtml } from '@/lib/pdf-generator'

const VALID_REPORT_TYPES: ReportType[] = [
  'capa-analysis',
  'ncr-trends',
  'audit-summary',
  'training-matrix',
  'risk-register',
  'supplier-scorecard',
  'compliance-dashboard',
]

const VALID_FORMATS = ['pdf', 'csv', 'html'] as const

function err(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status })
}

export async function POST(request: NextRequest) {
  try {
    // Auth + permission check
    const session = await requirePermission('reports.export')

    const body = await request.json()
    const { type, dateFrom, dateTo, format = 'pdf' } = body

    // Validate report type
    if (!type || !VALID_REPORT_TYPES.includes(type)) {
      return err(`Type de rapport invalide. Types disponibles : ${VALID_REPORT_TYPES.join(', ')}`)
    }

    // Validate format
    if (!VALID_FORMATS.includes(format)) {
      return err(`Format invalide. Formats disponibles : ${VALID_FORMATS.join(', ')}`)
    }

    // Generate report data from live QMS database
    const reportData = await generateReportData(request, {
      type: type as ReportType,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      format: format as 'pdf' | 'csv' | 'html',
    })

    const timestamp = new Date().toISOString().slice(0, 10)
    const safeName = type.replace(/[^a-z0-9-]/gi, '_')

    // Generate output in requested format
    switch (format) {
      case 'pdf': {
        const pdfBuffer = generatePdf(type as ReportType, reportData)
        return new NextResponse(pdfBuffer, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="rapport_${safeName}_${timestamp}.pdf"`,
            'Content-Length': String(pdfBuffer.length),
          },
        })
      }

      case 'csv': {
        const csvContent = generateCsv(reportData, type as ReportType)
        const csvBuffer = Buffer.from(csvContent, 'utf-8')
        return new NextResponse(csvBuffer, {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="rapport_${safeName}_${timestamp}.csv"`,
            'Content-Length': String(csvBuffer.length),
          },
        })
      }

      case 'html': {
        const htmlContent = generateHtml(reportData, type as ReportType)
        const htmlBuffer = Buffer.from(htmlContent, 'utf-8')
        return new NextResponse(htmlBuffer, {
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Content-Disposition': `attachment; filename="rapport_${safeName}_${timestamp}.html"`,
            'Content-Length': String(htmlBuffer.length),
          },
        })
      }

      default:
        return err('Format non supporté')
    }
  } catch (e: any) {
    if (e.message === 'Non authentifié') return err('Non authentifié', 401)
    if (e.message === 'Permissions insuffisantes') return err('Permissions insuffisantes', 403)
    console.error('Report generation error:', e)
    return err(e.message || 'Erreur lors de la génération du rapport', 500)
  }
}