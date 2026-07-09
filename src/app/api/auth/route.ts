import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, hashPassword, verifyPassword, createSession, setSessionCookie, clearSessionCookie, destroySession, type Role } from '@/lib/auth'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ user: null }, { status: 200 })
  return NextResponse.json({ user })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body || !body.action) {
    return NextResponse.json({ error: 'Action requise' }, { status: 400 })
  }

  if (body.action === 'login') {
    const { email, password } = body
    if (!email || !password) {
      return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 })
    }
    const user = await db.user.findUnique({
      where: { email: String(email).toLowerCase().trim() },
      include: { organization: true }
    })
    if (!user || !user.active) {
      return NextResponse.json({ error: 'Identifiants invalides' }, { status: 401 })
    }
    const ok = await verifyPassword(password, user.passwordHash)
    if (!ok) {
      return NextResponse.json({ error: 'Identifiants invalides' }, { status: 401 })
    }
    const token = await createSession(user.id)
    await setSessionCookie(token)
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId,
        organizationName: user.organization.name,
        position: user.position,
        department: user.department
      }
    })
  }

  if (body.action === 'logout') {
    const cookieStore = await import('next/headers').then(m => m.cookies())
    const token = (await cookieStore).get('qms_session')?.value
    if (token) await destroySession(token)
    await clearSessionCookie()
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'register-first-admin') {
    const { organizationName, address, city, country, type, contactEmail, contactPhone, userName, email, password, position, department } = body
    if (!organizationName || !userName || !email || !password) {
      return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 })
    }
    const existing = await db.user.findUnique({ where: { email: String(email).toLowerCase().trim() } })
    if (existing) {
      return NextResponse.json({ error: 'Cet email est déjà utilisé' }, { status: 409 })
    }
    const org = await db.organization.create({
      data: { name: organizationName, address, city, country, type: type || 'manufacturer', contactEmail, contactPhone }
    })
    const user = await db.user.create({
      data: {
        email: String(email).toLowerCase().trim(),
        name: userName,
        passwordHash: await hashPassword(password),
        role: 'ADMIN' as Role,
        position,
        department,
        organizationId: org.id
      }
    })
    const stds = await db.standard.findMany({ where: { code: { in: ['ISO 13485:2016', 'ISO 9001:2015'] } } })
    for (const s of stds) {
      await db.organizationStandard.create({ data: { organizationId: org.id, standardId: s.id, certified: false } })
    }
    const token = await createSession(user.id)
    await setSessionCookie(token)
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId,
        organizationName: org.name,
        position: user.position,
        department: user.department
      }
    })
  }

  return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })
}
