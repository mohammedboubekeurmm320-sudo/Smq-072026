// ============================================================
// GET /api/health
// Health check endpoint
// Returns {status, timestamp, version, services}
// No auth required
// ============================================================

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

/** Default version if package.json is unavailable */
const pkgVersion = '1.0.0'

/**
 * GET /api/health
 * System health check — no authentication required
 * Returns connectivity status for Supabase and database
 */
export async function GET() {
  const timestamp = new Date().toISOString()

  let supabaseStatus: 'connected' | 'disconnected' = 'disconnected'
  let dbStatus: 'healthy' | 'unhealthy' = 'unhealthy'

  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { error } = await supabase.from('organizations').select('id').limit(1)

    if (!error) {
      supabaseStatus = 'connected'
      dbStatus = 'healthy'
    }
  } catch {
    // Connection failed
  }

  const isHealthy = supabaseStatus === 'connected' && dbStatus === 'healthy'

  return NextResponse.json(
    {
      status: isHealthy ? 'ok' : 'degraded',
      timestamp,
      version: pkgVersion,
      services: {
        supabase: supabaseStatus,
        db: dbStatus,
      },
    },
    {
      status: isHealthy ? 200 : 503,
    }
  )
}