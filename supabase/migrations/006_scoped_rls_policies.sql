-- ============================================================================
-- Migration 006 : Restaurer l'isolation multi-tenant (RLS correcte)
-- ============================================================================
-- Projet : smq-iso-13485-pro
-- Instance Supabase : qhstvynjkrygwxilqaih.supabase.co
-- ============================================================================

BEGIN;

-- PARTIE A : Fonctions helper
CREATE OR REPLACE FUNCTION is_org_member(org_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id AND user_id = auth.uid() AND status = 'active'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_org_admin(org_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id AND user_id = auth.uid() AND status = 'active'
      AND role IN ('owner', 'admin')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_org_owner(org_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id AND user_id = auth.uid() AND status = 'active'
      AND role = 'owner'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION current_user_email()
RETURNS text AS $$
  SELECT email FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION current_user_org_id()
RETURNS uuid AS $$
  SELECT organization_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- PARTIE B : 21 tables metier (pattern : is_org_member(organization_id))
-- B1. documents
DROP POLICY IF EXISTS "auth_select_documents" ON documents;
DROP POLICY IF EXISTS "auth_insert_documents" ON documents;
DROP POLICY IF EXISTS "auth_update_documents" ON documents;
DROP POLICY IF EXISTS "auth_delete_documents" ON documents;
DROP POLICY IF EXISTS "documents_rw" ON documents;
CREATE POLICY documents_select ON documents FOR SELECT TO authenticated USING (is_org_member(organization_id));
CREATE POLICY documents_insert ON documents FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));
CREATE POLICY documents_update ON documents FOR UPDATE TO authenticated USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));
CREATE POLICY documents_delete ON documents FOR DELETE TO authenticated USING (is_org_member(organization_id));

-- B2. electronic_signatures (immutable)
DROP POLICY IF EXISTS "auth_select_electronic_signatures" ON electronic_signatures;
DROP POLICY IF EXISTS "auth_insert_electronic_signatures" ON electronic_signatures;
DROP POLICY IF EXISTS "auth_update_electronic_signatures" ON electronic_signatures;
DROP POLICY IF EXISTS "auth_delete_electronic_signatures" ON electronic_signatures;
DROP POLICY IF EXISTS "electronic_signatures_rw" ON electronic_signatures;
CREATE POLICY esig_select ON electronic_signatures FOR SELECT TO authenticated USING (is_org_member(organization_id));
CREATE POLICY esig_insert ON electronic_signatures FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));

-- B3. document_prerequisites
DROP POLICY IF EXISTS "auth_select_document_prerequisites" ON document_prerequisites;
DROP POLICY IF EXISTS "auth_insert_document_prerequisites" ON document_prerequisites;
DROP POLICY IF EXISTS "auth_update_document_prerequisites" ON document_prerequisites;
DROP POLICY IF EXISTS "auth_delete_document_prerequisites" ON document_prerequisites;
DROP POLICY IF EXISTS "document_prerequisites_rw" ON document_prerequisites;
CREATE POLICY dp_select ON document_prerequisites FOR SELECT TO authenticated USING (is_org_member(organization_id));
CREATE POLICY dp_insert ON document_prerequisites FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));
CREATE POLICY dp_update ON document_prerequisites FOR UPDATE TO authenticated USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));
CREATE POLICY dp_delete ON document_prerequisites FOR DELETE TO authenticated USING (is_org_member(organization_id));

-- B4. form_templates
DROP POLICY IF EXISTS "auth_select_form_templates" ON form_templates;
DROP POLICY IF EXISTS "auth_insert_form_templates" ON form_templates;
DROP POLICY IF EXISTS "auth_update_form_templates" ON form_templates;
DROP POLICY IF EXISTS "auth_delete_form_templates" ON form_templates;
DROP POLICY IF EXISTS "form_templates_rw" ON form_templates;
CREATE POLICY ft_select ON form_templates FOR SELECT TO authenticated USING (is_org_member(organization_id));
CREATE POLICY ft_insert ON form_templates FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));
CREATE POLICY ft_update ON form_templates FOR UPDATE TO authenticated USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));
CREATE POLICY ft_delete ON form_templates FOR DELETE TO authenticated USING (is_org_member(organization_id));

