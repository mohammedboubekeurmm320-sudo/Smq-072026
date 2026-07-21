-- ============================================================================
-- P2 Migration: Hierarchy Module Enhancements
-- ============================================================================
-- 1. Add TypeScript-typed document_hierarchy view with organization_id filter
-- 2. Add hierarchy-specific indexes
-- 3. Add hierarchy statistics RPC function
-- 4. Add cycle prevention trigger on documents.parent_document_id
-- ============================================================================

-- ============================================================================
-- 1. Enhanced document_hierarchy view with organization_id
-- Replaces the version from 004_missing_rpcs_views_triggers.sql
-- Now includes organization_id for multi-tenant isolation
-- ============================================================================

CREATE OR REPLACE VIEW public.document_hierarchy AS
WITH RECURSIVE doc_tree AS (
  -- Base: documents with no parent
  SELECT
    d.id,
    d.organization_id,
    d.document_number,
    d.title,
    d.doc_type,
    d.status,
    d.document_level AS level,
    d.parent_document_id,
    d.department_code,
    d.iso_clause,
    0 AS depth,
    ARRAY[d.id] AS path_ids,
    ARRAY[d.document_number] AS path_numbers
  FROM documents d
  WHERE d.parent_document_id IS NULL

  UNION ALL

  -- Recursive: children
  SELECT
    d.id,
    d.organization_id,
    d.document_number,
    d.title,
    d.doc_type,
    d.status,
    d.document_level AS level,
    d.parent_document_id,
    d.department_code,
    d.iso_clause,
    dt.depth + 1,
    dt.path_ids || d.id,
    dt.path_numbers || d.document_number
  FROM documents d
  INNER JOIN doc_tree dt ON d.parent_document_id = dt.id
  WHERE NOT d.id = ANY(dt.path_ids) -- prevent cycles
)
SELECT
  id,
  organization_id,
  document_number,
  title,
  doc_type,
  status,
  level,
  parent_document_id,
  department_code,
  iso_clause,
  depth,
  path_ids,
  path_numbers
FROM doc_tree;

-- ============================================================================
-- 2. Hierarchy-specific indexes (complement 008_optimized_indexes.sql)
-- ============================================================================

-- Fast lookup of root documents (no parent) per org
CREATE INDEX IF NOT EXISTS idx_documents_root_per_org
  ON documents (organization_id)
  WHERE parent_document_id IS NULL;

-- Fast lookup of children by parent
CREATE INDEX IF NOT EXISTS idx_documents_parent_lookup
  ON documents (parent_document_id)
  WHERE parent_document_id IS NOT NULL;

-- Hierarchy traversal: org + level combination for dashboard stats
CREATE INDEX IF NOT EXISTS idx_documents_org_level
  ON documents (organization_id, document_level);

-- Count children per parent (covering index for stats)
CREATE INDEX IF NOT EXISTS idx_documents_org_parent_covering
  ON documents (organization_id, parent_document_id)
  INCLUDE (id, document_number, title, status, document_level);

