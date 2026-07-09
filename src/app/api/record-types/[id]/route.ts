import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession, hasPermission } from '@/lib/auth-server'
import { apiSuccess, apiError, logAudit } from '@/lib/api-helpers'

interface Ctx { params: Promise<{ id: string }> }

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const session = await getServerSession()
    if (!session || !hasPermission(session.profile.role, 'recordtypes.delete' as any)) return apiError('Permissions insuffisantes', 403)
    const { id } = await params
    const existing = await db.recordTypeDefinition.findFirst({ where: { id, organizationId: session.profile.organizationId } })
    if (!existing) return apiError('Type introuvable', 404)
    if (existing.isSystem) return apiError('Type système : suppression interdite', 400)
    await db.recordTypeDefinition.delete({ where: { id } })
    await logAudit(session.profile.organizationId, 'DELETE', 'record_type_definitions', id, session.profile.id, session.profile.email, existing)
    return apiSuccess({ ok: true })
  } catch (e: any) { return apiError(e.message, 500) }
}
