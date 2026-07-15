// ============================================================================
// In-Memory Rate Limiter — 3 tiers, no external dependencies
// Tier 1: Auth endpoints   — 10 req/min per IP
// Tier 2: Write endpoints  — 30 req/min per user/IP
// Tier 3: Read endpoints   — 100 req/min per user/IP
// ============================================================================

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Prune expired entries every 60s to avoid memory leaks
let lastPrune = 0
function pruneStore(now: number) {
  if (now - lastPrune < 60_000) return
  lastPrune = now
  for (const [key, entry] of store) {
    if (now >= entry.resetAt) store.delete(key)
  }
}

/**
 * Check whether a request is allowed under the given rate limit.
 *
 * @param key  Unique identifier (IP address or "userId:ip" combo)
 * @param maxRequests  Maximum number of requests in the window
 * @param windowMs  Time window in milliseconds (default 60 000 = 1 min)
 * @returns `{ allowed, remaining, resetAt }`
 */
export function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number = 60_000,
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  pruneStore(now)

  const existing = store.get(key)

  if (!existing || now >= existing.resetAt) {
    // New window
    const resetAt = now + windowMs
    store.set(key, { count: 1, resetAt })
    return { allowed: true, remaining: maxRequests - 1, resetAt }
  }

  if (existing.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt }
  }

  existing.count++
  return { allowed: true, remaining: maxRequests - existing.count, resetAt: existing.resetAt }
}

// ---------------------------------------------------------------------------
// Convenience wrappers for each tier
// ---------------------------------------------------------------------------

/** Tier 1 — Auth endpoints: 10 requests per minute */
export const authRateLimit = (key: string) => rateLimit(key, 10, 60_000)

/** Tier 2 — Write (POST/PUT/DELETE) endpoints: 30 requests per minute */
export const writeRateLimit = (key: string) => rateLimit(key, 30, 60_000)

/** Tier 3 — Read (GET) endpoints: 100 requests per minute */
export const readRateLimit = (key: string) => rateLimit(key, 100, 60_000)

/**
 * Derive a rate-limit key from the request.
 * For auth (unauthenticated) routes we use the IP only.
 * For authenticated routes we use "userId|ip" so per-user limits are enforced.
 */
export function getRateLimitKey(request: Request, userId?: string): string {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  return userId ? `${userId}|${ip}` : `anon|${ip}`
}