-- B5. form_instances
DROP POLICY IF EXISTS "auth_select_form_instances" ON form_instances;
DROP POLICY IF EXISTS "auth_insert_form_instances" ON form_instances;
DROP POLICY IF EXISTS "auth_update_form_instances" ON form_instances;
DROP POLICY IF EXISTS "auth_delete_form_instances" ON form_instances;
DROP POLICY IF EXISTS "form_instances_rw" ON form_instances;
CREATE POLICY fi_select ON form_instances FOR SELECT TO authenticated USING (is_org_member(organization_id));
CREATE POLICY fi_insert ON form_instances FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));
CREATE POLICY fi_update ON form_instances FOR UPDATE TO authenticated USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));
CREATE POLICY fi_delete ON form_instances FOR DELETE TO authenticated USING (is_org_member(organization_id));

-- B6. capas
DROP POLICY IF EXISTS "auth_select_capas" ON capas;
DROP POLICY IF EXISTS "auth_insert_capas" ON capas;
DROP POLICY IF EXISTS "auth_update_capas" ON capas;
DROP POLICY IF EXISTS "auth_delete_capas" ON capas;
DROP POLICY IF EXISTS "capas_rw" ON capas;
CREATE POLICY capas_select ON capas FOR SELECT TO authenticated USING (is_org_member(organization_id));
CREATE POLICY capas_insert ON capas FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));
CREATE POLICY capas_update ON capas FOR UPDATE TO authenticated USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));
CREATE POLICY capas_delete ON capas FOR DELETE TO authenticated USING (is_org_member(organization_id));

-- B7. non_conformances
DROP POLICY IF EXISTS "auth_select_non_conformances" ON non_conformances;
DROP POLICY IF EXISTS "auth_insert_non_conformances" ON non_conformances;
DROP POLICY IF EXISTS "auth_update_non_conformances" ON non_conformances;
DROP POLICY IF EXISTS "auth_delete_non_conformances" ON non_conformances;
DROP POLICY IF EXISTS "ncr_rw" ON non_conformances;
CREATE POLICY ncr_select ON non_conformances FOR SELECT TO authenticated USING (is_org_member(organization_id));
CREATE POLICY ncr_insert ON non_conformances FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));
CREATE POLICY ncr_update ON non_conformances FOR UPDATE TO authenticated USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));
CREATE POLICY ncr_delete ON non_conformances FOR DELETE TO authenticated USING (is_org_member(organization_id));

-- B8. deviations
DROP POLICY IF EXISTS "auth_select_deviations" ON deviations;
DROP POLICY IF EXISTS "auth_insert_deviations" ON deviations;
DROP POLICY IF EXISTS "auth_update_deviations" ON deviations;
DROP POLICY IF EXISTS "auth_delete_deviations" ON deviations;
DROP POLICY IF EXISTS "deviations_rw" ON deviations;
CREATE POLICY dev_select ON deviations FOR SELECT TO authenticated USING (is_org_member(organization_id));
CREATE POLICY dev_insert ON deviations FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));
CREATE POLICY dev_update ON deviations FOR UPDATE TO authenticated USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));
CREATE POLICY dev_delete ON deviations FOR DELETE TO authenticated USING (is_org_member(organization_id));

