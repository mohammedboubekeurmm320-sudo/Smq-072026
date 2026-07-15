// ============================================================
// POST /api/import
// Import CSV data
// Accepts multipart form with file and entityType
// Parses CSV (RFC 4180), maps columns, validates, inserts
// Returns {imported: number, errors: string[]}
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/server-with-context'
import { requireAuth } from '@/lib/auth-server'
import type { CrudEntity } from '@/lib/crud-service'

function ok(data: any, status = 200) {
  return NextResponse.json({ success: true, data }, { status })
}
function err(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status })
}

const IMPORTABLE_ENTITIES: CrudEntity[] = [
  'documents', 'capas', 'non_conformances', 'deviations', 'change_controls',
  'audits', 'training', 'risks', 'suppliers', 'batch_records',
]

/**
// Parse CSV string following RFC 4180
// Handles quoted fields with commas, newlines, and escaped quotes
 */
function parseCsv(csvText: string): { headers: string[]; rows: Record<string, string>[] } {
  const rows: Record<string, string>[] = []
  const lines: string[] = []

  // Split by newlines, respecting quoted fields
  let current = ''
  let inQuotes = false

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i]
    if (char === '"') {
      if (inQuotes && csvText[i + 1] === '"') {
        current += '"'
        i++ // skip escaped quote
      } else {
        inQuotes = !inQuotes
      }
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && csvText[i + 1] === '\n') i++ // skip \r\n
      lines.push(current)
      current = ''
    } else {
      current += char
    }
  }
  if (current.trim()) lines.push(current)

  if (lines.length < 2) return { headers: [], rows: [] }

  // Parse headers
  const headers = splitCsvLine(lines[0])

  // Parse rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const values = splitCsvLine(line)
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => {
      row[h.trim().toLowerCase().replace(/\s+/g, '_')] = values[idx] || ''
    })
    rows.push(row)
  }

  return { headers, rows }
}

function splitCsvLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      fields.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  fields.push(current.trim())
  return fields
}

/**
// POST /api/import
// Import CSV data for a given entity type
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    const { client, profileId } = await getAuthenticatedClient(request)
    if (!client) return err('Unauthorized', 401)

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const entityType = formData.get('entityType') as string | null

    if (!file) return err('file is required (multipart form field "file")')
    if (!entityType) return err('entityType is required (multipart form field "entityType")')

    if (!IMPORTABLE_ENTITIES.includes(entityType as CrudEntity)) {
      return err(`Entity '${entityType}' is not importable. Allowed: ${IMPORTABLE_ENTITIES.join(', ')}`)
    }

    if (!file.name.endsWith('.csv')) {
      return err('Only CSV files are supported')
    }

    // Read file content
    const csvText = await file.text()

    // Parse CSV
    const { headers, rows } = parseCsv(csvText)
    if (rows.length === 0) return err('CSV file is empty or has no data rows')

    // Insert records in batches of 50
    const BATCH_SIZE = 50
    let imported = 0
    const errors: string[] = []

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE)

      // Add organization_id and created_by to each record
      const orgId = request.headers.get('x-org-id') || session.profile.organizationId
      const records = batch.map(row => ({
        ...row,
        organization_id: orgId,
        created_by: profileId,
      }))

      const { error } = await client
        .from(entityType as CrudEntity)
        .insert(records)
        .select()

      if (error) {
        errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`)
      } else {
        imported += batch.length
      }
    }

    return ok({ imported, errors, total: rows.length })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return err('Non authentifié', 401)
    return err(e.message || 'Server error', 500)
  }
}