// ============================================================
// POST /api/auth/verify-signature
// 21 CFR Part 11 §11.100 — Server-side HMAC-SHA256 signature
// Verifies password → generates cryptographic hash → stores in DB
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyPassword } from '@/lib/auth-server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const SIGNATURE_SECRET = process.env.SIGNATURE_SECRET || 'qms-esig-hmac-secret-key-2026'

export async function POST(request: NextRequest) {
  try {
    const { userId, password, purpose, recordId, recordType, documentId } = await request.json()

    if (!userId || !password || !purpose) {
      return NextResponse.json(
        { success: false, error: 'userId, password et purpose requis' },
        { status: 400 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // 1. Récupérer le profil et vérifier le mot de passe
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, password_hash, organization_id')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { success: false, error: 'Profil non trouvé' },
        { status: 404 }
      )
    }

    const valid = await verifyPassword(password, profile.password_hash)
    if (!valid) {
      return NextResponse.json(
        { success: false, error: 'Mot de passe incorrect' },
        { status: 401 }
      )
    }

    // 2. Générer le hash HMAC-SHA256 côté serveur (conforme 21 CFR Part 11)
    const crypto = await import('crypto')
    const timestamp = Date.now().toString()
    const nonce = crypto.randomBytes(16).toString('hex')
    const payload = `${userId}:${recordId || 'system'}:${purpose}:${timestamp}:${nonce}`
    const hmacHash = crypto
      .createHmac('sha256', SIGNATURE_SECRET)
      .update(payload)
      .digest('hex')

    // 3. Stocker la signature électronique dans la DB
    const { data: signature, error: sigError } = await supabase
      .from('electronic_signatures')
      .insert({
        document_id: documentId || null,
        record_id: recordId || null,
        record_type: recordType || null,
        signed_by_id: userId,
        signer_name: profile.full_name,
        signer_role: profile.role,
        signature_type: purpose,
        signature_hash: `HMAC-SHA256:${hmacHash}`,
        user_agent: request.headers.get('user-agent') || null,
        organization_id: profile.organization_id,
        meaning: `Signature pour: ${purpose}${recordId ? ` (${recordType} ${recordId})` : ''}`,
        revoked: false,
      })
      .select()
      .single()

    if (sigError) {
      console.error('Signature DB error:', sigError)
      return NextResponse.json(
        { success: false, error: 'Erreur lors de l\'enregistrement de la signature' },
        { status: 500 }
      )
    }

    // 4. Retourner le hash pour le client (sans le secret)
    return NextResponse.json({
      success: true,
      data: {
        signatureId: signature.id,
        signatureHash: `HMAC-SHA256:${hmacHash}`,
        signedAt: signature.created_at,
        signerName: profile.full_name,
        signerRole: profile.role,
      },
    })
  } catch (err) {
    console.error('Verify signature error:', err)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}