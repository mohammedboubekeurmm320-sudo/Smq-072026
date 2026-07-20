// ============================================================================
// In-Memory Token Bucket Rate Limiter — 3 tiers, no external dependencies
// ============================================================================
// Replaces the previous fixed-window implementation with token bucket algorithm.
//
// Advantages over fixed-window:
//   - Burst tolerance: allows short bursts up to the bucket capacity
//   - Smoother rate: tokens replenish continuously, not in discrete jumps
//   - No window-boundary spikes (no "double quota" at window reset)
//
// Tier 1 (Auth):       10 req/min  → capacity 10, refill 1/6s
// Tier 2 (Write):      30 req/min  → capacity 30, refill 1/2s
// Tier 3 (Read):      100 req/min  → capacity 100, refill 5/3s
// ============================================================================

interface TokenBucketEntry {
  tokens: number        // Current available tokens
  maxTokens: number     // Maximum bucket capacity
  refillRate: number    // Tokens added per millisecond
  lastRefill: number    // Timestamp of last refill (ms)
}

const store = new Map<string, TokenBucketEntry>()

// Prune stale entries every 60s to prevent memory leaks
let lastPrune = 0
function pruneStore(now: number) {
  if (now - lastPrune < 60_000) return
  lastPrune = now
  for (const [key, entry] of store) {
    // If the bucket is full and hasn't been touched in > 2 min, remove it
    const elapsed = now - entry.lastRefill
    const currentTokens = Math.min(entry.maxTokens, entry.tokens + elapsed * entry.refillRate)
    if (currentTokens >= entry.maxTokens && elapsed > 120_000) {
      store.delete(key)
    }
  }
}

/**
 * Consume a token from the bucket identified by `key`.
 *
 * Token Bucket Algorithm:
 * 1. Refill tokens based on elapsed time since last access
 * 2. If tokens >= 1, consume one and allow the request
 * 3. If tokens < 1, deny the request
 *
 * @param key        Unique identifier (IP or "userId|ip")
 * @param maxTokens  Maximum burst capacity
 * @param refillPerSecond  Tokens added per second (sustained rate)
 * @returns `{ allowed, remaining, resetAt, retryAfterMs }`
 */
export function rateLimit(
  key: string,
  maxTokens: number,
  refillPerSecond: number = 1,
): { allowed: boolean; remaining: number; resetAt: number; retryAfterMs: number } {
  const now = Date.now()
  pruneStore(now)

  const existing = store.get(key)

  if (!existing) {
    // New bucket: start full, consume 1 token
    const refillRate = refillPerSecond / 1000 // tokens per ms
    store.set(key, {
      tokens: maxTokens - 1,
      maxTokens,
      refillRate,
      lastRefill: now,
    })
    return {
      allowed: true,
      remaining: maxTokens - 1,
      resetAt: now + Math.ceil(maxTokens / refillPerSecond * 1000),
      retryAfterMs: 0,
    }
  }

  // Refill tokens based on elapsed time
  const elapsed = now - existing.lastRefill
  const refilledTokens = elapsed * existing.refillRate
  existing.tokens = Math.min(existing.maxTokens, existing.tokens + refilledTokens)
  existing.lastRefill = now

  if (existing.tokens >= 1) {
    // Consume one token
    existing.tokens -= 1
    const remaining = Math.floor(existing.tokens)
    return {
      allowed: true,
      remaining,
      resetAt: now + Math.ceil((existing.maxTokens - existing.tokens) / existing.refillRate),
      retryAfterMs: 0,
    }
  }

  // Rate limited — calculate when the next token will be available
  const deficit = 1 - existing.tokens
  const retryAfterMs = Math.ceil(deficit / existing.refillRate)
  const resetAt = now + retryAfterMs

  return {
    allowed: false,
    remaining: 0,
    resetAt,
    retryAfterMs,
  }
}

// ---------------------------------------------------------------------------
// Convenience wrappers for each tier
//
// Token Bucket Configuration:
//   - maxTokens = burst capacity (same as the old per-window limit)
//   - refillPerSecond = sustained rate = maxTokens per 60s
//   This gives identical long-term throughput but allows bursting.
// ---------------------------------------------------------------------------

/** Tier 1 — Auth endpoints: 10 requests per minute, burst up to 10 */
export const authRateLimit = (key: string) => rateLimit(key, 10, 10 / 60)

/** Tier 2 — Write (POST/PUT/DELETE) endpoints: 30 requests per minute, burst up to 30 */
export const writeRateLimit = (key: string) => rateLimit(key, 30, 30 / 60)

/** Tier 3 — Read (GET) endpoints: 100 requests per minute, burst up to 100 */
export const readRateLimit = (key: string) => rateLimit(key, 100, 100 / 60)

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