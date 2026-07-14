-- ============================================================
-- PHASE 1A : ENUMS PostgreSQL
-- Exécuter dans Supabase SQL Editor
-- ============================================================

BEGIN;

DO $$ BEGIN CREATE TYPE subscription_status AS ENUM ('trial', 'active', 'suspended', 'cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE user_role AS ENUM ('admin', 'quality_manager', 'auditor', 'document_controller', 'executive', 'operator'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE org_member_role AS ENUM ('owner', 'admin', 'member', 'viewer'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE org_member_status AS ENUM ('active', 'inactive', 'pending'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE document_type AS ENUM ('MANUEL','POLITIQUE','INDICATEUR','PROCESS_MAP','ORGANIGRAMME','REGLEMENTAIRE','MAPPING','PROCEDURE','INSTRUCTION','FORMULAIRE','REGISTRE','ENREGISTREMENT','MASTER_BATCH','SOP','WI','Form','Policy','Specification','Technical','Risk_Analysis','Validation_Protocol','Record','Manual','Instruction_Register','Master_Batch','Process_Map_En'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE document_status AS ENUM ('Draft','Under_Review','Approved','Effective','Obsolete','Withdrawn'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE document_classification AS ENUM ('Internal','External','Regulatory','Confidential'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE document_level AS ENUM ('Level_1','Level_2','Level_3','Level_4'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE validation_phase AS ENUM ('IQ','OQ','PQ','Full'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE signature_type AS ENUM ('approval','rejection','review','verification'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE form_template_status AS ENUM ('Draft','Under_Review','Approved','Obsolete'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE form_instance_status AS ENUM ('Draft','Submitted','Approved','Rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE capa_type AS ENUM ('Corrective','Preventive'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE capa_status AS ENUM ('Open','Investigation','Implementation','Effectiveness_Check','Closed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE capa_priority AS ENUM ('Critical','High','Medium','Low'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE capa_source AS ENUM ('audit','customer_complaint','internal','supplier','regulatory','process'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE root_cause_category AS ENUM ('Man','Machine','Method','Material','Measurement','Environment','Management'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE ncr_type AS ENUM ('Product','Process','System','Supplier','OOS','OOT'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE ncr_status AS ENUM ('Open','In_Progress','Closed','Verified'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE ncr_severity AS ENUM ('Critical','Major','Minor'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE ncr_disposition AS ENUM ('Use_As_Is','Rework','Scrap','Return','Quarantine','None'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE deviation_type AS ENUM ('Planned','Unplanned'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE deviation_status AS ENUM ('Open','Investigation','Implementation','Effectiveness_Check','Closed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE deviation_severity AS ENUM ('Critical','Major','Minor'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE deviation_category AS ENUM ('Process','Equipment','Material','Personnel','Environment','Documentation'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE product_stage AS ENUM ('Raw_Material','In_Process','Finished_Product','Packaging','Storage'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE cc_type AS ENUM ('Planned','Unplanned','Emergency'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE cc_status AS ENUM ('Requested','Under_Review','Approved','In_Implementation','Completed','Rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE cc_priority AS ENUM ('Critical','High','Medium','Low'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE cc_category AS ENUM ('Process','Equipment','Facility','Document','Material','Computer_System','Organizational','Manufacturing','Regulatory','Supply_Chain','Warehouse','Other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE audit_type AS ENUM ('Internal','External','Supplier'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE audit_status AS ENUM ('Planned','In_Progress','Completed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE audit_finding_severity AS ENUM ('Critical','Major','Minor','Observation'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE training_type AS ENUM ('Onboarding','SOP','Regulatory','Skill','Certification'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE training_status AS ENUM ('Planned','In_Progress','Completed','Overdue'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE risk_category AS ENUM ('Product','Process','System','Supplier'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE risk_level AS ENUM ('Low','Medium','High','Critical'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE risk_status AS ENUM ('Open','Mitigated','Accepted','Closed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE supplier_category AS ENUM ('Raw_Material','Packaging','Equipment','Service','Consulting','Contract_Manufacturing','Other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE supplier_status AS ENUM ('Qualified','Conditional','Disqualified','Under_Evaluation'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE qualification_method AS ENUM ('On_Site_Audit','Questionnaire','Certificate_Review','Sample_Testing','Historical_Performance'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE batch_status AS ENUM ('In_Progress','Pending_QA_Review','Released','Rejected','Quarantine'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE audit_action AS ENUM ('CREATE','UPDATE','DELETE','APPROVE','REJECT','SIGN','LOGIN','EXPORT'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE trigger_type AS ENUM ('prerequisite','references','activates','output','escalation'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE relationship_type AS ENUM ('parent_child','references','supersedes','obsoletes','amends'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE record_link_type AS ENUM ('related','caused_by','corrected_by','linked_to','derived_from','supersedes','references','depends_on'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE report_frequency AS ENUM ('daily','weekly','monthly','quarterly'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE report_format AS ENUM ('csv','html','pdf'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE scheduled_report_status AS ENUM ('active','paused','completed','error'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMIT;