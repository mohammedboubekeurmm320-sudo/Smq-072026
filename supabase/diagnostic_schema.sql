-- ============================================================
-- DIAGNOSTIC SCHÉMA — QMS Smq-072026
-- À exécuter dans Supabase Dashboard → SQL Editor
-- Vérifie les colonnes NOT NULL sans DEFAULT sur les 4 tables
-- critiques pour l'authentification.
-- ============================================================

-- 1. COLONNES DE organizations
SELECT
  'organizations' AS table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'organizations'
ORDER BY ordinal_position;

-- 2. COLONNES DE profiles
SELECT
  'profiles' AS table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 3. COLONNES DE organization_members
SELECT
  'organization_members' AS table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'organization_members'
ORDER BY ordinal_position;

-- 4. COLONNES DE sessions
SELECT
  'sessions' AS table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'sessions'
ORDER BY ordinal_position;

-- 5. COLONNES DE record_type_definitions (utilisé par seedSystemRecordTypes)
SELECT
  'record_type_definitions' AS table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'record_type_definitions'
ORDER BY ordinal_position;

-- 6. Vérifier si la vue v_current_user existe et utilise user_id (correct) ou profile_id (cassé)
SELECT viewname, definition
FROM pg_views
WHERE schemaname = 'public' AND viewname = 'v_current_user';

-- 7. Vérifier que l'index idx_org_members_user existe (prouve que user_id est la bonne colonne)
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'organization_members';

-- 8. Vérifier que la fonction set_user_context existe et sa signature
SELECT
  n.nspname AS schema,
  p.proname AS function_name,
  pg_get_function_arguments(p.oid) AS args,
  pg_get_function_result(p.oid) AS return_type
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname IN ('set_user_context', 'get_upcoming_deadlines', 'validate_status_transition');

-- 9. Lister les 5 derniers users créés (pour debug login)
SELECT id, email, full_name, role, active, organization_id, created_at, last_login_at
FROM profiles
ORDER BY created_at DESC
LIMIT 5;

-- 10. Lister les sessions actives (pour debug login crash)
SELECT s.id, s.profile_id, s.expires_at, s.created_at, p.email
FROM sessions s
JOIN profiles p ON p.id = s.profile_id
ORDER BY s.created_at DESC
LIMIT 10;