-- B9. change_controls
DROP POLICY IF EXISTS "auth_select_change_controls" ON change_controls;
DROP POLICY IF EXISTS "auth_insert_change_controls" ON change_controls;
DROP POLICY IF EXISTS "auth_update_change_controls" ON change_controls;
DROP POLICY IF EXISTS "auth_delete_change_controls" ON change_controls;
DROP POLICY IF EXISTS "change_controls_rw" ON change_controls;
CREATE POLICY cc_select ON change_controls FOR SELECT TO authenticated USING (is_org_member(organization_id));
CREATE POLICY cc_insert ON change_controls FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));
CREATE POLICY cc_update ON change_controls FOR UPDATE TO authenticated USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));
CREATE POLICY cc_delete ON change_controls FOR DELETE TO authenticated USING (is_org_member(organization_id));

-- B10. audits
DROP POLICY IF EXISTS "auth_select_audits" ON audits;
DROP POLICY IF EXISTS "auth_insert_audits" ON audits;
DROP POLICY IF EXISTS "auth_update_audits" ON audits;
DROP POLICY IF EXISTS "auth_delete_audits" ON audits;
DROP POLICY IF EXISTS "audits_rw" ON audits;
CREATE POLICY audits_select ON audits FOR SELECT TO authenticated USING (is_org_member(organization_id));
CREATE POLICY audits_insert ON audits FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));
CREATE POLICY audits_update ON audits FOR UPDATE TO authenticated USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));
CREATE POLICY audits_delete ON audits FOR DELETE TO authenticated USING (is_org_member(organization_id));

-- B11. training
DROP POLICY IF EXISTS "auth_select_training" ON training;
DROP POLICY IF EXISTS "auth_insert_training" ON training;
DROP POLICY IF EXISTS "auth_update_training" ON training;
DROP POLICY IF EXISTS "auth_delete_training" ON training;
DROP POLICY IF EXISTS "training_rw" ON training;
CREATE POLICY training_select ON training FOR SELECT TO authenticated USING (is_org_member(organization_id));
CREATE POLICY training_insert ON training FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));
CREATE POLICY training_update ON training FOR UPDATE TO authenticated USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));
CREATE POLICY training_delete ON training FOR DELETE TO authenticated USING (is_org_member(organization_id));

-- B12. risks
DROP POLICY IF EXISTS "auth_select_risks" ON risks;
DROP POLICY IF EXISTS "auth_insert_risks" ON risks;
DROP POLICY IF EXISTS "auth_update_risks" ON risks;
DROP POLICY IF EXISTS "auth_delete_risks" ON risks;
DROP POLICY IF EXISTS "risks_rw" ON risks;
CREATE POLICY risks_select ON risks FOR SELECT TO authenticated USING (is_org_member(organization_id));
CREATE POLICY risks_insert ON risks FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));
CREATE POLICY risks_update ON risks FOR UPDATE TO authenticated USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));
CREATE POLICY risks_delete ON risks FOR DELETE TO authenticated USING (is_org_member(organization_id));

-- B13. batch_records
DROP POLICY IF EXISTS "auth_select_batch_records" ON batch_records;
DROP POLICY IF EXISTS "auth_insert_batch_records" ON batch_records;
DROP POLICY IF EXISTS "auth_update_batch_records" ON batch_records;
DROP POLICY IF EXISTS "auth_delete_batch_records" ON batch_records;
DROP POLICY IF EXISTS "batch_records_rw" ON batch_records;
CREATE POLICY br_select ON batch_records FOR SELECT TO authenticated USING (is_org_member(organization_id));
CREATE POLICY br_insert ON batch_records FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));
CREATE POLICY br_update ON batch_records FOR UPDATE TO authenticated USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));
CREATE POLICY br_delete ON batch_records FOR DELETE TO authenticated USING (is_org_member(organization_id));

-- B14. suppliers
DROP POLICY IF EXISTS "auth_select_suppliers" ON suppliers;
DROP POLICY IF EXISTS "auth_insert_suppliers" ON suppliers;
DROP POLICY IF EXISTS "auth_update_suppliers" ON suppliers;
DROP POLICY IF EXISTS "auth_delete_suppliers" ON suppliers;
DROP POLICY IF EXISTS "suppliers_rw" ON suppliers;
CREATE POLICY suppliers_select ON suppliers FOR SELECT TO authenticated USING (is_org_member(organization_id));
CREATE POLICY suppliers_insert ON suppliers FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));
CREATE POLICY suppliers_update ON suppliers FOR UPDATE TO authenticated USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));
CREATE POLICY suppliers_delete ON suppliers FOR DELETE TO authenticated USING (is_org_member(organization_id));

