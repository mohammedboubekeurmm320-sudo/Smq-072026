// ============================================================
// POST /api/import
// Import CSV data using the import-service (validation, coercion)
// Accepts multipart form with file and entityType
// Returns {imported: number, skipped: number, errors: ImportError[]}
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/server-with-context'
import { requireAuth } from '@/lib/auth-server'
import { parseCsv, validateImportData, getFieldMap, generateImportTemplate } from '@/lib/import-service'
import type { CrudEntity } from '@/lib/crud-service'
import { randomUUID } from 'crypto'

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

// GET /api/import?entityType=documents → returns CSV template
export async function GET(request: NextRequest) {
  try {
    await requireAuth()
    const { searchParams } = new URL(request.url)
    const entityType = searchParams.get('entityType')

    if (!entityType || !IMPORTABLE_ENTITIES.includes(entityType as CrudEntity)) {
      return err(`entityType requis et doit être l'un de : ${IMPORTABLE_ENTITIES.join(', ')}`)
    }

    const template = generateImportTemplate(entityType)
    if (!template) return err(`Aucun template d'import disponible pour "${entityType}"`)

    return new NextResponse(template, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${entityType}_import_template.csv"`,
      },
    })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return err('Non authentifié', 401)
    return err(e.message || 'Server error', 500)
  }
}

/**
 * POST /api/import
 * Import CSV data for a given entity type
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

    // Verify field map exists
    const fieldMap = getFieldMap(entityType)
    if (fieldMap.length === 0) {
      return err(`No field mapping configured for entity "${entityType}"`)
    }

    // Read file content
    const csvText = await file.text()

    // Parse CSV (RFC 4180 compliant)
    const { rows } = parseCsv(csvText)
    if (rows.length === 0) return err('CSV file is empty or has no data rows')

    // Validate and coerce types
    const { valid, invalid } = validateImportData(entityType, rows)

    if (valid.length === 0 && invalid.length > 0) {
      return ok({
        imported: 0,
        skipped: 0,
        errors: invalid,
        total: rows.length,
        message: 'Aucune ligne valide — vérifiez les erreurs ci-dessous et téléchargez le template via GET /api/import?entityType=...',
      })
    }

    // Insert valid records in batches of 50
    const BATCH_SIZE = 50
    let imported = 0

    for (let i = 0; i < valid.length; i += BATCH_SIZE) {
      const batch = valid.slice(i, i + BATCH_SIZE)

      // Add organization_id and created_by to each record
      const orgId = session.profile.organizationId
      const now = new Date().toISOString()
      const records = batch.map(row => ({
        ...row,
        id: randomUUID(),
        organization_id: orgId,
        created_by: profileId,
        updated_at: now,
      }))

      const { error } = await client
        .from(entityType as CrudEntity)
        .insert(records)
        .select()

      if (!error) {
        imported += batch.length
      }
    }

    return ok({
      imported,
      skipped: rows.length - valid.length,
      errors: invalid,
      total: rows.length,
    })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return err('Non authentifié', 401)
    return err(e.message || 'Server error', 500)
  }
}