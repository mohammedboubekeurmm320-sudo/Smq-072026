import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _supabase: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error(
        'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables. ' +
        'Please set them in Vercel → Settings → Environment Variables.'
      )
    }

    _supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    })
  }
  return _supabase
}

// Lazy proxy — backward compatible with existing `import { supabase }` usage
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getSupabase()
    const value = Reflect.get(client, prop, receiver)
    if (typeof value === 'function') {
      return value.bind(client)
    }
    return value
  }
})