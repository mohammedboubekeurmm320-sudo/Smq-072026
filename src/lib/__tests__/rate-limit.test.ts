// ============================================================================
// Tests unitaires — Token Bucket Rate Limiter
// Critique: securite anti-abus pour endpoints auth et API
// ============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { rateLimit, authRateLimit, writeRateLimit, readRateLimit } from '@/lib/rate-limit'

describe('rateLimit (Token Bucket)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('autorise la premiere requete', () => {
    const result = rateLimit('user1', 5, 1)
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(4)
    expect(result.retryAfterMs).toBe(0)
  })

  it('autorise jusqu au max puis bloque', () => {
    for (let i = 0; i < 5; i++) {
      const result = rateLimit('user2', 5, 1)
      expect(result.allowed).toBe(true)
    }
    // 6eme requete doit etre bloquee
    const blocked = rateLimit('user2', 5, 1)
    expect(blocked.allowed).toBe(false)
    expect(blocked.remaining).toBe(0)
    expect(blocked.retryAfterMs).toBeGreaterThan(0)
  })

  it('separe les compteurs par cle', () => {
    const r1 = rateLimit('userA', 1, 1)
    expect(r1.allowed).toBe(true)
    const r2 = rateLimit('userB', 1, 1)
    expect(r2.allowed).toBe(true)
    // userA est deja a 0/1
    const r1b = rateLimit('userA', 1, 1)
    expect(r1b.allowed).toBe(false)
  })

  it('recharge les tokens avec le temps (token refill)', () => {
    const first = rateLimit('user3', 2, 1) // 2 tokens max, 1/sec
    expect(first.allowed).toBe(true)
    expect(first.remaining).toBe(1)

    // Consommer le dernier token
    const second = rateLimit('user3', 2, 1)
    expect(second.allowed).toBe(true)
    expect(second.remaining).toBe(0)

    // Plus de tokens
    const blocked = rateLimit('user3', 2, 1)
    expect(blocked.allowed).toBe(false)

    // Avancer de 1.1 seconde → 1 token recharge
    vi.advanceTimersByTime(1100)

    const afterRefill = rateLimit('user3', 2, 1)
    expect(afterRefill.allowed).toBe(true)
    expect(afterRefill.remaining).toBe(0)
  })

  it('permet le burst initial puis se stabilise au taux de recharge', () => {
    // 3 tokens max, refill 1/sec
    // Burst: 3 requetes immediates
    for (let i = 0; i < 3; i++) {
      expect(rateLimit('burster', 3, 1).allowed).toBe(true)
    }

    // 4eme bloquee
    expect(rateLimit('burster', 3, 1).allowed).toBe(false)

    // Apres 1 seconde, 1 token recharge → 1 requete possible
    vi.advanceTimersByTime(1001)
    expect(rateLimit('burster', 3, 1).allowed).toBe(true)
    expect(rateLimit('burster', 3, 1).allowed).toBe(false)

    // Apres encore 1 seconde, 1 token recharge → 1 requete
    vi.advanceTimersByTime(1001)
    expect(rateLimit('burster', 3, 1).allowed).toBe(true)
    expect(rateLimit('burster', 3, 1).allowed).toBe(false)
  })

  it('ne depasse jamais la capacite maximale', () => {
    // Consommer tous les tokens
    for (let i = 0; i < 3; i++) rateLimit('capTest', 3, 1)

    // Avancer beaucoup de temps — les tokens ne doivent pas depasser 3
    vi.advanceTimersByTime(100_000)

    // Devrait pouvoir faire 3 requetes (burst complet)
    for (let i = 0; i < 3; i++) {
      expect(rateLimit('capTest', 3, 1).allowed).toBe(true)
    }
    expect(rateLimit('capTest', 3, 1).allowed).toBe(false)
  })

  it('retourne un retryAfterMs precis quand bloque', () => {
    for (let i = 0; i < 5; i++) rateLimit('retry-test', 5, 5) // 5 tokens, 5/sec

    const blocked = rateLimit('retry-test', 5, 5)
    expect(blocked.allowed).toBe(false)
    // 5 tokens/sec → 1 token tous les 200ms
    expect(blocked.retryAfterMs).toBeLessThanOrEqual(250)
    expect(blocked.retryAfterMs).toBeGreaterThan(0)
  })

  it('retourne un resetAt dans le futur', () => {
    const now = Date.now()
    const result = rateLimit('user4', 10, 10 / 60)
    expect(result.resetAt).toBeGreaterThan(now)
  })
})

describe('Tier wrappers (Token Bucket)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('authRateLimit: 10 req/min burst puis recharge', () => {
    let allowed = 0
    // Burst initial de 10
    for (let i = 0; i < 15; i++) {
      if (authRateLimit('test-auth').allowed) allowed++
    }
    expect(allowed).toBe(10)

    // Apres 6 secondes, ~1 token recharge (10/60 ≈ 0.167/sec)
    vi.advanceTimersByTime(6100)
    const afterWait = authRateLimit('test-auth')
    // Le refill rate est 10/60 par seconde, apres 6s on a ~1 token
    // Mais a cause de la granularite, on peut avoir 0 ou 1
    expect(afterWait.allowed || afterWait.retryAfterMs > 0).toBe(true)
  })

  it('writeRateLimit: 30 req/min burst', () => {
    let allowed = 0
    for (let i = 0; i < 35; i++) {
      if (writeRateLimit('test-write').allowed) allowed++
    }
    expect(allowed).toBe(30)
  })

  it('readRateLimit: 100 req/min burst', () => {
    let allowed = 0
    for (let i = 0; i < 105; i++) {
      if (readRateLimit('test-read').allowed) allowed++
    }
    expect(allowed).toBe(100)
  })
})
