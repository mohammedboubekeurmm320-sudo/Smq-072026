-- ============================================================
-- DIAGNOSTIC LOGIN CRASH — QMS Smq-072026
-- À exécuter dans Supabase Dashboard → SQL Editor
-- ============================================================
-- Simule exactement ce que fait /api/auth/login + middleware + 
-- /api/auth/session pour identifier où ça casse.
-- ============================================================

-- ============================================================
-- TEST 1: La vue v_current_user fonctionne-t-elle pour les profiles existants ?
-- ============================================================
-- Cette vue est utilisée par /api/auth/session. Si elle retourne NULL
-- pour un profile valide, c'est ça qui cause le crash de login.

SELECT 'TEST 1: v_current_user pour les profiles existants' AS section;

SELECT
  vcu.profile_id,
  vcu.email,
  vcu.full_name,
  vcu.profile_role,
  vcu.organization_id,
  vcu.organization_name,
  vcu.organization_slug,
  vcu.org_role,           -- DOIT être non-NULL pour les admins/owners
  vcu.active
FROM v_current_user vcu
ORDER BY vcu.profile_id;

-- ATTENTION: Si org_role est NULL pour tous les profiles, c'est le bug.
-- La vue utilise probablement encore `om.profile_id` au lieu de `om.user_id`.
-- Solution: voir section "FIX VUE" ci-dessous.


-- ============================================================
-- TEST 2: Vérifier la définition SQL de la vue v_current_user
-- ============================================================
SELECT 'TEST 2: Définition SQL de v_current_user' AS section;

SELECT definition
FROM pg_views
WHERE schemaname = 'public' AND viewname = 'v_current_user';

-- Si la définition contient `om.profile_id`, c'est le bug.
-- Elle devrait contenir `om.user_id = p.id`.


-- ============================================================
-- TEST 3: La table organization_members a-t-elle user_id ou profile_id ?
-- ============================================================
SELECT 'TEST 3: Colonnes de organization_members' AS section;

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'organization_members'
ORDER BY ordinal_position;

-- Si la table a `user_id` → la vue doit utiliser `om.user_id`
-- Si la table a `profile_id` → la vue doit utiliser `om.profile_id`
-- IMPORTANT: l'un des deux cassera login jusqu'à ce qu'on aligne.


-- ============================================================
-- TEST 4: Vérifier qu'il y a bien des memberships actifs
-- ============================================================
SELECT 'TEST 4: Memberships actifs' AS section;

SELECT
  om.id AS membership_id,
  om.organization_id,
  o.name AS org_name,
  om.user_id,             -- ou om.profile_id selon le schéma
  p.email,
  om.role,
  om.status
FROM organization_members om
JOIN organizations o ON o.id = om.organization_id
JOIN profiles p ON p.id = om.user_id  -- ou p.id = om.profile_id
WHERE om.status = 'active'
ORDER BY om.created_at DESC;

-- Si cette requête ne retourne aucune ligne, login échouera toujours
-- car le code cherche `membership` pour déterminer organizationId.


-- ============================================================
-- TEST 5: Quelles colonnes a la table sessions ?
-- ============================================================
SELECT 'TEST 5: Colonnes de sessions' AS section;

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'sessions'
ORDER BY ordinal_position;

-- Si sessions a une colonne `updated_at` NOT NULL → login va échouer
-- car signup/route.ts ne l'envoie pas lors de l'INSERT.


-- ============================================================
-- TEST 6: Quelles colonnes a la table organizations ?
-- ============================================================
SELECT 'TEST 6: Colonnes de organizations' AS section;

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'organizations'
ORDER BY ordinal_position;

-- Vérifier si `updated_at` est NOT NULL sans DEFAULT.
-- Si oui, tous les INSERT doivent fournir updated_at explicitement.


-- ============================================================
-- TEST 7: Quelles colonnes a la table profiles ?
-- ============================================================
SELECT 'TEST 7: Colonnes de profiles' AS section;

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;


-- ============================================================
-- TEST 8: Vérifier le contenu de l'index sur organization_members
-- (prouve quel nom de colonne est réellement utilisé)
-- ============================================================
SELECT 'TEST 8: Indexes sur organization_members' AS section;

SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'organization_members';

-- Si vous voyez un index nommé idx_org_members_user utilisant (user_id),
-- c'est la PREUVE DÉFINITIVE que la colonne réelle est `user_id`.


-- ============================================================
-- TEST 9: Vérifier la signature de set_user_context
-- ============================================================
SELECT 'TEST 9: Fonction set_user_context' AS section;

SELECT
  p.proname,
  pg_get_function_arguments(p.oid) AS args,
  pg_get_function_result(p.oid) AS return_type
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'set_user_context';

-- Le code appelle: client.rpc('set_user_context', { p_user_id: profileId })
-- Si la signature attend 2 args (p_user_id, p_org_id), l'appel échoue silencieusement.
-- C'est OK car il y a un try/catch, mais c'est suspect.


-- ============================================================
-- FIX VUE — À exécuter UNIQUEMENT si TEST 2 confirme le bug
-- ============================================================
-- Si la vue utilise `om.profile_id` au lieu de `om.user_id`,
-- exécutez ce qui suit pour la corriger :

/*
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
*/
