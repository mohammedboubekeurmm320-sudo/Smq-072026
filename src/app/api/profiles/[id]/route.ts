import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getServerSession, hasPermission, hashPassword } from '@/lib/auth-server'
import { apiSuccess, apiError, logAudit } from '@/lib/api-helpers'

interface Ctx { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getServerSession()
    if (!session || !hasPermission(session.profile.role, 'admin.users' as any)) return apiError('Permissions insuffisantes', 403)
    const { id } = await params
    const body = await req.json()
    const existing = await db.profile.findFirst({ where: { id, organizationId: session.profile.organizationId } })
    if (!existing) return apiError('Utilisateur introuvable', 404)

    if (body.active === false && id === session.profile.id) return apiError('Vous ne pouvez pas désactiver votre propre compte', 400)
    if (body.role && body.role !== 'admin' && id === session.profile.id && existing.role === 'admin') return apiError('Vous ne pouvez pas rétrograder votre propre compte admin', 400)

    const data: any = {}
    if (body.fullName !== undefined) data.fullName = body.fullName
    if (body.email !== undefined) {
      const dup = await db.profile.findUnique({ where: { email: String(body.email).toLowerCase().trim() } })
      if (dup && dup.id !== id) return apiError('Email déjà utilisé', 409)
      data.email = String(body.email).toLowerCase().trim()
    }
    if (body.role !== undefined && ['admin', 'quality_manager', 'auditor', 'document_controller', 'executive', 'operator'].includes(body.role)) data.role = body.role
    if (body.department !== undefined) data.department = body.department
    if (body.jobTitle !== undefined) data.jobTitle = body.jobTitle
    if (body.active !== undefined) data.active = body.active
    if (body.password) data.passwordHash = await hashPassword(body.password)

    const updated = await db.profile.update({ where: { id }, data, select: { id: true, email: true, fullName: true, role: true, department: true, jobTitle: true, active: true } })
    await logAudit(session.profile.organizationId, 'UPDATE', 'profiles', id, session.profile.id, session.profile.email, existing, updated)
    return apiSuccess({ profile: updated })
  } catch (e: any) { return apiError(e.message, 500) }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const session = await getServerSession()
    if (!session || !hasPermission(session.profile.role, 'admin.users' as any)) return apiError('Permissions insuffisantes', 403)
    const { id } = await params
    if (id === session.profile.id) return apiError('Vous ne pouvez pas supprimer votre propre compte', 400)
    const existing = await db.profile.findFirst({ where: { id, organizationId: session.profile.organizationId } })
    if (!existing) return apiError('Utilisateur introuvable', 404)
    await db.profile.delete({ where: { id } })
    await logAudit(session.profile.organizationId, 'DELETE', 'profiles', id, session.profile.id, session.profile.email, existing)
    return apiSuccess({ ok: true })
  } catch (e: any) { return apiError(e.message, 500) }
}
