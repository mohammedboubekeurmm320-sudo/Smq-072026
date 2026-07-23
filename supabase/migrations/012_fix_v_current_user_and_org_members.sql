-- ============================================================================
-- 012: Fix v_current_user view — uses profile_id (not user_id) on organization_members
-- ============================================================================
-- Bug: la vue référençait `om.user_id` qui n'existe pas dans la table
-- `organization_members` (la colonne s'appelle `profile_id` dans le schéma
-- Prisma et les migrations 000/002/full_migration).
-- Conséquence: `org_role` était toujours NULL dans /api/auth/session,
-- et l'UI affichait « Membre » même pour les owners/admins.
-- ============================================================================

BEGIN;

DROP VIEW IF EXISTS public.v_current_user;

CREATE OR REPLACE VIEW public.v_current_user AS
SELECT
  p.id AS profile_id,
  p.email,
  p.full_name,
  p.role AS profile_role,
  p.active,
  p.organization_id,
  o.name AS organization_name,
  o.slug AS organization_slug,
  om.role AS org_role,
  o.settings AS org_settings
FROM profiles p
LEFT JOIN organizations o ON o.id = p.organization_id
LEFT JOIN organization_members om ON om.organization_id = o.id AND om.profile_id = p.id
WHERE p.active = true;

COMMENT ON VIEW public.v_current_user IS
  'Current user profile with org context. Fixed in 012 to use profile_id (not user_id) on organization_members.';

COMMIT;
