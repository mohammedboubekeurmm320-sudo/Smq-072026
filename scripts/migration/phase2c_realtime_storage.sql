-- ============================================================
-- PHASE 2C + 2D : REALTIME + STORAGE
-- CORRIGÉ: status::TEXT pour UNION ALL (enums différents par table)
-- Exécuter dans Supabase SQL Editor APRÈS la Phase 2B
-- ============================================================

-- ==========================================
-- 2C: REALTIME - Activer Realtime sur les tables clés
-- ==========================================
ALTER PUBLICATION supabase_realtime ADD TABLE documents;
ALTER PUBLICATION supabase_realtime ADD TABLE form_instances;
ALTER PUBLICATION supabase_realtime ADD TABLE capas;
ALTER PUBLICATION supabase_realtime ADD TABLE non_conformances;
ALTER PUBLICATION supabase_realtime ADD TABLE deviations;
ALTER PUBLICATION supabase_realtime ADD TABLE change_controls;
ALTER PUBLICATION supabase_realtime ADD TABLE audits;
ALTER PUBLICATION supabase_realtime ADD TABLE training;
ALTER PUBLICATION supabase_realtime ADD TABLE risks;
ALTER PUBLICATION supabase_realtime ADD TABLE suppliers;
ALTER PUBLICATION supabase_realtime ADD TABLE batch_records;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ==========================================
-- 2D: STORAGE - Créer les buckets via Dashboard Supabase:
-- 1. "documents" - SOPs, procédures, formulaires
-- 2. "signatures" - Preuves de signature électronique
-- 3. "exports" - Rapports générés
-- Puis décommenter les policies storage ci-dessous
-- ==========================================

-- CREATE POLICY documents_upload ON storage.objects
--     FOR INSERT WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = current_user_org_id());
-- CREATE POLICY documents_select ON storage.objects
--     FOR SELECT USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = current_user_org_id());
-- CREATE POLICY documents_delete ON storage.objects
--     FOR DELETE USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = current_user_org_id() AND is_current_user_admin());
-- CREATE POLICY signatures_select ON storage.objects
--     FOR SELECT USING (bucket_id = 'signatures');
-- CREATE POLICY exports_select ON storage.objects
--     FOR SELECT USING (bucket_id = 'exports' AND (storage.foldername(name))[1] = current_user_org_id());

-- ==========================================
-- Vue utilitaire: résumé des enregistrements (Realtime filtering)
-- CORRIGÉ: tous les status castés en TEXT pour UNION ALL
-- ==========================================
CREATE OR REPLACE VIEW v_record_summary AS
SELECT 'capa' AS record_type, id, capa_number AS reference, title, status::TEXT AS status, priority::TEXT AS priority_info, assigned_to, due_date, organization_id, updated_at FROM capas
UNION ALL
SELECT 'ncr', id, ncr_number, title, status::TEXT, severity::TEXT, assigned_to, due_date, organization_id, updated_at FROM non_conformances
UNION ALL
SELECT 'deviation', id, dev_number, title, status::TEXT, severity::TEXT, assigned_to, due_date, organization_id, updated_at FROM deviations
UNION ALL
SELECT 'change_control', id, cc_number, title, status::TEXT, priority::TEXT, assigned_to, due_date, organization_id, updated_at FROM change_controls
UNION ALL
SELECT 'audit', id, audit_number, title, status::TEXT, NULL::TEXT, lead_auditor, scheduled_date, organization_id, updated_at FROM audits
UNION ALL
SELECT 'training', id, title, title, status::TEXT, NULL::TEXT, assigned_to, due_date, organization_id, updated_at FROM training
UNION ALL
SELECT 'risk', id, risk_number, title, status::TEXT, risk_level::TEXT, NULL::TEXT, NULL::DATE, organization_id, updated_at FROM risks;