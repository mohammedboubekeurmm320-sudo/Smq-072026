// ============================================================
// Route API CRUD dynamique: /api/qms/[entity] et /api/qms/[entity]/[id]
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import {
  getAll, getById, create, update, softDelete, remove,
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

// GET /api/qms/[entity] → liste
// GET /api/qms/[entity]/[id] → détail
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entity: string; id?: string[] }> }
) {
  const { entity, id } = await params

  if (!ALLOWED.includes(entity as CrudEntity)) {
    return NextResponse.json({ error: 'Entity not allowed' }, { status: 400 })
  }

  // Détail par ID
  if (id?.[0]) {
    const result = await getById(request, entity as CrudEntity, id[0])
    if (result.error) return NextResponse.json({ error: result.error }, { status: 404 })
    return NextResponse.json(result.data)
  }

  // Liste avec filtres
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

  if (result.error) return NextResponse.json({ error: result.error }, { status: 500 })
  return NextResponse.json({ data: result.data, count: result.count })
}

// POST /api/qms/[entity] → créer
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ entity: string }> }
) {
  const { entity } = await params

  if (!ALLOWED.includes(entity as CrudEntity)) {
    return NextResponse.json({ error: 'Entity not allowed' }, { status: 400 })
  }

  const body = await request.json()
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Body requis' }, { status: 400 })
  }

  const result = await create(request, entity as CrudEntity, body)
  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json(result.data, { status: 201 })
}

// PUT /api/qms/[entity]/[id] → modifier
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ entity: string; id: string[] }> }
) {
  const { entity, id } = await params

  if (!id?.[0] || !ALLOWED.includes(entity as CrudEntity)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const body = await request.json()
  const result = await update(request, entity as CrudEntity, id[0], body)
  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json(result.data)
}

// DELETE /api/qms/[entity]/[id] → soft delete (hard=true pour définitif)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ entity: string; id: string[] }> }
) {
  const { entity, id } = await params

  if (!id?.[0] || !ALLOWED.includes(entity as CrudEntity)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)

  if (searchParams.get('hard') === 'true') {
    const result = await remove(request, entity as CrudEntity, id[0])
    if (result.error) return NextResponse.json({ error: result.error }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  const result = await softDelete(request, entity as CrudEntity, id[0])
  if (result.error) return NextResponse.json({ error: result.error }, { status: 500 })
  return NextResponse.json(result.data)
}