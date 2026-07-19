// ============================================================
// Supabase server client avec contexte utilisateur
// Dérive organizationId depuis la base (source de vérité),
// pas depuis les headers/cookies clients.
// ============================================================

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Client admin (bypass RLS) — réservé EXCLUSIVEMENT aux tâches système :
// webhooks, jobs cron, migrations, seed. JAMAIS pour les requêtes utilisateur.
export const adminClient = createClient<Database>(supabaseUrl, supabaseServiceKey)

// Dette technique (Tâche 3) : ce client utilise encore service_role.
// L'isolation multi-tenant est assurée par le filtrage organization_id
// applicatif dans crud-service.ts. La migration vers anon+JWT Supabase
// nécessite une refonte du flux d'authentification.
async function createClientWithContext(profileId: string) {
  const client = createClient<Database>(supabaseUrl, supabaseServiceKey, { db: { schema: 'public' } })
  try { await client.rpc('set_user_context', { p_user_id: profileId }) } catch { /* non bloquant */ }
  return client
}

// Entités qui possèdent une colonne organization_id
export const ORG_SCOPED_ENTITIES = new Set([
  'documents', 'electronic_signatures', 'document_prerequisites',
  'form_templates', 'form_instances',
  'capas', 'non_conformances', 'deviations', 'change_controls',
  'audits', 'training', 'risks', 'suppliers', 'batch_records',
  'departments', 'record_type_definitions', 'record_links',
  'document_triggers', 'document_relationships', 'document_code_sequences',
  'scheduled_reports', 'notifications',
])

export function extractProfileId(request: Request): string | null {
  return request.headers.get('x-profile-id')
}

export async function getAuthenticatedClient(request: Request) {
  const profileId = extractProfileId(request)
  if (!profileId) return { client: null, profileId: null, organizationId: null, error: 'Unauthorized' }

  const client = await createClientWithContext(profileId)

  const { data: profile } = await client.from('profiles').select('id, active, organization_id').eq('id', profileId).single()
  if (!profile || !profile.active) return { client: null, profileId: null, organizationId: null, error: 'Profile not found or inactive' }

  // Dériver organization_id depuis organization_members (source de vérité)
  let organizationId: string | null = profile.organization_id
  const { data: membership } = await client.from('organization_members').select('organization_id').eq('user_id', profileId).eq('status', 'active').limit(1).single()
  if (membership?.organization_id) organizationId = membership.organization_id
  if (!organizationId) return { client: null, profileId: null, organizationId: null, error: 'No organization assigned' }

  return { client, profileId, organizationId, error: null }
}