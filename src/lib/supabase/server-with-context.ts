// ============================================================
// Supabase server client avec contexte RLS
// Chaque requête appelle set_user_context() avant le query
// ============================================================

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Client admin (bypass RLS) pour les opérations système
export const adminClient = createClient<Database>(supabaseUrl, supabaseServiceKey)

// Client avec contexte utilisateur RLS
export async function createClientWithContext(profileId: string) {
  const client = createClient<Database>(
    supabaseUrl,
    supabaseServiceKey,
    {
      db: {
        schema: 'public',
      },
    }
  )

  // Définir le contexte utilisateur pour les policies RLS
  await client.rpc('set_user_context', { p_user_id: profileId })

  return client
}

// Helper: extraire le profile_id depuis la requête Next.js
export function extractProfileId(request: Request): string | null {
  // Priorité 1: header (middleware)
  const headerId = request.headers.get('x-profile-id')
  if (headerId) return headerId

  // Priorité 2: cookie de session
  const cookieHeader = request.headers.get('cookie') || ''
  const sessionMatch = cookieHeader.match(/session=([^;]+)/)
  if (sessionMatch) {
    try {
      const payload = JSON.parse(Buffer.from(sessionMatch[1], 'base64').toString())
      return payload.profileId || payload.sub || null
    } catch {
      return null
    }
  }

  return null
}

// Wrapper pour les API routes: valide la session et retourne le client RLS
export async function getAuthenticatedClient(request: Request) {
  const profileId = extractProfileId(request)
  if (!profileId) {
    return { client: null, profileId: null, error: 'Unauthorized' }
  }

  const client = await createClientWithContext(profileId)

  // Vérifier que le profil existe et est actif
  const { data: profile } = await client
    .from('profiles')
    .select('id, active')
    .eq('id', profileId)
    .single()

  if (!profile || !profile.active) {
    return { client: null, profileId: null, error: 'Profile not found or inactive' }
  }

  return { client, profileId, error: null }
}