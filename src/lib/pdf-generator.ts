// ============================================================
// PDF Generator for QMS Reports — pdfkit-based
// Generates professional ISO 13485 compliant report PDFs
// ============================================================

import PDFDocument from 'pdfkit'
import type { ReportType } from './report-generators'

// ─── Colors ─────────────────────────────────────────────────────────────────

const COLORS = {
  primary: '#1e3a5f',      // Dark navy
  secondary: '#2563eb',    // Blue accent
  success: '#16a34a',
  warning: '#d97706',
  danger: '#dc2626',
  text: '#1f2937',
  textLight: '#6b7280',
  border: '#e5e7eb',
  bgLight: '#f9fafb',
  bgBlue: '#eff6ff',
  white: '#ffffff',
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface ReportData {
  title: string
  subtitle: string
  generatedAt: string
  summary?: Record<string, any>
  [key: string]: any
}

// ─── Main generator ─────────────────────────────────────────────────────────

export function generatePdf(reportType: ReportType, data: ReportData): Buffer {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
    info: {
      Title: data.title,
      Author: 'SMQ ISO 13485 — Rapport qualité',
      Subject: `Rapport ${reportType}`,
      CreationDate: new Date(),
    },
  })

  const buffers: Buffer[] = []
  doc.on('data', (chunk: Buffer) => buffers.push(chunk))

  renderCover(doc, data, reportType)
  doc.addPage()

  if (data.summary) {
    renderSummary(doc, data.summary, reportType)
  }

  if (data.entityStats) {
    renderComplianceTable(doc, data)
  }

  // Render distribution/breakdown tables
  for (const key of Object.keys(data)) {
    if (['title', 'subtitle', 'generatedAt', 'summary', 'items', 'entityStats', 'overallScore'].includes(key)) continue
    if (typeof data[key] === 'object' && !Array.isArray(data[key])) {
      renderBreakdownTable(doc, key, data[key] as Record<string, number>)
    }
  }

  // Render detail items table
  if (data.items && Array.isArray(data.items) && data.items.length > 0) {
    doc.addPage()
    renderItemsTable(doc, data.items, reportType)
  }

  // Footer on every page
  const pages = doc.bufferedPageRange()
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i)
    doc.save()
    doc.fontSize(7).fillColor(COLORS.textLight)
    doc.text(
      `SMQ ISO 13485 — ${data.title} — Page ${i + 1} / ${pages.count}`,
      50, doc.page.height - 35,
      { align: 'center', width: doc.page.width - 100 }
    )
    doc.text(
      `Généré le ${new Date(data.generatedAt).toLocaleDateString('fr-FR')} à ${new Date(data.generatedAt).toLocaleTimeString('fr-FR')}`,
      50, doc.page.height - 25,
      { align: 'center', width: doc.page.width - 100 }
    )
    doc.restore()
  }

  doc.end()

  return Buffer.concat(buffers)
}

// ─── Cover Page ─────────────────────────────────────────────────────────────

function renderCover(doc: PDFDocument, data: ReportData, reportType: ReportType) {
  const w = doc.page.width
  const h = doc.page.height

  // Background
  doc.rect(0, 0, w, h).fill(COLORS.primary)

  // White accent bar
  doc.rect(0, h * 0.42, w, 4).fill(COLORS.secondary)

  // Title block
  doc.fontSize(11).fillColor('#94a3b8').text('SMQ ISO 13485 — Rapport qualité', 50, h * 0.25, { align: 'center', width: w - 100 })
  doc.fontSize(28).fillColor(COLORS.white).text(data.title, 50, h * 0.30, { align: 'center', width: w - 100 })
  doc.fontSize(12).fillColor('#94a3b8').text(data.subtitle, 50, h * 0.38, { align: 'center', width: w - 100 })

  // Info block
  const infoY = h * 0.55
  doc.fontSize(10).fillColor(COLORS.white)

  const labels: [string, string][] = [
    ['Type de rapport', REPORT_LABELS[reportType] || reportType],
    ['Date de génération', new Date(data.generatedAt).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })],
    ['Heure de génération', new Date(data.generatedAt).toLocaleTimeString('fr-FR')],
    ['Norme de référence', 'ISO 13485:2016 / ICH Q10 / IVDR EU 2017/746'],
    ['Classification', 'Confidentiel — Usage interne'],
  ]

  labels.forEach(([label, value], i) => {
    const y = infoY + i * 22
    doc.fontSize(9).fillColor('#94a3b8').text(label + ' :', 60, y, { continued: true })
    doc.fillColor(COLORS.white).text('  ' + value)
  })

  // Bottom disclaimer
  doc.fontSize(7).fillColor('#64748b')
  doc.text('Ce rapport a été généré automatiquement par le Système de Management de la Qualité (SMQ). Il est conforme aux exigences de la norme ISO 13485:2016 §4.2.2 (maîtrise des enregistrements qualité) et au 21 CFR Part 11 (signatures électroniques).', 50, h - 80, { align: 'center', width: w - 100 })
}

