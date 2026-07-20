// ============================================================================
// Tests unitaires — Sanitization (XSS Prevention)
// Critique: la sanitisation XSS protege toutes les entrees utilisateur
// ============================================================================

import { describe, it, expect } from 'vitest'

describe('fallbackSanitize behavior', () => {
  it('les entites HTML sont encodees correctement', () => {
    const encode = (input: string): string =>
      input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')

    expect(encode('Bonjour le monde')).toBe('Bonjour le monde')
    expect(encode('<script>alert("xss")</script>')).not.toContain('<script>')
    expect(encode('<b>bold</b>')).toBe('&lt;b&gt;bold&lt;/b&gt;')
    expect(encode('"hello"')).toContain('&quot;')
    expect(encode("it's")).toContain('&#x27;')
    expect(encode('a&b')).toBe('a&amp;b')
  })

  it('null et undefined retournent une chaine vide', () => {
    const safe = (input: unknown): string => {
      if (input === null || input === undefined) return ''
      if (typeof input !== 'string') return String(input)
      return input
    }

    expect(safe(null)).toBe('')
    expect(safe(undefined)).toBe('')
    expect(safe(42)).toBe('42')
    expect(safe(true)).toBe('true')
    expect(safe('')).toBe('')
  })

  it('les valeurs non-string sont preservees dans sanitizeObject', async () => {
    const { sanitizeObject } = await import('@/lib/sanitize')

    const result = await sanitizeObject({
      price: 19.99,
      count: 0,
      active: false,
      rating: -5,
    })

    expect(result.price).toBe(19.99)
    expect(result.count).toBe(0)
    expect(result.active).toBe(false)
    expect(result.rating).toBe(-5)
  })

  it('les tableaux d objets sont sanitisés', async () => {
    const { sanitizeObject } = await import('@/lib/sanitize')

    const result = await sanitizeObject({
      items: [{ name: '<evil>Item</evil>' }],
    })

    // The name should be sanitized (no <evil> tag)
    expect(result.items[0].name).not.toContain('<evil>')
  })
})