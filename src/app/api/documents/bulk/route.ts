// ============================================================
// POST /api/documents/bulk
// Bulk operations on documents
// Body: {action: 'status_change'|'delete'|'export', ids: string[], ...params}
// Supports changing status, deleting, or exporting multiple documents
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/server-with-context'
import { getServerSession, requireAuth } from '@/lib/auth-server'

function ok(data: any, status = 200) {
  return NextResponse.json({ success: true, data }, { status })
}
function err(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status })
}

type BulkAction = 'status_change' | 'delete' | 'export'

/**
 * POST /api/documents/bulk
 * Perform bulk operations on multiple documents
 */
export async function POST(request: NextRequest) {
  try {
    await requireAuth()

    const body = await request.json()
    const { action, ids, ...params } = body as {
      action: BulkAction
      ids: string[]
      status?: string
      [key: string]: any
    }

    if (!action || !['status_change', 'delete', 'export'].includes(action)) {
      return err('Action must be one of: status_change, delete, export')
    }

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return err('ids array is required and must not be empty')
    }

    if (ids.length > 100) {
      return err('Maximum 100 documents per bulk operation')
    }

    const { client } = await getAuthenticatedClient(request)
    if (!client) return err('Unauthorized', 401)

    if (action === 'status_change') {
      const { status } = params
      if (!status) return err('status is required for status_change action')

      const validStatuses = ['Draft', 'Under Review', 'Approved', 'Effective', 'Obsolete', 'Withdrawn', 'Archived']
      if (!validStatuses.includes(status)) {
        return err(`Invalid status. Must be one of: ${validStatuses.join(', ')}`)
      }

      const { error } = await client
        .from('documents')
        .update({ status })
        .in('id', ids)

      if (error) return err(error.message)
      return ok({ updated: ids.length, action: 'status_change', newStatus: status })
    }

    if (action === 'delete') {
      const { error } = await client
        .from('documents')
        .update({ status: 'Archived' })
        .in('id', ids)

      if (error) return err(error.message)
      return ok({ archived: ids.length, action: 'delete' })
    }

    if (action === 'export') {
      // Fetch the documents for export
      const { data: docs, error } = await client
        .from('documents')
        .select('*')
        .in('id', ids)

      if (error) return err(error.message)

      return ok({
        exported: docs?.length ?? 0,
        action: 'export',
        documents: docs,
      })
    }

    return err('Unknown action')
  } catch (e: any) {
    if (e.message === 'Non authentifié') return err('Non authentifié', 401)
    return err(e.message || 'Server error', 500)
  }
}