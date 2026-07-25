// ============================================================
// Sanitize DB error messages before returning them to the client.
//
// Bug fix (BUG-11): PostgreSQL errors were previously returned raw
// to the client, leaking schema info (table names, column names,
// constraints, enum values). This module converts technical errors
// into generic user-facing messages while preserving the technical
// detail in server logs.
// ============================================================

/**
 * Patterns that match PostgreSQL / Supabase error messages exposing
 * internal schema. If any pattern matches, the error is considered
 * "internal" and a generic message is returned to the client.
 */
const INTERNAL_ERROR_PATTERNS: RegExp[] = [
  /column .* does not exist/i,
  /relation "\w+" does not exist/i,
  /Could not find the '.*' column/i,
  /violates not-null constraint/i,
  /violates unique constraint/i,
  /violates foreign key constraint/i,
  /invalid input value for enum/i,
  /duplicate key value/i,
  /column reference .* is ambiguous/i,
  /syntax error at or near/i,
  /permission denied for/i,
  /new row for relation "\w+" violates/i,
  /null value in column/i,
  /schema cache/i,
  /relationship .* not found/i,
]

/**
 * Map specific DB error patterns to user-friendly French messages.
 * Falls back to a generic message for unmapped internal errors.
 */
const FRIENDLY_MESSAGES: { pattern: RegExp; message: string }[] = [
  {
    pattern: /null value in column "(\w+)"/i,
    message: 'Un champ obligatoire est manquant. Veuillez vérifier votre saisie.',
  },
  {
    pattern: /violates unique constraint/i,
    message: 'Un enregistrement avec cet identifiant existe déjà.',
  },
  {
    pattern: /violates foreign key constraint/i,
    message: "La référence à un autre enregistrement est invalide ou introuvable.",
  },
  {
    pattern: /invalid input value for enum (\w+)/i,
    message: 'Une valeur saisie ne fait pas partie des choix autorisés.',
  },
  {
    pattern: /duplicate key value/i,
    message: 'Un enregistrement avec ces informations existe déjà.',
  },
  {
    pattern: /column reference .* is ambiguous/i,
    message: 'Erreur interne de requête. Contactez le support si le problème persiste.',
  },
  {
    pattern: /Could not find the '(\w+)' column/i,
    message: 'Un des champs saisis est invalide. Veuillez vérifier votre saisie.',
  },
]

/**
 * Returns true if the error message looks like an internal DB error
 * that should NOT be exposed to the client.
 */
export function isInternalDbError(message: string): boolean {
  if (!message) return false
  return INTERNAL_ERROR_PATTERNS.some(p => p.test(message))
}

/**
 * Convert a raw error message (potentially from PostgreSQL/Supabase)
 * into a safe, user-friendly French message.
 *
 * Always log the original message server-side for debugging.
 */
export function sanitizeDbError(message: string | undefined | null): string {
  if (!message) return 'Une erreur est survenue. Veuillez réessayer.'

  // Try to find a specific friendly message
  for (const { pattern, message: friendly } of FRIENDLY_MESSAGES) {
    if (pattern.test(message)) {
      // Log original for server-side debugging
      if (typeof console !== 'undefined') {
        console.error('[sanitizeDbError] original:', message, '→ friendly:', friendly)
      }
      return friendly
    }
  }

  // If the message matches any internal pattern but no friendly mapping,
  // return a generic message
  if (isInternalDbError(message)) {
    if (typeof console !== 'undefined') {
      console.error('[sanitizeDbError] unmapped internal error:', message)
    }
    return 'Une erreur est survenue lors du traitement de votre demande. Veuillez réessayer ou contacter le support.'
  }

  // Otherwise, the message is already user-friendly (e.g. "Champs obligatoires manquants")
  return message
}
