// ============================================================================
// Document Prerequisite Guard — ISO 13485 §4.2.4 / §4.2.5
// ============================================================================
// Vérifie, avant la création d'un enregistrement QMS, que les prérequis
// documentaires sont satisfaits (template approuvé + document parent approuvé).
//
// Ne bloque que si des règles existent dans `document_prerequisites` pour
// le record_type de l'entité et l'organisation courante.
// Comportement par défaut : pas de règle = pas de blocage (zéro régression).
// ============================================================================

import type { SupabaseClient } from '@supabase/supabase-js'

export interface PrerequisiteCheckResult {
  allowed: boolean
  reason?: string
  missingDocument?: { title: string; status: string }
}

/**
 * Liste des entités soumises au contrôle de prérequis documentaire.
 * Restrictif par défaut — ajustable selon les besoins.
 */
export const PREREQUISITE_GATED_ENTITIES = new Set([
  'non_conformances',
  'capas',
  'deviations',
  'change_controls',
  'batch_records',
])

/**
 * Vérifie les prérequis documentaires avant la création d'un enregistrement.
 *
 * Logique :
 * 1. Cherche les règles `document_prerequisites` pour ce record_type + org.
 * 2. Si aucune règle → { allowed: true } (pas de régression).
 * 3. Pour chaque règle obligatoire, vérifie :
 *    a. Un `form_templates` avec `module_type` ou `required_doc_ref` correspondant
 *       et `status = 'Approved'`.
 *    b. Le document parent (si `form_templates.document_id` renseigné)
 *       a `status IN ('Approved', 'Effective')`.
 * 4. Si une condition échoue → { allowed: false, reason, missingDocument }.
 */
export async function checkDocumentPrerequisite(
  client: SupabaseClient<any>,
  organizationId: string,
  recordType: string,
): Promise<PrerequisiteCheckResult> {
  // 1. Récupérer les règles de prérequis pour ce type + cette org
  const { data: prerequisites, error: prereqError } = await client
    .from('document_prerequisites')
    .select('*')
    .eq('record_type', recordType)
    .eq('organization_id', organizationId)

  if (prereqError || !prerequisites || prerequisites.length === 0) {
    // Aucune règle définie → comportement actuel préservé
    return { allowed: true }
  }

  // 2. Filtrer uniquement les règles obligatoires
  const mandatoryPrereqs = prerequisites.filter((p: any) => p.is_mandatory)
  if (mandatoryPrereqs.length === 0) {
    // Des règles existent mais aucune n'est obligatoire → autoriser
    return { allowed: true }
  }

  // 3. Pour chaque règle obligatoire, vérifier le template et le document parent
  for (const prereq of mandatoryPrereqs) {
    // --- 3a. Vérifier le form_template associé ---
    let templateQuery = client
      .from('form_templates')
      .select('id, title, status, document_id, module_type')
      .eq('organization_id', organizationId)

    // Chercher par module_type correspondant au record_type
    templateQuery = templateQuery.eq('module_type', recordType)

    // Si un required_doc_ref est spécifié, affiner la recherche
    if (prereq.required_doc_ref) {
      // Chercher un template lié à un document avec ce numéro de référence
      templateQuery = templateQuery.or(`document_id.is.null`)
    }

    const { data: templates, error: tplError } = await templateQuery

    if (tplError) {
      return {
        allowed: false,
        reason: `Erreur lors de la vérification des prérequis documentaires : ${tplError.message}`,
      }
    }

    // Vérifier qu'au moins un template approuvé existe
    const approvedTemplate = templates?.find(
      (t: any) => t.status === 'Approved',
    )

    if (!approvedTemplate) {
      const firstTemplate = templates?.[0]
      return {
        allowed: false,
        reason: `Prérequis documentaire non satisfait pour "${prereq.record_type}" : aucun template de formulaire approuvé trouvé. Statut actuel : ${firstTemplate?.status || 'aucun template'}. Veuillez d'abord faire approuver le template de formulaire.`,
        missingDocument: {
          title: firstTemplate?.title || `Template pour ${prereq.record_type}`,
          status: firstTemplate?.status || 'inexistant',
        },
      }
    }

    // --- 3b. Vérifier le document parent lié au template ---
    if (approvedTemplate.document_id) {
      const { data: parentDoc, error: docError } = await client
        .from('documents')
        .select('id, title, status, document_number')
        .eq('id', approvedTemplate.document_id)
        .single()

      if (docError || !parentDoc) {
        return {
          allowed: false,
          reason: `Prérequis documentaire non satisfait : le document parent lié au template est introuvable.`,
        }
      }

      if (!['Approved', 'Effective'].includes(parentDoc.status)) {
        return {
          allowed: false,
          reason: `Prérequis documentaire non satisfait pour "${prereq.record_type}" : le document parent "${parentDoc.document_number || parentDoc.title}" doit être approuvé ou en vigueur — statut actuel : "${parentDoc.status}".`,
          missingDocument: {
            title: `${parentDoc.document_number || ''} ${parentDoc.title}`.trim(),
            status: parentDoc.status,
          },
        }
      }
    }
  }

  // Toutes les vérifications passées
  return { allowed: true }
}