// ─── Summary Section ────────────────────────────────────────────────────────

function renderSummary(doc: PDFDocument, summary: Record<string, any>, reportType: ReportType) {
  doc.fontSize(16).fillColor(COLORS.primary).text('Résumé', { underline: false })
  doc.moveDown(0.5)

  // Summary KPIs in a grid
  const kpis = Object.entries(summary)
    .filter(([, v]) => typeof v === 'number' || typeof v === 'string')
    .map(([k, v]) => ({ key: formatKey(k), value: String(v) }))

  // 2-column grid of KPI cards
  const cardW = (doc.page.width - 100 - 16) / 2
  const cardH = 36
  let x = 0
  let y = doc.y

  kpis.forEach((kpi, i) => {
    if (i > 0 && i % 2 === 0) {
      x = 0
      y += cardH + 8
    }

    // Card background
    const cx = 50 + x * (cardW + 16)
    doc.roundedRect(cx, y, cardW, cardH, 4).fill(COLORS.bgLight)
    doc.roundedRect(cx, y, 4, cardH, 2).fill(COLORS.secondary)

    doc.fontSize(8).fillColor(COLORS.textLight).text(kpi.key, cx + 12, y + 6, { width: cardW - 20 })
    doc.fontSize(14).fillColor(COLORS.primary).text(kpi.value, cx + 12, y + 18, { width: cardW - 20 })

    x++
  })

  doc.y = y + cardH + 20
}

// ─── Breakdown table (byType, byDepartment, etc.) ───────────────────────────

function renderBreakdownTable(doc: PDFDocument, label: string, data: Record<string, number>) {
  if (doc.y > doc.page.height - 200) doc.addPage()

  doc.moveDown(0.5)
  doc.fontSize(13).fillColor(COLORS.primary).text(`Répartition par ${formatKey(label)}`)
  doc.moveDown(0.3)

  const entries = Object.entries(data).sort((a, b) => b[1] - a[1])
  const tableX = 50
  const col1W = 300
  const col2W = 100
  const rowH = 22

  // Header
  doc.rect(tableX, doc.y, col1W + col2W, rowH).fill(COLORS.primary)
  doc.fontSize(9).fillColor(COLORS.white)
  doc.text(formatKey(label), tableX + 8, doc.y + 6, { width: col1W })
  doc.text('Nombre', tableX + col1W + 8, doc.y + 6, { width: col2W })
  doc.y += rowH

  // Rows
  entries.forEach(([key, val], i) => {
    if (doc.y > doc.page.height - 80) doc.addPage()
    const ry = doc.y
    const bg = i % 2 === 0 ? COLORS.white : COLORS.bgLight
    doc.rect(tableX, ry, col1W + col2W, rowH).fill(bg)
    doc.fontSize(9).fillColor(COLORS.text).text(String(key), tableX + 8, ry + 6, { width: col1W })
    doc.text(String(val), tableX + col1W + 8, ry + 6, { width: col2W })
    doc.y = ry + rowH
  })

  doc.moveDown(1)
}

// ─── Compliance entity table ────────────────────────────────────────────────

