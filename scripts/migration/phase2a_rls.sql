-- ============================================================
-- PHASE 2A v3 : ROW LEVEL SECURITY (RLS) MULTI-TENANT
-- CORRIGÉ v3: détection dynamique de la colonne sessions
-- + bloc cleanup pour ré-exécution
-- Exécuter dans Supabase SQL Editor APRÈS la Phase 1
-- ============================================================

-- ==========================================
-- CLEANUP: supprimer toutes les policies RLS existantes
-- (permet les ré-exécutions sans erreur)
-- ==========================================
DO $$ DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
    END LOOP;
    RAISE NOTICE 'Cleanup: toutes les policies RLS ont été supprimées';
END $$;

-- ==========================================
-- Fonction utilitaire: récupérer l'org_id du user courant
-- Utilise set_config('app.user_id', ..., true) par le middleware
-- ==========================================
CREATE OR REPLACE FUNCTION current_user_org_id()
RETURNS TEXT AS $$
DECLARE
    v_user_id TEXT;
    v_org_id TEXT;
BEGIN
    v_user_id := NULLIF(current_setting('app.user_id', true), '');
    
    IF v_user_id IS NULL THEN
        RETURN NULL;
    END IF;
    
    SELECT organization_id INTO v_org_id
    FROM organization_members
    WHERE user_id = v_user_id
      AND status = 'active'
    LIMIT 1;
    
    RETURN v_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ==========================================
