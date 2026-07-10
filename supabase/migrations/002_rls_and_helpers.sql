-- ============================================================================
-- Migration 002 : RLS Multi-tenant + Fonctions helper
-- ============================================================================
-- Securite defensive en profondeur (defense in depth).
-- L'app accede a la DB via API routes (Prisma + service_role),
-- ces politiques RLS protegent en cas d'acces direct au client Supabase.
--
-- NOTE: Cette app utilise un auth custom (bcrypt + session cookie).
-- Les fonctions helper lisent l'ID utilisateur depuis:
--   1) JWT Supabase claim 'profile_id' (si Supabase Auth est active)
--   2) Variable locale 'app.user_id' (posee par les API routes)
-- ============================================================================

BEGIN;

-- ============================================================================
-- Helper functions
-- ============================================================================

CREATE OR REPLACE FUNCTION current_profile_id()
RETURNS TEXT AS $$
DECLARE
  v_claim_id TEXT;
  v_setting_id TEXT;
BEGIN
  -- Essai 1: JWT claim profile_id
  BEGIN
    v_claim_id := (current_setting('request.jwt.claims', true)::json->>'profile_id');
    IF v_claim_id IS NOT NULL AND v_claim_id != '' THEN RETURN v_claim_id; END IF;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  -- Essai 2: Variable locale API
  BEGIN
    v_setting_id := current_setting('app.user_id', true);
    IF v_setting_id IS NOT NULL AND v_setting_id != '' THEN RETURN v_setting_id; END IF;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION is_org_member(p_org_id TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = p_org_id AND profile_id = current_profile_id() AND status = 'active'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_org_admin(p_org_id TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = p_org_id AND profile_id = current_profile_id()
      AND status = 'active' AND role IN ('owner', 'admin')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION current_org_id()
RETURNS TEXT AS $$
  SELECT organization_id FROM profiles
  WHERE id = current_profile_id() AND active = true LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================================
-- Enable RLS on ALL 27 data tables
-- ============================================================================

DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'organizations','profiles','organization_members','sessions',
    'departments','documents','electronic_signatures',
    'document_prerequisites','document_triggers','document_relationships',
    'document_code_sequences','form_templates','form_instances',
    'capas','non_conformances','deviations','change_controls',
    'audits','risks','training','batch_records','suppliers',
    'audit_trails','record_type_definitions','record_links',
    'custom_field_definitions','scheduled_reports'
  ]) LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- ============================================================================
-- Standard RLS macro: 4 politiques CRUD par table
-- ============================================================================

CREATE OR REPLACE FUNCTION create_std_rls(p_table TEXT)
RETURNS VOID AS $$
BEGIN
  EXECUTE format('CREATE OR REPLACE POLICY %I_sel ON %I FOR SELECT TO authenticated USING (is_org_member(organization_id))', p_table, p_table);
  EXECUTE format('CREATE OR REPLACE POLICY %I_ins ON %I FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id))', p_table, p_table);
  EXECUTE format('CREATE OR REPLACE POLICY %I_upd ON %I FOR UPDATE TO authenticated USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id))', p_table, p_table);
  EXECUTE format('CREATE OR REPLACE POLICY %I_del ON %I FOR DELETE TO authenticated USING (is_org_member(organization_id))', p_table, p_table);
END;
$$ LANGUAGE plpgsql;

-- 21 tables metier: politiques standard
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'documents','electronic_signatures','document_prerequisites',
    'document_triggers','document_relationships','document_code_sequences',
    'form_templates','form_instances',
    'capas','non_conformances','deviations','change_controls',
    'audits','risks','training','batch_records','suppliers',
    'departments','record_links','custom_field_definitions','scheduled_reports'
  ]) LOOP
    PERFORM create_std_rls(t);
  END LOOP;
END $$;

-- ============================================================================
-- Tables avec politiques speciales
-- ============================================================================

-- audit_trails: INSERT seulement (immuable)
CREATE OR REPLACE POLICY audit_trails_sel ON audit_trails
  FOR SELECT TO authenticated USING (is_org_member(organization_id));
CREATE OR REPLACE POLICY audit_trails_ins ON audit_trails
  FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));