function renderComplianceTable(doc: PDFDocument, data: ReportData) {
  doc.fontSize(16).fillColor(COLORS.primary).text('Score de conformité par module')
  doc.moveDown(0.3)

  if (data.overallScore !== null && data.overallScore !== undefined) {
    doc.fontSize(10).fillColor(COLORS.textLight).text(`Score global pondéré : `, { continued: true })
    doc.fontSize(14).fillColor(
      data.overallScore >= 80 ? COLORS.success : data.overallScore >= 50 ? COLORS.warning : COLORS.danger
    ).text(`${data.overallScore}%`)
    doc.moveDown(0.5)
  }

  const tableX = 50
  const colW = [150, 80, 80, 80, 80]
  const rowH = 24
  const totalW = colW.reduce((a, b) => a + b, 0)

  // Header
  let hx = tableX
  doc.rect(tableX, doc.y, totalW, rowH).fill(COLORS.primary)
  const hy = doc.y
  const headers = ['Module', 'Total', 'Conforme', 'Taux', 'Statut']
  headers.forEach((h, i) => {
    doc.fontSize(9).fillColor(COLORS.white).text(h, hx + 8, hy + 7, { width: colW[i] - 16 })
    hx += colW[i]
  })
  doc.y = hy + rowH

  // Rows
  if (data.entityStats) {
    (data.entityStats as any[]).forEach((row: any, i: number) => {
      if (doc.y > doc.page.height - 80) doc.addPage()
      const ry = doc.y
      const bg = i % 2 === 0 ? COLORS.white : COLORS.bgLight
      doc.rect(tableX, ry, totalW, rowH).fill(bg)

      const pct = row.total > 0 ? Math.round((row.ok / row.total) * 100) : 100
      const statusColor = pct >= 80 ? COLORS.success : pct >= 50 ? COLORS.warning : COLORS.danger
      const statusText = pct >= 80 ? 'Conforme' : pct >= 50 ? 'Partiel' : 'Non conforme'

      const values = [row.module, String(row.total), String(row.ok), `${pct}%`, statusText]
      let cx = tableX
      values.forEach((v, j) => {
        doc.fontSize(9).fillColor(j === 4 ? statusColor : COLORS.text)
          .text(v, cx + 8, ry + 7, { width: colW[j] - 16 })
        cx += colW[j]
      })
      doc.y = ry + rowH
    })
  }

  doc.moveDown(1)
}

// ─── Detail Items Table ─────────────────────────────────────────────────────

function renderItemsTable(doc: PDFDocument, items: Record<string, string>[], reportType: ReportType) {
  doc.fontSize(16).fillColor(COLORS.primary).text('Détail des enregistrements')
  doc.moveDown(0.5)

  if (items.length === 0) {
    doc.fontSize(10).fillColor(COLORS.textLight).text('Aucun enregistrement trouvé pour cette période.')
    return
  }

  const columns = getColumnsForReport(reportType)
  const tableX = 50
  const pageW = doc.page.width - 100
  const colCount = columns.length
  const colW = columns.map(c => c.width || Math.floor(pageW / colCount))
  const totalW = colW.reduce((a, b) => a + b, 0)
  const rowH = 20

  // Header
  let hx = tableX
  doc.rect(tableX, doc.y, totalW, rowH).fill(COLORS.primary)
  const hy = doc.y
  columns.forEach((col, i) => {
    doc.fontSize(7.5).fillColor(COLORS.white).text(col.label, hx + 4, hy + 5, { width: colW[i] - 8 })
    hx += colW[i]
  })
  doc.y = hy + rowH

  // Rows
  items.forEach((item, idx) => {
    if (doc.y > doc.page.height - 80) {
      doc.addPage()
      // Re-draw header on new page
      hx = tableX
      doc.rect(tableX, doc.y, totalW, rowH).fill(COLORS.primary)
      const nhy = doc.y
      columns.forEach((col, i) => {
        doc.fontSize(7.5).fillColor(COLORS.white).text(col.label, hx + 4, nhy + 5, { width: colW[i] - 8 })
        hx += colW[i]
      })
      doc.y = nhy + rowH
    }

    const ry = doc.y
    const bg = idx % 2 === 0 ? COLORS.white : COLORS.bgLight
    doc.rect(tableX, ry, totalW, rowH).fill(bg)

    // Bottom border
    doc.moveTo(tableX, ry + rowH).lineTo(tableX + totalW, ry + rowH)
      .strokeColor(COLORS.border).lineWidth(0.5).stroke()

    let cx = tableX
    columns.forEach((col, i) => {
      const val = String(item[col.key] || '—')
      let color = COLORS.text
      // Color code status
      if (col.key === 'statut' || col.key === 'niveau') {
        if (['Closed', 'Completed', 'Qualified', 'Effective', 'Released', 'Mitigated'].includes(val)) color = COLORS.success
        else if (['Open', 'Overdue'].includes(val)) color = COLORS.danger
        else if (['In Progress', 'Under Review'].includes(val)) color = COLORS.warning
      }
      if (col.key === 'sévérité' && val === 'Critical') color = COLORS.danger
      if (col.key === 'RPN') {
        const num = parseInt(val)
        if (num >= 200) color = COLORS.danger
        else if (num >= 100) color = COLORS.warning
        else color = COLORS.success
      }
      doc.fontSize(7).fillColor(color).text(val, cx + 4, ry + 5, { width: colW[i] - 8, lineBreak: false, ellipsis: true })
      cx += colW[i]
    })
    doc.y = ry + rowH
  })
}

// ─── Column definitions per report type ─────────────────────────────────────

interface ColumnDef {
  key: string
  label: string
  width?: number
}