-- Fonction utilitaire: vérifier si l'utilisateur est admin/owner
-- ==========================================
CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id TEXT;
BEGIN
    v_user_id := NULLIF(current_setting('app.user_id', true), '');
    IF v_user_id IS NULL THEN RETURN false; END IF;
    
    RETURN EXISTS (
        SELECT 1 FROM organization_members
        WHERE user_id = v_user_id
          AND role IN ('owner', 'admin')
          AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ==========================================
-- 1. Activer RLS sur toutes les tables
-- ==========================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE electronic_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_prerequisites ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE capas ENABLE ROW LEVEL SECURITY;
ALTER TABLE non_conformances ENABLE ROW LEVEL SECURITY;
ALTER TABLE deviations ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE training ENABLE ROW LEVEL SECURITY;
ALTER TABLE risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_trails ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_code_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE record_type_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE record_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 2. Politiques RLS: organizations
-- ==========================================
CREATE POLICY org_select ON organizations
    FOR SELECT USING (
        id IN (SELECT organization_id FROM organization_members WHERE user_id = NULLIF(current_setting('app.user_id', true), ''))
    );
CREATE POLICY org_insert ON organizations
    FOR INSERT WITH CHECK (true);
CREATE POLICY org_update ON organizations
    FOR UPDATE USING (
        id IN (SELECT organization_id FROM organization_members WHERE user_id = NULLIF(current_setting('app.user_id', true), '') AND role IN ('owner', 'admin'))
    );

-- ==========================================
-- 3. Politiques RLS: profiles
-- ==========================================
CREATE POLICY profiles_select ON profiles
    FOR SELECT USING (
        organization_id = current_user_org_id()
        OR id = NULLIF(current_setting('app.user_id', true), '')
    );
CREATE POLICY profiles_update ON profiles
    FOR UPDATE USING (
        id = NULLIF(current_setting('app.user_id', true), '')
        OR (
            organization_id = current_user_org_id()
            AND is_current_user_admin()
        )
    );

-- ==========================================
-- 4. Politiques RLS: sessions (DYNAMIQUE)
-- Détecte automatiquement le nom de la colonne FK vers profiles
-- ==========================================
DO $$
DECLARE
    v_col TEXT;
    v_setting_expr TEXT;
BEGIN
    -- Chercher la colonne dans sessions qui référence profiles(id)
    SELECT c.column_name INTO v_col
    FROM information_schema.columns c
    JOIN information_schema.table_constraints tc
        ON tc.table_name = c.table_name
       AND tc.table_schema = c.table_schema
       AND tc.constraint_type = 'FOREIGN KEY'
    JOIN information_schema.key_column_usage kcu
        ON kcu.constraint_name = tc.constraint_name
       AND kcu.table_schema = tc.table_schema
    JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
       AND ccu.table_schema = tc.table_schema
    WHERE c.table_name = 'sessions'
      AND c.table_schema = 'public'
      AND ccu.table_name = 'profiles'
      AND ccu.column_name = 'id'
    LIMIT 1;

    -- Fallback: chercher une colonne profil/user/account
    IF v_col IS NULL THEN
        SELECT column_name INTO v_col
        FROM information_schema.columns
        WHERE table_name = 'sessions'
          AND table_schema = 'public'
          AND column_name IN ('profile_id', 'user_id', 'account_id', 'member_id')
        LIMIT 1;
    END IF;

    v_setting_expr := 'NULLIF(current_setting(''app.user_id'', true), '''')';

    IF v_col IS NOT NULL THEN
        RAISE NOTICE 'Sessions RLS: colonne détectée = %', v_col;
        EXECUTE format(
            'CREATE POLICY sessions_select ON sessions FOR SELECT USING (%I = %s)',
            v_col, v_setting_expr
        );
        EXECUTE format(
            'CREATE POLICY sessions_insert ON sessions FOR INSERT WITH CHECK (true)'
        );
        EXECUTE format(
            'CREATE POLICY sessions_delete ON sessions FOR DELETE USING (%I = %s)',
            v_col, v_setting_expr
        );
    ELSE
        RAISE NOTICE 'Sessions RLS: aucune colonne FK profiles détectée, policies omises';
        RAISE NOTICE 'Colonnes de sessions: %',
            (SELECT string_agg(column_name, ', ') FROM information_schema.columns WHERE table_name = 'sessions' AND table_schema = 'public');
    END IF;
END $$;

-- ==========================================
-- 5. Politiques RLS: organization_members
-- ==========================================
CREATE POLICY org_members_select ON organization_members
    FOR SELECT USING (organization_id = current_user_org_id());
CREATE POLICY org_members_insert ON organization_members
    FOR INSERT WITH CHECK (organization_id = current_user_org_id());
CREATE POLICY org_members_update ON organization_members
    FOR UPDATE USING (
        organization_id = current_user_org_id()
        AND is_current_user_admin()
    );
CREATE POLICY org_members_delete ON organization_members
    FOR DELETE USING (
        organization_id = current_user_org_id()
        AND is_current_user_admin()
    );

-- ==========================================
-- 6. Politiques RLS génériques multi-tenant
-- Tables avec organization_id standard
-- ==========================================
DO $$ DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN SELECT unnest(ARRAY[
        'documents','electronic_signatures','document_prerequisites',
        'form_templates','form_instances','capas','non_conformances',
        'deviations','change_controls','audits','training','risks',
        'suppliers','batch_records','document_triggers','document_relationships',
        'document_code_sequences','record_type_definitions','record_links',
        'scheduled_reports'
    ]) LOOP
        EXECUTE format(
            'CREATE POLICY %I_select ON %I FOR SELECT USING (organization_id = current_user_org_id())',
            tbl, tbl
        );
        EXECUTE format(
            'CREATE POLICY %I_insert ON %I FOR INSERT WITH CHECK (organization_id = current_user_org_id())',
            tbl, tbl
        );
        EXECUTE format(
            'CREATE POLICY %I_update ON %I FOR UPDATE USING (organization_id = current_user_org_id())',
            tbl, tbl
        );
        EXECUTE format(
            'CREATE POLICY %I_delete ON %I FOR DELETE USING (organization_id = current_user_org_id() AND is_current_user_admin())',
            tbl, tbl
        );
    END LOOP;
END $$;

-- ==========================================
-- 7. Politiques RLS: departments
-- ==========================================
CREATE POLICY depts_select ON departments
    FOR SELECT USING (organization_id = current_user_org_id());
CREATE POLICY depts_insert ON departments
    FOR INSERT WITH CHECK (organization_id = current_user_org_id() AND is_current_user_admin());
CREATE POLICY depts_update ON departments
    FOR UPDATE USING (organization_id = current_user_org_id() AND is_current_user_admin());

-- ==========================================
-- 8. Politiques RLS: audit_trails (lecture seule)
-- ==========================================
CREATE POLICY audit_select ON audit_trails
    FOR SELECT USING (organization_id = current_user_org_id());

-- ==========================================
-- 9. Politiques RLS: audit_config (singleton)
-- ==========================================
CREATE POLICY audit_config_select ON audit_config
    FOR SELECT USING (true);

-- ==========================================
-- 10. Politiques RLS: notifications
-- ==========================================
CREATE POLICY notif_select ON notifications
    FOR SELECT USING (
        profile_id = NULLIF(current_setting('app.user_id', true), '')
    );
CREATE POLICY notif_insert ON notifications
    FOR INSERT WITH CHECK (true);
CREATE POLICY notif_update ON notifications
    FOR UPDATE USING (
        profile_id = NULLIF(current_setting('app.user_id', true), '')
    );

-- ==========================================
-- Vérification finale
-- ==========================================
DO $$
DECLARE
    v_count INTEGER;
    v_tables_with_rls INTEGER;
    v_detail TEXT;
BEGIN
    SELECT COUNT(*), string_agg(tablename || '.' || policyname, '; ' ORDER BY tablename, policyname)
    INTO v_count, v_detail
    FROM pg_policies
    WHERE schemaname = 'public';

    SELECT COUNT(DISTINCT tablename)
    INTO v_tables_with_rls
    FROM pg_policies
    WHERE schemaname = 'public';

    RAISE NOTICE '=== PHASE 2A TERMINEE ===';
    RAISE NOTICE 'Tables avec RLS activée: %', v_tables_with_rls;
    RAISE NOTICE 'Total policies créées: %', v_count;
    RAISE NOTICE 'Detail: %', v_detail;
END $$;