-- ============================================================================
-- Migration 010: Document Review Workflow — Séparation des tâches
-- ============================================================================
-- 1. Ajouter reviewer_id aux documents (distinct de approver_id)
-- 2. Index composite sur electronic_signatures pour le garde-fou SoD
-- 3. Fonction RPC de validation de transition avec séparation auteur/approbateur
-- ============================================================================

-- ============================================================================
-- 1. Ajouter reviewer_id à documents
-- Renseigné automatiquement lors de la transition Draft → Under Review
-- par le garde-fou applicatif (document-workflow-guard.ts).
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'reviewer_id'
  ) THEN
    ALTER TABLE documents ADD COLUMN reviewer_id TEXT REFERENCES profiles(id) ON DELETE SET NULL;
    COMMENT ON COLUMN documents.reviewer_id IS 'ID du réviseur assigné (distinct de approver_id). Renseigné par le garde-fou workflow.';
  END IF;
END $$;

-- ============================================================================
-- 2. Index composite sur electronic_signatures
-- Accélère la vérification SoD : "existe-t-il une signature d'approbation
-- par un profil distinct de l'auteur pour ce document ?"
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_esig_record_type_id_sigtype
  ON electronic_signatures (record_type, record_id, signature_type)
  WHERE revoked = false;

CREATE INDEX IF NOT EXISTS idx_esig_record_type_id_sigtype_signedby
  ON electronic_signatures (record_type, record_id, signature_type, signed_by_id)
  WHERE revoked = false;

-- ============================================================================
-- 3. RPC: validate_document_transition
-- Validation serveur du workflow d'approbation avec séparation des tâches.
-- Appelé par le garde-fou applicatif (document-workflow-guard.ts).
-- Peut aussi servir de double-vérification côté BDD.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.validate_document_transition(
  p_document_id    uuid,
  p_current_status text,
  p_new_status     text,
  p_requester_id   text
)
RETURNS TABLE (allowed boolean, reason text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doc          RECORD;
  v_author_id    text;
  v_creator_id   text;
  v_approval_sig RECORD;
BEGIN
  -- Récupérer le document
  SELECT author_id, created_by_id, approver_id, effective_date
    INTO v_doc
  FROM documents
  WHERE id = p_document_id;

  IF NOT FOUND THEN
    allowed := false;
    reason  := 'Document introuvable';
    RETURN NEXT;
    RETURN;
  END IF;

  v_author_id  := COALESCE(v_doc.author_id, v_doc.created_by_id);
  v_creator_id := v_doc.created_by_id;

  -- Pas de changement de statut → toujours autorisé
  IF p_current_status = p_new_status THEN
    allowed := true;
    reason  := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Transitions vers Obsolete/Withdrawn : toujours autorisées
  IF p_new_status IN ('Obsolete', 'Withdrawn') THEN
    allowed := true;
    reason  := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  -- ------------------------------------------------------------------
  -- Draft → Under Review : autorisé sans condition
  -- ------------------------------------------------------------------
  IF p_current_status = 'Draft' AND p_new_status = 'Under Review' THEN
    allowed := true;
    reason  := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  -- ------------------------------------------------------------------
  -- Under Review → Approved : séparation des tâches
  -- ------------------------------------------------------------------
  IF p_current_status = 'Under Review' AND p_new_status = 'Approved' THEN
    -- Vérifier qu'une signature d'approbation non révoquée existe
    SELECT signed_by_id, signed_at
      INTO v_approval_sig
    FROM electronic_signatures
    WHERE record_type  = 'documents'
      AND record_id    = p_document_id
      AND signature_type = 'approval'
      AND revoked      = false
    LIMIT 1;

    IF NOT FOUND THEN
      allowed := false;
      reason  := 'Ce document doit être approuvé par une signature électronique de type approbation avant de passer au statut Approuvé.';
      RETURN NEXT;
      RETURN;
    END IF;

    -- Séparation des tâches : l'approbateur doit être distinct de l'auteur
    IF v_approval_sig.signed_by_id = v_author_id THEN
      allowed := false;
      reason  := 'Séparation des tâches : l''auteur du document ne peut pas l''approuver. Un autre utilisateur qualifié doit signer l''approbation.';
      RETURN NEXT;
      RETURN;
    END IF;

    IF v_approval_sig.signed_by_id = v_creator_id THEN
      allowed := false;
      reason  := 'Séparation des tâches : le créateur du document ne peut pas l''approuver. Un autre utilisateur qualifié doit signer l''approbation.';
      RETURN NEXT;
      RETURN;
    END IF;

    allowed := true;
    reason  := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  -- ------------------------------------------------------------------
  -- Approved → Effective : date effective obligatoire
  -- ------------------------------------------------------------------
  IF p_current_status = 'Approved' AND p_new_status = 'Effective' THEN
    IF v_doc.effective_date IS NULL OR v_doc.effective_date > now() THEN
      allowed := false;
      reason  := 'La date effective doit être renseignée et ne pas être dans le futur pour passer au statut Effectif.';
      RETURN NEXT;
      RETURN;
    END IF;

    allowed := true;
    reason  := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  -- ------------------------------------------------------------------
  -- Toute autre transition qui saute une étape → rejetée
  -- ------------------------------------------------------------------
  allowed := false;
  reason  := format(
    'Transition de statut non autorisée : %s → %s. Les transitions doivent suivre le workflow défini (Draft → Under Review → Approved → Effective).',
    p_current_status, p_new_status
  );
  RETURN NEXT;
  RETURN;
END;
$$;