-- ============================================================================
-- Migration 007 : Corrections P0 — Gaps critiques identifiés par audit
-- ============================================================================
-- 1. Création table `notifications` (référencée dans RLS 002, crud-service,
--    ORG_SCOPED_ENTITIES, OrgSettings mais jamais créée)
-- 2. Création vue `v_org_dashboard` (interrogée par crud-service.getDashboardKPIs
--    mais jamais créée)
-- 3. RLS sur la nouvelle table `notifications`
-- ============================================================================

-- ============================================================================
-- 1. TABLE : notifications
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  message         TEXT NOT NULL,
  type            TEXT NOT NULL DEFAULT 'info'
                  CHECK (type IN ('info','warning','error','success','capa_overdue','ncr_overdue','document_expiry','training_overdue','audit_due')),
  entity_type     TEXT,
  entity_id       UUID,
  is_read         BOOLEAN NOT NULL DEFAULT FALSE,
  link            TEXT,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_org ON public.notifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_org_user ON public.notifications(organization_id, user_id);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.trg_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_notifications_updated_at ON public.notifications;
CREATE TRIGGER trg_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.trg_notifications_updated_at();

-- ============================================================================
-- 2. VUE : v_org_dashboard
-- ============================================================================
CREATE OR REPLACE VIEW public.v_org_dashboard AS
SELECT
  o.id AS organization_id,
  o.name AS organization_name,
  -- Documents KPIs
  (SELECT count(*) FROM public.documents d WHERE d.organization_id = o.id) AS total_documents,
  (SELECT count(*) FROM public.documents d WHERE d.organization_id = o.id AND d.status IN ('Approved','Effective')) AS approved_documents,
  (SELECT count(*) FROM public.documents d WHERE d.organization_id = o.id AND d.status = 'Under Review') AS under_review_documents,
  (SELECT count(*) FROM public.documents d WHERE d.organization_id = o.id AND d.status = 'Draft') AS draft_documents,
  (SELECT count(*) FROM public.documents d WHERE d.organization_id = o.id AND d.status = 'Obsolete') AS obsolete_documents,
  -- CAPA KPIs
  (SELECT count(*) FROM public.capas c WHERE c.organization_id = o.id) AS total_capas,
  (SELECT count(*) FROM public.capas c WHERE c.organization_id = o.id AND c.status = 'Open') AS open_capas,
  (SELECT count(*) FROM public.capas c WHERE c.organization_id = o.id AND c.status = 'Closed') AS closed_capas,
  (SELECT count(*) FROM public.capas c WHERE c.organization_id = o.id AND c.status = 'Overdue') AS overdue_capas,
  -- NCR KPIs
  (SELECT count(*) FROM public.non_conformances n WHERE n.organization_id = o.id) AS total_ncrs,
  (SELECT count(*) FROM public.non_conformances n WHERE n.organization_id = o.id AND n.status = 'Open') AS open_ncrs,
  (SELECT count(*) FROM public.non_conformances n WHERE n.organization_id = o.id AND n.status = 'Closed') AS closed_ncrs,
  -- Deviation KPIs
  (SELECT count(*) FROM public.deviations dv WHERE dv.organization_id = o.id) AS total_deviations,
  (SELECT count(*) FROM public.deviations dv WHERE dv.organization_id = o.id AND dv.status = 'Open') AS open_deviations,
  -- Change Control KPIs
  (SELECT count(*) FROM public.change_controls cc WHERE cc.organization_id = o.id) AS total_change_controls,
  (SELECT count(*) FROM public.change_controls cc WHERE cc.organization_id = o.id AND cc.status IN ('Requested','Under Review')) AS open_change_controls,
  -- Audit KPIs
  (SELECT count(*) FROM public.audits a WHERE a.organization_id = o.id) AS total_audits,
  (SELECT count(*) FROM public.audits a WHERE a.organization_id = o.id AND a.status = 'Completed') AS completed_audits,
  (SELECT count(*) FROM public.audits a WHERE a.organization_id = o.id AND a.status = 'Planned') AS planned_audits,
  -- Training KPIs
  (SELECT count(*) FROM public.training t WHERE t.organization_id = o.id) AS total_training,
  (SELECT count(*) FROM public.training t WHERE t.organization_id = o.id AND t.status = 'Completed') AS completed_training,
  (SELECT count(*) FROM public.training t WHERE t.organization_id = o.id AND t.status = 'Overdue') AS overdue_training,
  -- Risk KPIs
  (SELECT count(*) FROM public.risks r WHERE r.organization_id = o.id) AS total_risks,
  (SELECT count(*) FROM public.risks r WHERE r.organization_id = o.id AND r.status = 'Open') AS open_risks,
  -- Batch Records KPIs
  (SELECT count(*) FROM public.batch_records br WHERE br.organization_id = o.id) AS total_batch_records,
  (SELECT count(*) FROM public.batch_records br WHERE br.organization_id = o.id AND br.status = 'Released') AS released_batch_records,
  -- Supplier KPIs
  (SELECT count(*) FROM public.suppliers s WHERE s.organization_id = o.id) AS total_suppliers,
  (SELECT count(*) FROM public.suppliers s WHERE s.organization_id = o.id AND s.status = 'Qualified') AS qualified_suppliers,
  -- Form Templates KPIs
  (SELECT count(*) FROM public.form_templates ft WHERE ft.organization_id = o.id) AS total_form_templates,
  (SELECT count(*) FROM public.form_templates ft WHERE ft.organization_id = o.id AND ft.status = 'Approved') AS approved_form_templates,
  -- Unread notifications count
  (SELECT count(*) FROM public.notifications n WHERE n.organization_id = o.id AND n.is_read = false) AS unread_notifications
FROM public.organizations o;

-- ============================================================================
-- 3. RLS sur notifications
-- ============================================================================
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Les membres de l'org peuvent lire leurs propres notifications ou celles de l'org
CREATE POLICY notifications_select ON public.notifications
  FOR SELECT USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = current_profile_id() LIMIT 1)
    OR user_id = current_profile_id()
  );

-- Seuls admin/quality_manager peuvent insérer
CREATE POLICY notifications_insert ON public.notifications
  FOR INSERT WITH CHECK (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = current_profile_id() LIMIT 1)
    AND (
      current_profile_id() IS NULL
      OR (SELECT role FROM public.profiles WHERE id = current_profile_id() LIMIT 1) IN ('admin', 'quality_manager')
      OR user_id = current_profile_id()
    )
  );

-- L'utilisateur peut marquer ses propres notifications comme lues
CREATE POLICY notifications_update ON public.notifications
  FOR UPDATE USING (
    user_id = current_profile_id()
    OR (SELECT role FROM public.profiles WHERE id = current_profile_id() LIMIT 1) IN ('admin', 'quality_manager')
  )
  WITH CHECK (
    user_id = current_profile_id()
    OR (SELECT role FROM public.profiles WHERE id = current_profile_id() LIMIT 1) IN ('admin', 'quality_manager')
  );

-- Suppression réservée aux admins
CREATE POLICY notifications_delete ON public.notifications
  FOR DELETE USING (
    (SELECT role FROM public.profiles WHERE id = current_profile_id() LIMIT 1) = 'admin'
  );

-- ============================================================================
-- 4. Audit trigger sur notifications
-- ============================================================================
DROP TRIGGER IF EXISTS trg_audit_notifications ON public.notifications;
CREATE TRIGGER trg_audit_notifications
  AFTER INSERT OR UPDATE OR DELETE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_trail();