function getColumnsForReport(type: ReportType): ColumnDef[] {
  const base = (columns: ColumnDef[]) => {
    const pageW = 495
    const total = columns.reduce((s, c) => s + (c.width || 0), 0)
    const unassigned = columns.filter(c => !c.width)
    const assignedW = total - unassigned.reduce((s) => s, 0)
    // We can't use reduce that way, just distribute evenly
    return columns
  }

  switch (type) {
    case 'capa-analysis':
      return [
        { key: 'ref', label: 'Réf.', width: 70 },
        { key: 'titre', label: 'Titre', width: 120 },
        { key: 'type', label: 'Type', width: 55 },
        { key: 'priorité', label: 'Priorité', width: 55 },
        { key: 'statut', label: 'Statut', width: 55 },
        { key: 'cause_racine', label: 'Cause racine', width: 90 },
        { key: 'échéance', label: 'Échéance', width: 50 },
      ]
    case 'ncr-trends':
      return [
        { key: 'ref', label: 'Réf.', width: 70 },
        { key: 'titre', label: 'Titre', width: 120 },
        { key: 'sévérité', label: 'Sév.', width: 50 },
        { key: 'département', label: 'Dépt.', width: 70 },
        { key: 'disposition', label: 'Disposition', width: 70 },
        { key: 'statut', label: 'Statut', width: 55 },
        { key: 'échéance', label: 'Échéance', width: 60 },
      ]
    case 'audit-summary':
      return [
        { key: 'ref', label: 'Réf.', width: 70 },
        { key: 'titre', label: 'Titre', width: 130 },
        { key: 'type', label: 'Type', width: 60 },
        { key: 'statut', label: 'Statut', width: 65 },
        { key: 'date_planifiée', label: 'Planifié', width: 75 },
        { key: 'auditeur', label: 'Auditeur', width: 95 },
      ]
    case 'training-matrix':
      return [
        { key: 'ref', label: 'Réf.', width: 70 },
        { key: 'titre', label: 'Titre', width: 120 },
        { key: 'type', label: 'Type', width: 65 },
        { key: 'formateur', label: 'Formateur', width: 80 },
        { key: 'statut', label: 'Statut', width: 60 },
        { key: 'score_efficacité', label: 'Score', width: 50 },
        { key: 'date_échéance', label: 'Échéance', width: 50 },
      ]
    case 'risk-register':
      return [
        { key: 'ref', label: 'Réf.', width: 60 },
        { key: 'titre', label: 'Titre', width: 110 },
        { key: 'catégorie', label: 'Catégorie', width: 65 },
        { key: 'RPN', label: 'RPN', width: 35 },
        { key: 'niveau', label: 'Niveau', width: 50 },
        { key: 'statut', label: 'Statut', width: 65 },
        { key: 'date_création', label: 'Créé le', width: 60 },
      ]
    case 'supplier-scorecard':
      return [
        { key: 'nom', label: 'Fournisseur', width: 100 },
        { key: 'catégorie', label: 'Catégorie', width: 65 },
        { key: 'statut', label: 'Statut', width: 65 },
        { key: 'note_qualité', label: 'Qualité', width: 50 },
        { key: 'note_livraison', label: 'Livraison', width: 55 },
        { key: 'note_globale', label: 'Globale', width: 55 },
        { key: 'date_évaluation', label: 'Éval.', width: 60 },
      ]
    default:
      return [
        { key: 'ref', label: 'Réf.', width: 100 },
        { key: 'titre', label: 'Titre', width: 200 },
        { key: 'statut', label: 'Statut', width: 100 },
        { key: 'créé_le', label: 'Date', width: 95 },
      ]
  }
}

// ─── CSV Generator ──────────────────────────────────────────────────────────

export function generateCsv(reportData: ReportData, reportType: ReportType): string {
  const lines: string[] = []

  // Header comment
  lines.push(`# ${reportData.title}`)
  lines.push(`# ${reportData.subtitle}`)
  lines.push(`# Généré le ${new Date(reportData.generatedAt).toLocaleString('fr-FR')}`)
  lines.push('')

  // Summary section
  if (reportData.summary) {
    lines.push('=== RÉSUMÉ ===')
    for (const [k, v] of Object.entries(reportData.summary)) {
      lines.push(`${formatKey(k)};${v}`)
    }
    lines.push('')
  }

  // Breakdown sections
  for (const key of Object.keys(reportData)) {
    if (['title', 'subtitle', 'generatedAt', 'summary', 'items', 'entityStats', 'overallScore'].includes(key)) continue
    if (typeof reportData[key] === 'object' && !Array.isArray(reportData[key])) {
      lines.push(`=== RÉPARTITION PAR ${formatKey(key).toUpperCase()} ===`)
      for (const [k, v] of Object.entries(reportData[key] as Record<string, number>)) {
        lines.push(`${k};${v}`)
      }
      lines.push('')
    }
  }

  // Items table
  if (reportData.items && Array.isArray(reportData.items) && reportData.items.length > 0) {
    const columns = getColumnsForReport(reportType)
    lines.push('=== DÉTAIL ===')
    lines.push(columns.map(c => c.label).join(';'))
    for (const item of reportData.items) {
      lines.push(columns.map(c => {
        const val = String(item[c.key] || '')
        return val.includes(';') || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val
      }).join(';'))
    }
  }

  return lines.join('\n')
}

