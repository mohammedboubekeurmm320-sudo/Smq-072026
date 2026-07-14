-- ============================================================
-- PHASE 2B : EDGE FUNCTIONS + HOOKS
-- Fonctions utilitaires déclenchées par les changements de statut
-- et validation des transitions
-- Exécuter dans Supabase SQL Editor APRÈS la Phase 2A
-- ============================================================

-- ==========================================
-- 1. Fonction: valider une transition de statut
-- Vérifie que la transition est autorisée selon record_type_definitions.status_flow
-- ==========================================
CREATE OR REPLACE FUNCTION validate_status_transition(
    p_record_type_slug TEXT,
    p_current_status TEXT,
    p_new_status TEXT,
    p_organization_id TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_flow JSONB;
    v_steps TEXT[];
    v_current_idx INTEGER;
    v_new_idx INTEGER;
    v_branches JSONB;
    v_branch_targets TEXT[];
    v_allowed TEXT[];
    v_key TEXT;
BEGIN
    -- Récupérer le flux de statut pour ce type d'enregistrement
    SELECT status_flow INTO v_flow
    FROM record_type_definitions
    WHERE slug = p_record_type_slug
      AND organization_id = p_organization_id
      AND is_active = true;
    
    IF v_flow IS NULL THEN
        RAISE EXCEPTION 'Record type % not found or inactive for org %', p_record_type_slug, p_organization_id;
    END IF;
    
    -- Extraire le flux linéaire
    SELECT ARRAY(SELECT jsonb_array_elements_text(v_flow->0->'linear')) INTO v_steps;
    
    -- Trouver les index
    v_current_idx := array_position(v_steps, p_current_status);
    v_new_idx := array_position(v_steps, p_new_status);
    
    -- Vérifier les statuts terminaux (pas de sortie)
    IF v_current_idx IS NOT NULL THEN
        -- Vérifier branches (transitions alternatives)
        v_branches := v_flow->0->'branches';
        IF v_branches IS NOT NULL THEN
            FOR v_key IN SELECT jsonb_object_keys(v_branches) LOOP
                IF v_key = p_current_status THEN
                    SELECT ARRAY(SELECT jsonb_array_elements_text(v_branches->v_key)) INTO v_branch_targets;
                    IF p_new_status = ANY(v_branch_targets) THEN
                        RETURN true;
                    END IF;
                END IF;
            END LOOP;
        END IF;
        
        -- Transition linéaire: avancer d'une seule étape
        IF v_new_idx IS NOT NULL AND v_new_idx = v_current_idx + 1 THEN
            RETURN true;
        END IF;
    END IF;
    
    RAISE NOTICE 'Transition % -> % not allowed for % (allowed linear: %)', 
        p_current_status, p_new_status, p_record_type_slug, array_to_string(v_steps, ', ');
    RETURN false;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 2. Fonction: créer une notification
-- Utilitaire pour insérer une notification
-- ==========================================
CREATE OR REPLACE FUNCTION create_notification(
    p_profile_id TEXT,
    p_title TEXT,
    p_message TEXT,
    p_organization_id TEXT,
    p_type TEXT DEFAULT 'info'
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO notifications (profile_id, title, message, type, organization_id)
    VALUES (p_profile_id, p_title, p_message, p_type, p_organization_id);
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to create notification for %: %', p_profile_id, SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 3. Trigger: notifier l'assigné quand un enregistrement lui est assigné
-- Pour capas, non_conformances, deviations, change_controls, audits, training, risks
-- ==========================================
CREATE OR REPLACE FUNCTION notify_assignee()
RETURNS TRIGGER AS $$
DECLARE
    v_assignee_id TEXT;
    v_record_type TEXT;
    v_record_ref TEXT;
BEGIN
    -- Déterminer l'ID de l'assigné et la référence
    IF TG_TABLE_NAME = 'capas' THEN
        v_assignee_id := NEW.assigned_to;
        v_record_type := 'CAPA';
        v_record_ref := NEW.capa_number;
    ELSIF TG_TABLE_NAME = 'non_conformances' THEN
        v_assignee_id := NEW.assigned_to;
        v_record_type := 'NCR';
        v_record_ref := NEW.ncr_number;
    ELSIF TG_TABLE_NAME = 'deviations' THEN
        v_assignee_id := NEW.assigned_to;
        v_record_type := 'Deviation';
        v_record_ref := NEW.dev_number;
    ELSIF TG_TABLE_NAME = 'change_controls' THEN
        v_assignee_id := NEW.assigned_to;
        v_record_type := 'Change Control';
        v_record_ref := NEW.cc_number;
    ELSIF TG_TABLE_NAME = 'audits' THEN
        v_assignee_id := NEW.lead_auditor;
        v_record_type := 'Audit';
        v_record_ref := NEW.audit_number;
    ELSIF TG_TABLE_NAME = 'training' THEN
        v_assignee_id := NEW.assigned_to;
        v_record_type := 'Formation';
        v_record_ref := NEW.title;
    ELSIF TG_TABLE_NAME = 'risks' THEN
        v_record_type := 'Risque';
        v_record_ref := NEW.risk_number;
        RETURN NEW; -- Pas d'assigné unique pour les risques
    ELSE
        RETURN NEW;
    END IF;
    
    IF v_assignee_id IS NOT NULL THEN
        PERFORM create_notification(
            v_assignee_id,
            'Nouvel assignement: ' || v_record_type,
            'Vous avez été assigné(e) au ' || v_record_type || ' ' || v_record_ref,
            'info',
            NEW.organization_id
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 4. Créer les triggers de notification d'assignation
-- ==========================================
DO $$ DECLARE
    tbl TEXT;
    trig_name TEXT;
BEGIN
    FOR tbl IN SELECT unnest(ARRAY[
        'capas','non_conformances','deviations','change_controls','audits','training'
    ]) LOOP
        trig_name := 'trg_notify_' || tbl;
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', trig_name, tbl);
        EXECUTE format('
            CREATE TRIGGER %I
            AFTER INSERT ON %I
            FOR EACH ROW EXECUTE FUNCTION notify_assignee()
        ', trig_name, tbl);
    END LOOP;
END $$;

-- ==========================================
-- 5. Fonction: vérifier les échéances imminentes (7 jours)
-- Pour les rappels de CAPA, Training, Audits planifiés
-- ==========================================
CREATE OR REPLACE FUNCTION get_upcoming_deadlines(p_org_id TEXT, p_days_ahead INTEGER DEFAULT 7)
RETURNS TABLE(
    record_type TEXT,
    record_ref TEXT,
    due_date DATE,
    assigned_to TEXT,
    days_remaining INTEGER
) AS $$
BEGIN
    -- CAPAs
    RETURN QUERY
    SELECT 'CAPA'::TEXT, capa_number, due_date, assigned_to, 
           due_date - CURRENT_DATE
    FROM capas
    WHERE organization_id = p_org_id
      AND status NOT IN ('Closed')
      AND due_date IS NOT NULL
      AND due_date <= CURRENT_DATE + p_days_ahead
      AND due_date >= CURRENT_DATE;
    
    -- Training
    RETURN QUERY
    SELECT 'Formation'::TEXT, title, due_date, assigned_to,
           due_date - CURRENT_DATE
    FROM training
    WHERE organization_id = p_org_id
      AND status NOT IN ('Completed', 'Overdue')
      AND due_date IS NOT NULL
      AND due_date <= CURRENT_DATE + p_days_ahead
      AND due_date >= CURRENT_DATE;
    
    -- Audits planifiés
    RETURN QUERY
    SELECT 'Audit'::TEXT, audit_number, scheduled_date, NULL::TEXT,
           scheduled_date - CURRENT_DATE
    FROM audits
    WHERE organization_id = p_org_id
      AND status = 'Planned'
      AND scheduled_date IS NOT NULL
      AND scheduled_date <= CURRENT_DATE + p_days_ahead
      AND scheduled_date >= CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 6. Vue: dashboard KPI par organisation
-- ==========================================
CREATE OR REPLACE VIEW v_org_dashboard AS
SELECT 
    om.organization_id,
    o.name AS organization_name,
    (SELECT COUNT(*) FROM capas c WHERE c.organization_id = om.organization_id AND c.status != 'Closed') AS capas_open,
    (SELECT COUNT(*) FROM non_conformances n WHERE n.organization_id = om.organization_id AND n.status NOT IN ('Closed','Verified')) AS ncrs_open,
    (SELECT COUNT(*) FROM deviations d WHERE d.organization_id = om.organization_id AND d.status != 'Closed') AS deviations_open,
    (SELECT COUNT(*) FROM change_controls cc WHERE cc.organization_id = om.organization_id AND cc.status NOT IN ('Completed','Rejected')) AS cc_open,
    (SELECT COUNT(*) FROM training t WHERE t.organization_id = om.organization_id AND t.status NOT IN ('Completed','Overdue')) AS training_pending,
    (SELECT COUNT(*) FROM audits a WHERE a.organization_id = om.organization_id AND a.status != 'Completed') AS audits_pending,
    (SELECT COUNT(*) FROM risks r WHERE r.organization_id = om.organization_id AND r.status != 'Closed') AS risks_open,
    (SELECT COUNT(*) FROM suppliers s WHERE s.organization_id = om.organization_id AND s.status = 'Under_Evaluation') AS suppliers_pending
FROM organization_members om
JOIN organizations o ON o.id = om.organization_id
WHERE om.status = 'active';