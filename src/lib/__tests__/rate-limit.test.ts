// ============================================================================
// Tests unitaires — Rate Limiter
// Critique: securite anti-abus pour endpoints auth et API
// ============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { rateLimit, authRateLimit, writeRateLimit, readRateLimit } from '@/lib/rate-limit'

describe('rateLimit', () => {
  beforeEach(() => {
    // Reset internal state by manipulating Date.now
    vi.useFakeTimers()
  })

  it('autorise la premiere requete', () => {
    const result = rateLimit('user1', 5)
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(4)
  })

  it('autorise jusqu\'au max puis bloque', () => {
    for (let i = 0; i < 5; i++) {
      const result = rateLimit('user2', 5)
      expect(result.allowed).toBe(true)
    }
    // 6eme requete doit etre bloquee
    const blocked = rateLimit('user2', 5)
    expect(blocked.allowed).toBe(false)
    expect(blocked.remaining).toBe(0)
  })

  it('separe les compteurs par cle', () => {
    const r1 = rateLimit('userA', 1)
    expect(r1.allowed).toBe(true)
    const r2 = rateLimit('userB', 1)
    expect(r2.allowed).toBe(true)
    // userA est deja a 1/1
    const r1b = rateLimit('userA', 1)
    expect(r1b.allowed).toBe(false)
  })

  it('reinitialise la fenetre apres expiration', () => {
    const first = rateLimit('user3', 2, 1000)
    expect(first.allowed).toBe(true)
    expect(first.remaining).toBe(1)

    // Avancer le temps au-dela de la fenetre
    vi.advanceTimersByTime(1001)

    const afterReset = rateLimit('user3', 2, 1000)
    expect(afterReset.allowed).toBe(true)
    expect(afterReset.remaining).toBe(1)
  })

  it('retourne un resetAt dans le futur', () => {
    const now = Date.now()
    const result = rateLimit('user4', 10, 60_000)
    expect(result.resetAt).toBeGreaterThan(now)
  })
})

describe('Tier wrappers', () => {
  it('authRateLimit: 10 req/min', () => {
    let allowed = 0
    for (let i = 0; i < 15; i++) {
      const r = authRateLimit('test-auth')
      if (r.allowed) allowed++
    }
    expect(allowed).toBe(10)
  })

  it('writeRateLimit: 30 req/min', () => {
    let allowed = 0
    for (let i = 0; i < 35; i++) {
      const r = writeRateLimit('test-write')
      if (r.allowed) allowed++
    }
    expect(allowed).toBe(30)
  })

  it('readRateLimit: 100 req/min', () => {
    let allowed = 0
    for (let i = 0; i < 105; i++) {
      const r = readRateLimit('test-read')
      if (r.allowed) allowed++
    }
    expect(allowed).toBe(100)
  })
})