// ============================================================
// Route API CRUD dynamique: /api/qms/[entity]/[id]
// GET / PUT / DELETE par ID
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import {
  getById, update, softDelete, remove,
  type CrudEntity,
} from '@/lib/crud-service'
import { resolveEntitySlug } from '@/lib/entity-slug-map'
import { sanitizeDbError } from '@/lib/error-sanitizer'

function ok(data: any) {
  return NextResponse.json({ success: true, data })
}
function err(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status })
}

// GET /api/qms/[entity]/[id] → détail
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entity: string; id: string }> }
) {
  const { entity: rawEntity, id } = await params
  const entity = resolveEntitySlug(rawEntity)

  if (!entity) {
    return err('Entity not allowed')
  }

  const result = await getById(request, entity as CrudEntity, id)
  if (result.error) return err(sanitizeDbError(result.error), 404)
  return ok(result.data)
}

// PUT /api/qms/[entity]/[id] → modifier
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ entity: string; id: string }> }
) {
  const { entity: rawEntity, id } = await params
  const entity = resolveEntitySlug(rawEntity)

  if (!entity) {
    return err('Entity not allowed')
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return err('JSON invalide dans le corps de la requête', 400)
  }

  const result = await update(request, entity as CrudEntity, id, body)
  if (result.error) return err(sanitizeDbError(result.error), 400)
  return ok(result.data)
}

// DELETE /api/qms/[entity]/[id] → soft delete (hard=true pour définitif)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ entity: string; id: string }> }
) {
  const { entity: rawEntity, id } = await params
  const entity = resolveEntitySlug(rawEntity)

  if (!entity) {
    return err('Entity not allowed')
  }

  const { searchParams } = new URL(request.url)

  if (searchParams.get('hard') === 'true') {
    const result = await remove(request, entity as CrudEntity, id)
    if (result.error) return err(sanitizeDbError(result.error), 500)
    return ok({ deleted: true })
  }

  const result = await softDelete(request, entity as CrudEntity, id)
  if (result.error) return err(sanitizeDbError(result.error), 500)
  return ok(result.data)
}