-- record_type_definitions: lecture membres, ecriture admin
CREATE OR REPLACE POLICY rtd_sel ON record_type_definitions
  FOR SELECT TO authenticated USING (is_org_member(organization_id));
CREATE OR REPLACE POLICY rtd_ins ON record_type_definitions
  FOR INSERT TO authenticated WITH CHECK (is_org_admin(organization_id));
CREATE OR REPLACE POLICY rtd_upd ON record_type_definitions
  FOR UPDATE TO authenticated USING (is_org_admin(organization_id)) WITH CHECK (is_org_admin(organization_id));
CREATE OR REPLACE POLICY rtd_del ON record_type_definitions
  FOR DELETE TO authenticated USING (is_org_admin(organization_id));

-- organizations: membre=lecture, libre=creation, admin=update, owner=delete
CREATE OR REPLACE POLICY orgs_sel ON organizations
  FOR SELECT TO authenticated USING (is_org_member(id));
CREATE OR REPLACE POLICY orgs_ins ON organizations
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE OR REPLACE POLICY orgs_upd ON organizations
  FOR UPDATE TO authenticated USING (is_org_admin(id)) WITH CHECK (is_org_admin(id));
CREATE OR REPLACE POLICY orgs_del ON organizations
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM organization_members WHERE organization_id = id AND profile_id = current_profile_id() AND role = 'owner' AND status = 'active')
  );

-- profiles: son profil ou profil de son org
CREATE OR REPLACE POLICY profiles_sel ON profiles
  FOR SELECT TO authenticated USING (id = current_profile_id() OR is_org_member(organization_id));
CREATE OR REPLACE POLICY profiles_ins ON profiles
  FOR INSERT TO authenticated WITH CHECK (id = current_profile_id());
CREATE OR REPLACE POLICY profiles_upd ON profiles
  FOR UPDATE TO authenticated USING (id = current_profile_id() OR is_org_admin(organization_id))
  WITH CHECK (id = current_profile_id() OR is_org_admin(organization_id));

-- organization_members
CREATE OR REPLACE POLICY om_sel ON organization_members
  FOR SELECT TO authenticated USING (profile_id = current_profile_id() OR is_org_member(organization_id));
CREATE OR REPLACE POLICY om_ins ON organization_members
  FOR INSERT TO authenticated WITH CHECK (profile_id = current_profile_id() OR is_org_admin(organization_id));
CREATE OR REPLACE POLICY om_upd ON organization_members
  FOR UPDATE TO authenticated USING (is_org_admin(organization_id)) WITH CHECK (is_org_admin(organization_id));
CREATE OR REPLACE POLICY om_del ON organization_members
  FOR DELETE TO authenticated USING (is_org_admin(organization_id));

-- sessions: proprietaire ou admin de l'org
CREATE OR REPLACE POLICY sessions_sel ON sessions
  FOR SELECT TO authenticated USING (
    profile_id = current_profile_id() OR is_org_admin((SELECT organization_id FROM profiles WHERE id = profile_id LIMIT 1))
  );
CREATE OR REPLACE POLICY sessions_ins ON sessions
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE OR REPLACE POLICY sessions_del ON sessions
  FOR DELETE TO authenticated USING (
    profile_id = current_profile_id() OR is_org_admin((SELECT organization_id FROM profiles WHERE id = profile_id LIMIT 1))
  );

-- ============================================================================
-- create_organization_for_user
-- ============================================================================
CREATE OR REPLACE FUNCTION create_organization_for_user(
  p_user_id TEXT, p_name TEXT, p_slug TEXT, p_settings JSONB DEFAULT '{}'
) RETURNS TEXT AS $$
DECLARE v_org_id TEXT;
BEGIN
  INSERT INTO organizations (name, slug, settings)
  VALUES (p_name, p_slug, p_settings) RETURNING id INTO v_org_id;
  INSERT INTO organization_members (organization_id, profile_id, role, status)
  VALUES (v_org_id, p_user_id, 'owner', 'active');
  UPDATE profiles SET organization_id = v_org_id, updated_at = now() WHERE id = p_user_id;
  RETURN v_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
