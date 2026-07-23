-- ============================================================================
-- 012: Fix v_current_user view — uses user_id (correct column) on organization_members
-- ============================================================================
-- Bug: la vue référençait `om.user_id` (inexistant) ou `om.profile_id` (inexistant)
-- La colonne correcte dans organization_members dépend du schéma réel de la DB.
--
-- IMPORTANT: la colonne réelle en base est `user_id` (vérifié via l'index
-- idx_org_members_user de la migration 008 qui a été appliquée avec succès).
-- Les fichiers Prisma / migration 000 mentionnent `profile_id` mais ils sont
-- OBSOLÈTES par rapport à la base de données réelle.
-- ============================================================================

BEGIN;

-- Supprimer la vue si elle existe
DROP VIEW IF EXISTS public.v_current_user;

-- Recréer la vue avec la jointure correcte
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
LEFT JOIN organization_members om ON om.organization_id = o.id AND om.user_id = p.id
WHERE p.active = true;

-- Commentaire sur la vue
COMMENT ON VIEW public.v_current_user IS
  'Current user profile with org context. Fixed in 012 to use user_id (correct column) on organization_members.';

COMMIT;

-- ============================================================================
-- Vérification facultative
-- ============================================================================
-- SELECT * FROM public.v_current_user LIMIT 5;
--
-- Vérifier que org_role n'est plus NULL:
-- SELECT profile_id, email, org_role FROM public.v_current_user;
