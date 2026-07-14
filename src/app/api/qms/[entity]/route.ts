// ============================================================
// Route API CRUD dynamique: /api/qms/[entity]
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import {
  getAll, create,
  type CrudEntity,
} from '@/lib/crud-service'

const ALLOWED: CrudEntity[] = [
  'documents', 'electronic_signatures', 'document_prerequisites',
  'form_templates', 'form_instances',
  'capas', 'non_conformances', 'deviations', 'change_controls',
  'audits', 'training', 'risks', 'suppliers', 'batch_records',
  'departments', 'record_type_definitions', 'record_links',
  'document_triggers', 'document_relationships',
  'scheduled_reports', 'notifications',
]

// Helper: réponse standardisée { success, data }
function ok(data: any, status = 200) {
  return NextResponse.json({ success: true, data }, { status })
}
function err(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status })
}

// GET /api/qms/[entity] → liste
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entity: string }> }
) {
  const { entity } = await params

  if (!ALLOWED.includes(entity as CrudEntity)) {
    return err('Entity not allowed')
  }

  const { searchParams } = new URL(request.url)
  const filters: Record<string, string> = {}
  const skip = ['sort', 'order', 'limit', 'offset', 'select']

  for (const [key, value] of searchParams.entries()) {
    if (!skip.includes(key) && value) filters[key] = value
  }

  const result = await getAll(request, {
    entity: entity as CrudEntity,
    select: searchParams.get('select') || undefined,
    filters: Object.keys(filters).length > 0 ? filters : undefined,
    orderBy: searchParams.get('sort') || 'created_at',
    orderAsc: searchParams.get('order') === 'asc',
    limit: parseInt(searchParams.get('limit') || '50'),
    offset: parseInt(searchParams.get('offset') || '0'),
  })

  if (result.error) return err(result.error, 500)
  return ok({ items: result.data, count: result.count })
}

// POST /api/qms/[entity] → créer
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ entity: string }> }
) {
  const { entity } = await params

  if (!ALLOWED.includes(entity as CrudEntity)) {
    return err('Entity not allowed')
  }

  const body = await request.json()
  if (!body || typeof body !== 'object') {
    return err('Body requis')
  }

  const result = await create(request, entity as CrudEntity, body)
  if (result.error) return err(result.error, 400)
  return ok(result.data, 201)
}