-- ============================================================================
-- 013: Fix get_upcoming_deadlines RPC — qualify due_date column references
-- ============================================================================
-- Bug: la fonction utilisait `due_date` dans la clause ORDER BY finale
-- sans qualifier la table. Postgres signalait "column reference due_date
-- is ambiguous" car plusieurs CTEs UNION retourneT une colonne due_date.
--
-- Fix: la CTE `deadlines` n'a qu'une seule colonne due_date (résultat des
-- UNION ALL), donc la référence est en fait non ambiguë. Le problème venait
-- plutôt des sous-requêtes WHERE qui référençaient `due_date` sans qualifier
-- dans les tables capas, non_conformances, etc. On qualifie explicitement
-- chaque référence avec le nom de table (capas.due_date, etc.).
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.get_upcoming_deadlines(
  p_org_id uuid,
  p_days_ahead int DEFAULT 7
)
RETURNS TABLE(
  entity_type text,
  entity_id uuid,
  title text,
  due_date timestamptz,
  status text,
  days_remaining int,
  priority text
) AS $$
BEGIN
  RETURN QUERY
  WITH deadlines AS (
    SELECT 'capa' AS entity_type, id AS entity_id,
           title, capas.due_date AS due_date, status,
           COALESCE(priority, 'Medium') AS priority
    FROM capas
    WHERE organization_id = p_org_id
      AND status NOT IN ('Closed', 'Cancelled')
      AND capas.due_date IS NOT NULL
      AND capas.due_date <= now() + (p_days_ahead || ' days')::interval

    UNION ALL
    SELECT 'ncr' AS entity_type, id AS entity_id,
           title, non_conformances.due_date AS due_date, status,
           CASE WHEN severity = 'Critical' THEN 'Critical'
                WHEN severity = 'Major' THEN 'High'
                ELSE 'Medium' END AS priority
    FROM non_conformances
    WHERE organization_id = p_org_id
      AND status NOT IN ('Closed', 'Cancelled')
      AND non_conformances.due_date IS NOT NULL
      AND non_conformances.due_date <= now() + (p_days_ahead || ' days')::interval

    UNION ALL
    SELECT 'training' AS entity_type, id AS entity_id,
           title, training.due_date AS due_date, status,
           'Medium' AS priority
    FROM training
    WHERE organization_id = p_org_id
      AND status NOT IN ('Completed', 'Cancelled')
      AND training.due_date IS NOT NULL
      AND training.due_date <= now() + (p_days_ahead || ' days')::interval

    UNION ALL
    SELECT 'audit' AS entity_type, id AS entity_id,
           title, audits.scheduled_date AS due_date, status,
           'High' AS priority
    FROM audits
    WHERE organization_id = p_org_id
      AND status NOT IN ('Completed', 'Cancelled')
      AND audits.scheduled_date IS NOT NULL
      AND audits.scheduled_date <= now() + (p_days_ahead || ' days')::interval

    UNION ALL
    SELECT 'deviation' AS entity_type, id AS entity_id,
           title, deviations.due_date AS due_date, status,
           COALESCE(priority, 'Medium') AS priority
    FROM deviations
    WHERE organization_id = p_org_id
      AND status NOT IN ('Closed', 'Cancelled')
      AND deviations.due_date IS NOT NULL
      AND deviations.due_date <= now() + (p_days_ahead || ' days')::interval

    UNION ALL
    SELECT 'change_control' AS entity_type, id AS entity_id,
           title, change_controls.due_date AS due_date, status,
           'High' AS priority
    FROM change_controls
    WHERE organization_id = p_org_id
      AND status NOT IN ('Completed', 'Rejected', 'Cancelled')
      AND change_controls.due_date IS NOT NULL
      AND change_controls.due_date <= now() + (p_days_ahead || ' days')::interval
  )
  SELECT
    entity_type, entity_id, title, deadlines.due_date, status,
    GREATEST(0, ceil(EXTRACT(epoch FROM (deadlines.due_date - now())) / 86400))::int AS days_remaining,
    priority
  FROM deadlines
  ORDER BY deadlines.due_date ASC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.get_upcoming_deadlines(uuid, int) IS
  'Aggregates upcoming deadlines across all QMS entities. Fixed in 013 to qualify all due_date references with their table name.';

COMMIT;
