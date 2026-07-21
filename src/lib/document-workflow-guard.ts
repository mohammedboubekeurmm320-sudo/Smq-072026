// ============================================================
// Document Workflow Guard — Séparation des tâches (21 CFR Part 11 §11.10)
// Valide les transitions de statut documentaire avec vérification SoD.
// Peut fonctionner côté applicatif (double-check) ou serveur.
// ============================================================

import type { SupabaseClient } from '@supabase/supabase-js'

export interface WorkflowCheckResult {
  allowed: boolean
  reason?: string
}

// Workflow ordonné : chaque statut ne peut atteindre que le suivant
const VALID_SUCCESSORS: Record<string, string[]> = {
  'Draft': ['Under Review'],
  'Under Review': ['Approved'],
  'Approved': ['Effective'],
  'Effective': ['Obsolete'],
}

// Statuts terminaux qui peuvent être atteints depuis n'importe quel état
const TERMINAL_TRANSITIONS = ['Obsolete', 'Withdrawn']

/**
 * Vérifie si une transition de statut documentaire est autorisée.
 *
 * Règles :
 * 1. Draft → Under Review : toujours autorisé
 * 2. Under Review → Approved : signature électronique d'approbation requise,
 *    signée par un profil DISTINCT de l'auteur (séparation des tâches)
 * 3. Approved → Effective : effective_date renseignée et <= maintenant
 * 4. Saut d'étape (ex. Draft → Approved) : interdit
 * 5. Vers Obsolete/Withdrawn : toujours autorisé
 * 6. Même statut (pas de changement) : toujours autorisé
 */
export async function checkDocumentStatusTransition(
  client: SupabaseClient<any>,
  organizationId: string,
  documentId: string,
  currentStatus: string,
  newStatus: string,
  requestingProfileId: string,
): Promise<WorkflowCheckResult> {
  // Pas de changement → autorisé (règle 6)
  if (currentStatus === newStatus) {
    return { allowed: true }
  }

  // Transitions vers statuts terminaux → toujours autorisées (règle 5)
  if (TERMINAL_TRANSITIONS.includes(newStatus)) {
    return { allowed: true }
  }

  // Règle 1 : Draft → Under Review
  if (currentStatus === 'Draft' && newStatus === 'Under Review') {
    return { allowed: true }
  }

  // Règle 2 : Under Review → Approved — séparation des tâches
  if (currentStatus === 'Under Review' && newStatus === 'Approved') {
    return checkApprovalTransition(client, organizationId, documentId, requestingProfileId)
  }

  // Règle 3 : Approved → Effective — date effective obligatoire
  if (currentStatus === 'Approved' && newStatus === 'Effective') {
    return checkEffectiveTransition(client, organizationId, documentId)
  }

  // Règle 4 : vérifier que la transition suit le workflow défini
  const validSuccessors = VALID_SUCCESSORS[currentStatus]
  if (!validSuccessors || !validSuccessors.includes(newStatus)) {
    return {
      allowed: false,
      reason: `Transition non autorisée : ${currentStatus} → ${newStatus}. Le workflow impose : ${validSuccessors ? validSuccessors.join(' → ') : 'aucune transition définie'}.`,
    }
  }

  // Fallback : autoriser si le workflow est respecté
  return { allowed: true }
}

/**
 * Vérifie la transition Under Review → Approved :
 * - Une signature électronique d'approbation non révoquée doit exister
 * - Le signataire doit être distinct de l'auteur ET du créateur
 */
async function checkApprovalTransition(
  client: SupabaseClient<any>,
  _organizationId: string,
  documentId: string,
  _requestingProfileId: string,
): Promise<WorkflowCheckResult> {
  // 1. Récupérer l'auteur et créateur du document
  const { data: doc, error: docError } = await client
    .from('documents')
    .select('author_id, created_by')
    .eq('id', documentId)
    .single()

  if (docError || !doc) {
    return { allowed: false, reason: 'Document introuvable lors de la vérification du workflow.' }
  }

  const authorId = doc.author_id || doc.created_by
  const creatorId = doc.created_by

  // 2. Vérifier l'existence d'une signature d'approbation non révoquée
  const { data: approvalSig, error: sigError } = await client
    .from('electronic_signatures')
    .select('signed_by_id')
    .eq('record_type', 'documents')
    .eq('record_id', documentId)
    .eq('signature_type', 'approval')
    .eq('revoked', false)
    .limit(1)
    .maybeSingle()

  if (sigError) {
    return { allowed: false, reason: 'Erreur lors de la vérification des signatures électroniques.' }
  }

  if (!approvalSig) {
    return {
      allowed: false,
      reason: 'Ce document doit être approuvé par une signature électronique de type "approval" avant de passer au statut Approuvé.',
    }
  }

  // 3. Séparation des tâches : l'approbateur doit être distinct de l'auteur
  if (approvalSig.signed_by_id === authorId) {
    return {
      allowed: false,
      reason: "Séparation des tâches (21 CFR Part 11 §11.10) : l'auteur du document ne peut pas l'approuver. Un autre utilisateur qualifié doit signer l'approbation.",
    }
  }

  if (approvalSig.signed_by_id === creatorId && authorId !== creatorId) {
    return {
      allowed: false,
      reason: "Séparation des tâches (21 CFR Part 11 §11.10) : le créateur du document ne peut pas l'approuver. Un autre utilisateur qualifié doit signer l'approbation.",
    }
  }

  return { allowed: true }
}

/**
 * Vérifie la transition Approved → Effective :
 * - effective_date doit être renseignée et <= maintenant
 */
async function checkEffectiveTransition(
  client: SupabaseClient<any>,
  _organizationId: string,
  documentId: string,
): Promise<WorkflowCheckResult> {
  const { data: doc, error } = await client
    .from('documents')
    .select('effective_date')
    .eq('id', documentId)
    .single()

  if (error || !doc) {
    return { allowed: false, reason: 'Document introuvable lors de la vérification de la date effective.' }
  }

  if (!doc.effective_date) {
    return {
      allowed: false,
      reason: 'La date effective doit être renseignée pour passer le document au statut Effectif.',
    }
  }

  if (new Date(doc.effective_date) > new Date()) {
    return {
      allowed: false,
      reason: 'La date effective est dans le futur. La date doit être antérieure ou égale à aujourd\'hui.',
    }
  }

  return { allowed: true }
}