-- B15. audit_trails (immutable)
DROP POLICY IF EXISTS "auth_select_audit_trails" ON audit_trails;
DROP POLICY IF EXISTS "auth_select_audit_trail" ON audit_trails;
DROP POLICY IF EXISTS "auth_insert_audit_trails" ON audit_trails;
DROP POLICY IF EXISTS "auth_insert_audit_trail" ON audit_trails;
DROP POLICY IF EXISTS "audit_trails_rw" ON audit_trails;
CREATE POLICY audit_trails_select ON audit_trails FOR SELECT TO authenticated USING (is_org_member(organization_id));
CREATE POLICY audit_trails_insert ON audit_trails FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));

-- B16. departments
DROP POLICY IF EXISTS "auth_select_departments" ON departments;
DROP POLICY IF EXISTS "auth_insert_departments" ON departments;
DROP POLICY IF EXISTS "auth_update_departments" ON departments;
DROP POLICY IF EXISTS "auth_delete_departments" ON departments;
DROP POLICY IF EXISTS "departments_rw" ON departments;
CREATE POLICY departments_select ON departments FOR SELECT TO authenticated USING (is_org_member(organization_id));
CREATE POLICY departments_insert ON departments FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));
CREATE POLICY departments_update ON departments FOR UPDATE TO authenticated USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));
CREATE POLICY departments_delete ON departments FOR DELETE TO authenticated USING (is_org_member(organization_id));

-- B17. document_triggers
DROP POLICY IF EXISTS "auth_select_document_triggers" ON document_triggers;
DROP POLICY IF EXISTS "auth_insert_document_triggers" ON document_triggers;
DROP POLICY IF EXISTS "auth_update_document_triggers" ON document_triggers;
DROP POLICY IF EXISTS "auth_delete_document_triggers" ON document_triggers;
DROP POLICY IF EXISTS "document_triggers_rw" ON document_triggers;
CREATE POLICY dt_select ON document_triggers FOR SELECT TO authenticated USING (is_org_member(organization_id));
CREATE POLICY dt_insert ON document_triggers FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));
CREATE POLICY dt_update ON document_triggers FOR UPDATE TO authenticated USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));
CREATE POLICY dt_delete ON document_triggers FOR DELETE TO authenticated USING (is_org_member(organization_id));

-- B18. document_relationships
DROP POLICY IF EXISTS "auth_select_document_relationships" ON document_relationships;
DROP POLICY IF EXISTS "auth_insert_document_relationships" ON document_relationships;
DROP POLICY IF EXISTS "auth_update_document_relationships" ON document_relationships;
DROP POLICY IF EXISTS "auth_delete_document_relationships" ON document_relationships;
DROP POLICY IF EXISTS "document_relationships_rw" ON document_relationships;
CREATE POLICY dr_select ON document_relationships FOR SELECT TO authenticated USING (is_org_member(organization_id));
CREATE POLICY dr_insert ON document_relationships FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));
CREATE POLICY dr_update ON document_relationships FOR UPDATE TO authenticated USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));
CREATE POLICY dr_delete ON document_relationships FOR DELETE TO authenticated USING (is_org_member(organization_id));

