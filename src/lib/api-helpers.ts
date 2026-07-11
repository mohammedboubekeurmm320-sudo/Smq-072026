import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import type { AuditAction } from '@/types/qms'

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status })
}

export function apiError(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ success: false, error: message, details }, { status })
}

// Audit trail state per org (in-memory chain cache)
const auditChain: Record<string, { lastSequence: number; lastHash: string }> = {}

async function loadChainState(orgId: string) {
  if (auditChain[orgId]) return auditChain[orgId]
  const last = await db.auditTrail.findFirst({
    where: { organizationId: orgId },
    orderBy: { sequenceNumber: 'desc' },
  })
  const state = { lastSequence: last?.sequenceNumber || 0, lastHash: last?.hash || 'GENESIS' }
  auditChain[orgId] = state
  return state
}

function computeHash(orgId: string, seq: number, prevHash: string, action: string, table: string, recordId: string, userId?: string, timestamp?: string): string {
  const canonical = JSON.stringify({ seq, action, table, record_id: recordId, user_id: userId || '', org_id: orgId, prev_hash: prevHash, timestamp: timestamp || new Date().toISOString() })
  let h = 0
  for (let i = 0; i < canonical.length; i++) h = ((h << 5) - h) + canonical.charCodeAt(i) | 0
  return `AUD-${Math.abs(h).toString(16).toUpperCase()}`
}

export async function logAudit(
  orgId: string,
  action: AuditAction,
  table: string,
  recordId: string,
  userId?: string,
  userEmail?: string,
  oldValues?: any,
  newValues?: any,
) {
  try {
    const chain = await loadChainState(orgId)
    const seq = chain.lastSequence + 1
    const timestamp = new Date().toISOString()
    const hash = computeHash(orgId, seq, chain.lastHash, action, table, recordId, userId, timestamp)
    const entry = await db.auditTrail.create({
      data: {
        sequenceNumber: seq, previousHash: chain.lastHash, hash,
        auditAction: action, tableName: table, recordId,
        userId, userEmail,
        oldValuesJson: oldValues ? JSON.stringify(oldValues) : null,
        newValuesJson: newValues ? JSON.stringify(newValues) : null,
        organizationId: orgId,
      },
    })
    auditChain[orgId] = { lastSequence: seq, lastHash: hash }
    return entry
  } catch (e) {
    console.error('[audit] logAudit error:', e)
  }
}

// Helper for safe JSON parsing
export function parseJson<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback
  try { return JSON.parse(s) as T } catch { return fallback }
}

export function stringifyJson(v: unknown): string {
  return JSON.stringify(v ?? null)
}