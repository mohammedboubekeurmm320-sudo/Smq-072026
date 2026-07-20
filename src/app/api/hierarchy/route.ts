// ============================================================================
// API Route: /api/hierarchy
// Server-side document hierarchy — uses the SQL document_hierarchy view
// and hierarchy-service for all operations.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import {
  getHierarchy,
  getFilteredHierarchy,
  getHierarchyStats,
  linkDocument,
  unlinkDocument,
} from '@/lib/hierarchy-service'

// GET /api/hierarchy — Fetch hierarchy tree
// Query params: level, status, docType, search, parentId
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl

  // If ?stats=true, return statistics instead of the tree
  if (searchParams.get('stats') === 'true') {
    const { data, error } = await getHierarchyStats(request)
    if (error) return NextResponse.json({ error }, { status: 500 })
    return NextResponse.json(data)
  }

  const filters: Parameters<typeof getFilteredHierarchy>[1] = {}

  const level = searchParams.get('level')
  if (level) filters.level = parseInt(level, 10)

  const status = searchParams.get('status')
  if (status) filters.status = status

  const docType = searchParams.get('docType')
  if (docType) filters.docType = docType

  const search = searchParams.get('search')
  if (search) filters.search = search

  const parentId = searchParams.get('parentId')
  if (parentId !== null) {
    filters.parentId = parentId === 'null' ? null : parentId
  }

  const limit = searchParams.get('limit')
  if (limit) filters.limit = parseInt(limit, 10)

  // If any filter is set, use filtered query; otherwise get full hierarchy
  const hasFilters = Object.keys(filters).length > 0
  const { data, error } = hasFilters
    ? await getFilteredHierarchy(request, filters)
    : await getHierarchy(request)

  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/hierarchy — Link a child document to a parent
// Body: { childId: string, parentId: string }
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { childId, parentId } = body

  if (!childId || !parentId) {
    return NextResponse.json({ error: 'childId et parentId sont requis' }, { status: 400 })
  }

  const { data, error } = await linkDocument(request, childId, parentId)
  if (error) return NextResponse.json({ error }, { status: error.includes('introuvable') ? 404 : 400 })
  return NextResponse.json(data)
}

// DELETE /api/hierarchy?documentId=xxx — Unlink a document from its parent
export async function DELETE(request: NextRequest) {
  const documentId = request.nextUrl.searchParams.get('documentId')
  if (!documentId) {
    return NextResponse.json({ error: 'documentId est requis' }, { status: 400 })
  }

  const { data, error } = await unlinkDocument(request, documentId)
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json(data)
}