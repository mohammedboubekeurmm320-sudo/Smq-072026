-- ============================================================================
-- 014: Supprimer l'ancienne fonction get_upcoming_deadlines(text, int)
-- qui crée une ambiguïté avec la nouvelle get_upcoming_deadlines(uuid, int)
-- ============================================================================
-- Contexte: la migration 004 avait créé une fonction get_upcoming_deadlines
-- avec la signature (text, int). La migration 013 (v8) a créé une seconde
-- fonction avec la signature (uuid, int) pour matcher le type réel de
-- p_org_id côté code applicatif.
--
-- Quand l'API appelle la fonction via Supabase RPC avec une string,
-- PostgreSQL ne sait pas laquelle choisir et renvoie:
--   "Could not choose the best candidate function between:
--    public.get_upcoming_deadlines(p_org_id => text, p_days_ahead => integer),
--    public.get_upcoming_deadlines(p_org_id => uuid, p_days_ahead => integer)"
--
-- Solution: supprimer l'ancienne signature (text, int). La nouvelle
-- (uuid, int) accepte aussi les strings (PostgreSQL cast automatiquement
-- les chaînes UUID valides en uuid).
-- ============================================================================

-- Vérifier les fonctions existantes AVANT
SELECT proname, pg_get_function_identity_arguments(oid) AS args
FROM pg_proc
WHERE proname = 'get_upcoming_deadlines';

-- Supprimer l'ancienne signature (text, int) — celle qui crée l'ambiguïté
DROP FUNCTION IF EXISTS public.get_upcoming_deadlines(text, integer);

-- Vérifier les fonctions restantes APRÈS (doit n'en rester qu'une)
SELECT proname, pg_get_function_identity_arguments(oid) AS args
FROM pg_proc
WHERE proname = 'get_upcoming_deadlines';