// ─── HTML Generator ─────────────────────────────────────────────────────────

export function generateHtml(reportData: ReportData, reportType: ReportType): string {
  const columns = getColumnsForReport(reportType)

  let summaryHtml = ''
  if (reportData.summary) {
    const kpis = Object.entries(reportData.summary)
      .filter(([, v]) => typeof v === 'number' || typeof v === 'string')
      .map(([k, v]) => `
        <div style="background:#f9fafb;padding:12px 16px;border-radius:6px;border-left:4px solid #2563eb">
          <div style="font-size:11px;color:#6b7280">${formatKey(k)}</div>
          <div style="font-size:20px;font-weight:700;color:#1e3a5f">${v}</div>
        </div>
      `).join('')
    summaryHtml = `<section><h2>Résumé</h2><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">${kpis}</div></section>`
  }

  let breakdownHtml = ''
  for (const key of Object.keys(reportData)) {
    if (['title', 'subtitle', 'generatedAt', 'summary', 'items', 'entityStats', 'overallScore'].includes(key)) continue
    if (typeof reportData[key] === 'object' && !Array.isArray(reportData[key])) {
      const entries = Object.entries(reportData[key] as Record<string, number>).sort((a, b) => b[1] - a[1])
      breakdownHtml += `
        <section>
          <h3>Répartition par ${formatKey(key)}</h3>
          <table>
            <thead><tr><th>${formatKey(key)}</th><th>Nombre</th></tr></thead>
            <tbody>${entries.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}</tbody>
          </table>
        </section>`
    }
  }

  let itemsHtml = ''
  if (reportData.items && reportData.items.length > 0) {
    itemsHtml = `
      <section>
        <h2>Détail des enregistrements (${reportData.items.length})</h2>
        <table>
          <thead><tr>${columns.map(c => `<th>${c.label}</th>`).join('')}</tr></thead>
          <tbody>${reportData.items.map(item => `
            <tr>${columns.map(c => `<td>${item[c.key] || '—'}</td>`).join('')}</tr>
          `).join('')}</tbody>
        </table>
      </section>`
  }

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${reportData.title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2937; padding: 40px; max-width: 1100px; margin: 0 auto; }
    h1 { font-size: 24px; color: #1e3a5f; border-bottom: 3px solid #2563eb; padding-bottom: 8px; margin-bottom: 4px; }
    h2 { font-size: 18px; color: #1e3a5f; margin: 24px 0 12px; }
    h3 { font-size: 14px; color: #374151; margin: 16px 0 8px; }
    .subtitle { color: #6b7280; font-size: 13px; margin-bottom: 24px; }
    .meta { color: #6b7280; font-size: 11px; margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin: 8px 0 16px; }
    th { background: #1e3a5f; color: white; padding: 8px 10px; text-align: left; font-weight: 600; }
    td { padding: 6px 10px; border-bottom: 1px solid #e5e7eb; }
    tr:nth-child(even) td { background: #f9fafb; }
    section { margin-bottom: 16px; }
  </style>
</head>
<body>
  <h1>${reportData.title}</h1>
  <p class="subtitle">${reportData.subtitle}</p>
  ${summaryHtml}
  ${breakdownHtml}
  ${itemsHtml}
  <p class="meta">SMQ ISO 13485 — Généré le ${new Date(reportData.generatedAt).toLocaleString('fr-FR')} — Document confidentiel</p>
</body>
</html>`
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const REPORT_LABELS: Record<ReportType, string> = {
  'capa-analysis': 'Analyse des actions correctives et préventives',
  'ncr-trends': 'Tendances des non-conformités',
  'audit-summary': 'Résumé des audits',
  'training-matrix': 'Matrice de formation et compétences',
  'risk-register': 'Registre des risques',
  'supplier-scorecard': 'Scorecard fournisseurs',
  'compliance-dashboard': 'Tableau de bord de conformité',
}

function formatKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, s => s.toUpperCase())
    .trim()
}