-- B19. document_code_sequences
DROP POLICY IF EXISTS "auth_select_document_code_sequences" ON document_code_sequences;
DROP POLICY IF EXISTS "auth_insert_document_code_sequences" ON document_code_sequences;
DROP POLICY IF EXISTS "auth_update_document_code_sequences" ON document_code_sequences;
DROP POLICY IF EXISTS "auth_delete_document_code_sequences" ON document_code_sequences;
DROP POLICY IF EXISTS "document_code_sequences_rw" ON document_code_sequences;
CREATE POLICY dcs_select ON document_code_sequences FOR SELECT TO authenticated USING (is_org_member(organization_id));
CREATE POLICY dcs_insert ON document_code_sequences FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));
CREATE POLICY dcs_update ON document_code_sequences FOR UPDATE TO authenticated USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));

-- B20. record_type_definitions (admin-only writes)
DROP POLICY IF EXISTS "auth_select_record_type_definitions" ON record_type_definitions;
DROP POLICY IF EXISTS "auth_insert_record_type_definitions" ON record_type_definitions;
DROP POLICY IF EXISTS "auth_update_record_type_definitions" ON record_type_definitions;
DROP POLICY IF EXISTS "auth_delete_record_type_definitions" ON record_type_definitions;
DROP POLICY IF EXISTS "rtd_rw" ON record_type_definitions;
CREATE POLICY rtd_select ON record_type_definitions FOR SELECT TO authenticated USING (is_org_member(organization_id));
CREATE POLICY rtd_insert ON record_type_definitions FOR INSERT TO authenticated WITH CHECK (is_org_admin(organization_id));
CREATE POLICY rtd_update ON record_type_definitions FOR UPDATE TO authenticated USING (is_org_admin(organization_id)) WITH CHECK (is_org_admin(organization_id));
CREATE POLICY rtd_delete ON record_type_definitions FOR DELETE TO authenticated USING (is_org_admin(organization_id));

-- B21. record_links
DROP POLICY IF EXISTS "auth_select_record_links" ON record_links;
DROP POLICY IF EXISTS "auth_insert_record_links" ON record_links;
DROP POLICY IF EXISTS "auth_update_record_links" ON record_links;
DROP POLICY IF EXISTS "auth_delete_record_links" ON record_links;
DROP POLICY IF EXISTS "rl_rw" ON record_links;
CREATE POLICY rl_select ON record_links FOR SELECT TO authenticated USING (is_org_member(organization_id));
CREATE POLICY rl_insert ON record_links FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));
CREATE POLICY rl_update ON record_links FOR UPDATE TO authenticated USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id));
CREATE POLICY rl_delete ON record_links FOR DELETE TO authenticated USING (is_org_member(organization_id));

-- PARTIE C : Tables speciales
-- C1. organizations
DROP POLICY IF EXISTS "auth_select_organizations" ON organizations;
DROP POLICY IF EXISTS "auth_insert_organizations" ON organizations;
DROP POLICY IF EXISTS "auth_update_organizations" ON organizations;
DROP POLICY IF EXISTS "auth_delete_organizations" ON organizations;
DROP POLICY IF EXISTS "org_read" ON organizations;
CREATE POLICY orgs_select ON organizations FOR SELECT TO authenticated USING (is_org_member(id));
CREATE POLICY orgs_update ON organizations FOR UPDATE TO authenticated USING (is_org_admin(id)) WITH CHECK (is_org_admin(id));
CREATE POLICY orgs_insert ON organizations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY orgs_delete ON organizations FOR DELETE TO authenticated USING (is_org_owner(id));

-- C2. profiles
DROP POLICY IF EXISTS "auth_select_profiles" ON profiles;
DROP POLICY IF EXISTS "auth_insert_profiles" ON profiles;
DROP POLICY IF EXISTS "auth_update_profiles" ON profiles;
DROP POLICY IF EXISTS "auth_delete_profiles" ON profiles;
DROP POLICY IF EXISTS "profiles_read" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY profiles_select ON profiles FOR SELECT TO authenticated USING (id = auth.uid() OR is_org_member(organization_id));
CREATE POLICY profiles_update ON profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR is_org_admin(organization_id)) WITH CHECK (id = auth.uid() OR is_org_admin(organization_id));
CREATE POLICY profiles_insert ON profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY profiles_delete ON profiles FOR DELETE TO authenticated USING (is_org_owner(organization_id));