-- ============================================================================
-- 3. RPC: get_hierarchy_stats — statistics for the hierarchy dashboard
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_hierarchy_stats(p_org_id uuid)
RETURNS TABLE (
  total_documents bigint,
  root_documents bigint,
  max_depth integer,
  avg_depth numeric,
  level_1_count bigint,
  level_2_count bigint,
  level_3_count bigint,
  level_4_count bigint,
  orphan_level_3_4 bigint,
  documents_with_children bigint,
  avg_children_per_parent numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- Total documents in org
    (SELECT count(*) FROM documents WHERE organization_id = p_org_id)::bigint,

    -- Root documents (no parent)
    (SELECT count(*) FROM documents WHERE organization_id = p_org_id AND parent_document_id IS NULL)::bigint,

    -- Maximum depth from the hierarchy view
    (SELECT COALESCE(MAX(depth), 0) FROM document_hierarchy WHERE organization_id = p_org_id)::integer,

    -- Average depth
    (SELECT COALESCE(AVG(depth), 0)::numeric(5,2) FROM document_hierarchy WHERE organization_id = p_org_id),

    -- Per-level counts
    (SELECT count(*) FROM documents WHERE organization_id = p_org_id AND document_level = 1)::bigint,
    (SELECT count(*) FROM documents WHERE organization_id = p_org_id AND document_level = 2)::bigint,
    (SELECT count(*) FROM documents WHERE organization_id = p_org_id AND document_level = 3)::bigint,
    (SELECT count(*) FROM documents WHERE organization_id = p_org_id AND document_level = 4)::bigint,

    -- Orphans: level 3-4 docs without a parent
    (SELECT count(*) FROM documents
     WHERE organization_id = p_org_id
       AND parent_document_id IS NULL
       AND document_level >= 3
    )::bigint,

    -- Documents that have children
    (SELECT count(DISTINCT parent_document_id) FROM documents
     WHERE organization_id = p_org_id AND parent_document_id IS NOT NULL
    )::bigint,

    -- Average children per parent
    (SELECT CASE
       WHEN cnt = 0 THEN 0::numeric
       ELSE (SELECT count(*)::numeric FROM documents WHERE organization_id = p_org_id AND parent_document_id IS NOT NULL) / cnt
     END
     FROM (SELECT count(DISTINCT parent_document_id) AS cnt FROM documents
           WHERE organization_id = p_org_id AND parent_document_id IS NOT NULL) sub
    )
  ;
$$;

-- ============================================================================
-- 4. Cycle prevention trigger on documents.parent_document_id
-- Prevents creating circular references in the document hierarchy
-- ============================================================================

CREATE OR REPLACE FUNCTION public.prevent_document_cycle()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_id uuid;
  v_parent_id uuid;
  v_depth integer := 0;
  v_max_depth integer := 20; -- Safety limit to prevent infinite loops
BEGIN
  -- Only check if parent_document_id is being set or changed
  IF NEW.parent_document_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Cannot set self as parent
  IF NEW.parent_document_id = NEW.id THEN
    RAISE EXCEPTION 'Un document ne peut pas être son propre parent (cycle détecté)';
  END IF;

  -- Walk up the parent chain to detect cycles
  v_current_id := NEW.parent_document_id;
  WHILE v_current_id IS NOT NULL AND v_depth < v_max_depth LOOP
    IF v_current_id = NEW.id THEN
      RAISE EXCEPTION 'Référence circulaire détectée dans la hiérarchie documentaire : le document cible est déjà un ancêtre';
    END IF;

    SELECT parent_document_id INTO v_parent_id
    FROM documents
    WHERE id = v_current_id;

    v_current_id := v_parent_id;
    v_depth := v_depth + 1;
  END LOOP;

  -- Also enforce level consistency: parent must have a lower level number
  IF EXISTS (
    SELECT 1 FROM documents WHERE id = NEW.parent_document_id
    AND document_level >= NEW.document_level
  ) THEN
    RAISE EXCEPTION 'Incohérence de niveau hiérarchique : le document parent (niveau %) doit avoir un niveau inférieur au document enfant (niveau %)',
      (SELECT document_level FROM documents WHERE id = NEW.parent_document_id),
      NEW.document_level;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if any, then create
DROP TRIGGER IF EXISTS trg_prevent_document_cycle ON documents;
CREATE TRIGGER trg_prevent_document_cycle
  BEFORE INSERT OR UPDATE OF parent_document_id ON documents
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_document_cycle();

-- ============================================================================
-- 5. RPC: get_document_children — direct children of a document
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_document_children(p_doc_id uuid, p_org_id uuid)
RETURNS TABLE (
  id uuid,
  document_number text,
  title text,
  doc_type text,
  status text,
  document_level integer,
  department_code text,
  iso_clause text,
  child_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    d.id,
    d.document_number,
    d.title,
    d.doc_type,
    d.status,
    d.document_level,
    d.department_code,
    d.iso_clause,
    (SELECT count(*) FROM documents dc WHERE dc.parent_document_id = d.id)::bigint AS child_count
  FROM documents d
  WHERE d.parent_document_id = p_doc_id
    AND d.organization_id = p_org_id
  ORDER BY d.document_level, d.document_number;
$$;

-- ============================================================================
-- 6. RPC: get_document_ancestors — breadcrumb path from root to a document
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_document_ancestors(p_doc_id uuid)
RETURNS TABLE (
  id uuid,
  document_number text,
  title text,
  doc_type text,
  status text,
  document_level integer,
  depth integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE ancestors AS (
    -- Start from the document's parent
    SELECT
      d.id, d.document_number, d.title, d.doc_type, d.status, d.document_level,
      0 AS depth
    FROM documents d
    WHERE d.id = (SELECT parent_document_id FROM documents WHERE id = p_doc_id)

    UNION ALL

    SELECT
      d.id, d.document_number, d.title, d.doc_type, d.status, d.document_level,
      a.depth + 1
    FROM documents d
    INNER JOIN ancestors a ON d.id = a.parent_document_id
  )
  SELECT * FROM ancestors ORDER BY depth DESC;
$$;

-- ============================================================================
-- 7. RLS policies for document_hierarchy view
-- ============================================================================

-- Note: Views in PostgreSQL inherit RLS from their underlying tables.
-- The documents table already has RLS policies filtering by organization_id.
-- The document_hierarchy view will automatically be filtered.
-- However, if direct view access is needed without table RLS:
ALTER VIEW document_hierarchy OWNER TO postgres;

-- ============================================================================
-- 8. Index on document_relationships for hierarchy operations
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_document_relationships_parent
  ON document_relationships (parent_document_id, relationship_type);

CREATE INDEX IF NOT EXISTS idx_document_relationships_child
  ON document_relationships (child_document_id, relationship_type);