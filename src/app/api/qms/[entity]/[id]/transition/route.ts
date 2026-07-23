// ============================================================
// POST /api/qms/[entity]/[id]/transition
// Status transition with optional e-signature (21 CFR Part 11)
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { getById, update, type CrudEntity } from '@/lib/crud-service'
import { canTransition } from '@/lib/status-flows'
import type { UserRole } from '@/types/qms'
import { resolveEntitySlug } from '@/lib/entity-slug-map'

// Entités qui supportent les transitions de statut (avec signature électronique
// potentielle — 21 CFR Part 11). Toutes les autres entités renvoient 400.
const TRANSITIONABLE: CrudEntity[] = [
  'capas', 'non_conformances', 'deviations', 'change_controls',
  'audits', 'training', 'risks', 'suppliers', 'batch_records',
]

function ok(data: any) {
  return NextResponse.json({ success: true, data })
}
function err(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ entity: string; id: string }> }
) {
  const { entity: rawEntity, id } = await params
  const entity = resolveEntitySlug(rawEntity)

  if (!entity || !TRANSITIONABLE.includes(entity as CrudEntity)) {
    return err('Transitions non supportées pour cette entité')
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return err('JSON invalide dans le corps de la requête', 400)
  }
  const { targetStatus, signatureHash, reason } = body

  if (!targetStatus) {
    return err('targetStatus requis')
  }

  // Fetch current record
  const record = await getById(request, entity as CrudEntity, id)
  if (record.error || !record.data) {
    return err(record.error || 'Enregistrement non trouvé', 404)
  }

  const currentStatus = record.data.status
  if (!currentStatus) {
    return err('Aucun statut actuel trouvé sur cet enregistrement')
  }

  // Get user role from headers (set by middleware)
  const userRole = (request.headers.get('x-user-role') || 'operator') as UserRole

  // Validate transition
  const check = canTransition(entity, currentStatus, targetStatus, userRole)
  if (!check.allowed) {
    return err(check.reason || 'Transition non autorisée', 403)
  }

  // Build update payload
  const updatePayload: Record<string, any> = {
    status: targetStatus,
  }

  if (reason) {
    updatePayload.transition_reason = reason
  }

  // Store e-signature if required
  if (check.requiresESignature && signatureHash) {
    updatePayload.signature_hash = signatureHash
    updatePayload.signed_at = new Date().toISOString()
    updatePayload.signed_by = request.headers.get('x-profile-id')
  }

  // Perform the update
  const result = await update(request, entity as CrudEntity, id, updatePayload)
  if (result.error) {
    return err(result.error, 500)
  }

  return ok({
    ...result.data,
    transitioned: true,
    fromStatus: currentStatus,
    toStatus: targetStatus,
    eSignatureRequired: check.requiresESignature,
    eSignatureProvided: !!signatureHash,
  })
}