-- C3. organization_members
DROP POLICY IF EXISTS "auth_select_organization_members" ON organization_members;
DROP POLICY IF EXISTS "auth_insert_organization_members" ON organization_members;
DROP POLICY IF EXISTS "auth_update_organization_members" ON organization_members;
DROP POLICY IF EXISTS "auth_delete_organization_members" ON organization_members;
DROP POLICY IF EXISTS "org_member_insert" ON organization_members;
DROP POLICY IF EXISTS "org_member_read" ON organization_members;
CREATE POLICY om_select ON organization_members FOR SELECT TO authenticated USING (user_id = auth.uid() OR is_org_member(organization_id));
CREATE POLICY om_insert ON organization_members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR is_org_admin(organization_id));
CREATE POLICY om_update ON organization_members FOR UPDATE TO authenticated USING (is_org_admin(organization_id)) WITH CHECK (is_org_admin(organization_id));
CREATE POLICY om_delete ON organization_members FOR DELETE TO authenticated USING (is_org_admin(organization_id));

-- PARTIE D : log_audit_trail
CREATE OR REPLACE FUNCTION log_audit_trail()
RETURNS TRIGGER AS $$
DECLARE
  v_audit_action text; v_org_id uuid; v_user_id uuid; v_user_email text;
BEGIN
  v_user_id := auth.uid();
  v_user_email := current_user_email();
  IF (TG_OP = 'INSERT') THEN
    v_audit_action := 'CREATE'; v_org_id := NEW.organization_id;
    INSERT INTO audit_trails (audit_action, table_name, record_id, new_values, organization_id, user_id, user_email)
    VALUES (v_audit_action, TG_TABLE_NAME, NEW.id, to_jsonb(NEW), v_org_id, v_user_id, v_user_email);
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    v_audit_action := 'UPDATE'; v_org_id := NEW.organization_id;
    INSERT INTO audit_trails (audit_action, table_name, record_id, old_values, new_values, organization_id, user_id, user_email)
    VALUES (v_audit_action, TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW), v_org_id, v_user_id, v_user_email);
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    v_audit_action := 'DELETE'; v_org_id := OLD.organization_id;
    INSERT INTO audit_trails (audit_action, table_name, record_id, old_values, organization_id, user_id, user_email)
    VALUES (v_audit_action, TG_TABLE_NAME, OLD.id, to_jsonb(OLD), v_org_id, v_user_id, v_user_email);
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PARTIE E : create_organization_for_user
CREATE OR REPLACE FUNCTION create_organization_for_user(
  p_user_id uuid, p_name text, p_slug text, p_settings jsonb DEFAULT '{}'::jsonb
) RETURNS uuid AS $$
DECLARE v_org_id uuid; v_existing_slug uuid;
BEGIN
  SELECT id INTO v_existing_slug FROM organizations WHERE slug = p_slug;
  IF v_existing_slug IS NOT NULL THEN
    RAISE EXCEPTION 'Slug % already exists', p_slug USING ERRCODE = '23505';
  END IF;
  INSERT INTO organizations (name, slug, subscription_status, settings)
  VALUES (p_name, p_slug, 'trial', p_settings) RETURNING id INTO v_org_id;
  INSERT INTO organization_members (organization_id, user_id, role, status)
  VALUES (v_org_id, p_user_id, 'owner', 'active');
  UPDATE profiles SET organization_id = v_org_id, updated_at = now() WHERE id = p_user_id;
  INSERT INTO audit_trails (audit_action, table_name, record_id, new_values, organization_id, user_id, user_email)
  SELECT 'CREATE', 'organizations', v_org_id,
    jsonb_build_object('name', p_name, 'slug', p_slug, 'subscription_status', 'trial'),
    v_org_id, p_user_id, email FROM profiles WHERE id = p_user_id;
  RETURN v_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
