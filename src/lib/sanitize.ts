// ============================================================================
// Server-side input sanitization — XSS prevention
// ============================================================================
// Wraps DOMPurify for isomorphic usage (server + client).
// Falls back to basic HTML entity escaping if DOMPurify is unavailable.
// ============================================================================

let _sanitizeFn: ((input: string) => string) | null = null
let _sanitizeInit = false

/**
 * Lazy-loads isomorphic-dompurify for server-side use.
 * On client-side, uses the browser DOMPurify directly.
 */
async function getSanitizeFn(): Promise<(input: string) => string> {
  if (_sanitizeFn) return _sanitizeFn
  if (_sanitizeInit) return fallbackSanitize
  _sanitizeInit = true

  try {
    if (typeof window !== 'undefined') {
      // Client-side: use browser DOMPurify if loaded
      const mod = await import('isomorphic-dompurify')
      _sanitizeFn = mod.default || (mod as any).sanitize || fallbackSanitize
    } else {
      // Server-side: use isomorphic-dompurify (includes jsdom)
      const mod = await import('isomorphic-dompurify')
      _sanitizeFn = mod.default || (mod as any).sanitize || fallbackSanitize
    }
  } catch {
    // If isomorphic-dompurify is not installed, use fallback
    _sanitizeFn = fallbackSanitize
  }

  return _sanitizeFn
}

/**
 * Fallback sanitizer — strips all HTML tags and encodes entities.
 * Less thorough than DOMPurify but covers the critical XSS vectors.
 */
function fallbackSanitize(input: string): string {
  if (!input || typeof input !== 'string') return input || ''
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

/**
 * Sanitizes a string to prevent XSS attacks.
 * - On server: lazy-loads isomorphic-dompurify
 * - Fallback: HTML entity encoding
 *
 * Usage in API routes:
 *   const clean = await sanitizeInput(req.body.description)
 */
export async function sanitizeInput(input: unknown): Promise<string> {
  if (input === null || input === undefined) return ''
  if (typeof input !== 'string') return String(input)

  const sanitize = await getSanitizeFn()
  return sanitize(input)
}

/**
 * Synchronous version for use in Zod transforms or non-async contexts.
 * Uses the fallback sanitizer if DOMPurify hasn't been loaded yet.
 */
export function sanitizeInputSync(input: unknown): string {
  if (input === null || input === undefined) return ''
  if (typeof input !== 'string') return String(input)
  return _sanitizeFn ? _sanitizeFn(input) : fallbackSanitize(input)
}

/**
 * Sanitizes all string values in an object recursively.
 * Preserves non-string values (numbers, booleans, arrays of objects, etc.).
 */
export async function sanitizeObject<T extends Record<string, any>>(obj: T): Promise<T> {
  const result: Record<string, any> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      result[key] = value
    } else if (typeof value === 'string') {
      result[key] = await sanitizeInput(value)
    } else if (Array.isArray(value)) {
      result[key] = await Promise.all(
        value.map((item) =>
          typeof item === 'object' && item !== null
            ? sanitizeObject(item as Record<string, any>)
            : sanitizeInput(item),
        ),
      )
    } else if (typeof value === 'object') {
      result[key] = await sanitizeObject(value as Record<string, any>)
    } else {
      result[key] = value
    }
  }
  return result as T
}