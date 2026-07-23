// ============================================================
// Route API CRUD dynamique: /api/qms/[entity]
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import {
  getAll, create,
  type CrudEntity,
} from '@/lib/crud-service'
import { resolveEntitySlug } from '@/lib/entity-slug-map'

// Helper: réponse standardisée { success, data }
function ok(data: any, status = 200) {
  return NextResponse.json({ success: true, data }, { status })
}
function err(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status })
}

/**
 * Convertit un nom de colonne camelCase → snake_case.
 * Le front-end envoie parfois `createdAt`, `updatedAt`, etc. (camelCase JS)
 * mais les colonnes PostgreSQL sont en snake_case (`created_at`, `updated_at`).
 *
 * Exemples:
 *   createdAt → created_at
 *   dueDate   → due_date
 *   title     → title (inchangé)
 */
function toSnakeCase(s: string): string {
  return s.replace(/([A-Z])/g, '_$1').toLowerCase()
}

// GET /api/qms/[entity] → liste
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entity: string }> }
) {
  const { entity: rawEntity } = await params
  const entity = resolveEntitySlug(rawEntity)

  if (!entity) {
    return err('Entity not allowed')
  }

  const { searchParams } = new URL(request.url)
  const filters: Record<string, string> = {}
  const skip = ['sort', 'order', 'limit', 'offset', 'select']

  for (const [key, value] of searchParams.entries()) {
    if (!skip.includes(key) && value) filters[toSnakeCase(key)] = value
  }

  // Convertir sort=createdAt → sort=created_at (camelCase → snake_case)
  const rawSort = searchParams.get('sort')
  const orderBy = rawSort ? toSnakeCase(rawSort) : 'created_at'

  const result = await getAll(request, {
    entity: entity as CrudEntity,
    select: searchParams.get('select') || undefined,
    filters: Object.keys(filters).length > 0 ? filters : undefined,
    orderBy,
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
  const { entity: rawEntity } = await params
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
  if (!body || typeof body !== 'object') {
    return err('Body requis')
  }

  const result = await create(request, entity as CrudEntity, body)
  if (result.error) return err(result.error, 400)
  return ok(result.data, 201)
}
