import { supabase } from './supabase'

// ============================================================================
// Case conversion helpers
// ============================================================================

function camelToSnake(key: string): string {
  // Handle known multi-word mappings efficiently
  const map: Record<string, string> = {
    organizationId: 'organization_id', profileId: 'profile_id',
    createdById: 'created_by_id', updatedById: 'updated_by_id',
    authorId: 'author_id', approverId: 'approver_id',
    assignedToId: 'assigned_to_id', ownerId: 'owner_id',
    leadAuditorId: 'lead_auditor_id', completedSignedById: 'completed_signed_by_id',
    closedById: 'closed_by_id', requestedById: 'requested_by_id',
    approvedById: 'approved_by_id', linkedCapaId: 'linked_capa_id',
    linkedNcrId: 'linked_ncr_id', linkedAuditId: 'linked_audit_id',
    linkedDocumentId: 'linked_document_id', documentId: 'document_id',
    supplierId: 'supplier_id', masterFormulaId: 'master_formula_id',
    qualificationDocId: 'qualification_doc_id', templateReferenceId: 'template_reference_id',
    templateId: 'template_id', parentDocumentId: 'parent_document_id',
    sourceRecordId: 'source_record_id', targetRecordId: 'target_record_id',
    sourceRecordType: 'source_record_type', targetRecordType: 'target_record_type',
    organizationMemberId: 'organization_member_id',
    sequenceNumber: 'sequence_number', auditAction: 'audit_action',
    tableName: 'table_name', recordId: 'record_id', userId: 'user_id',
    userEmail: 'user_email', previousHash: 'previous_hash',
    oldValuesJson: 'old_values_json', newValuesJson: 'new_values_json',
    createdAt: 'created_at', updatedAt: 'updated_at', lastLoginAt: 'last_login_at',
    fullName: 'full_name', passwordHash: 'password_hash', jobTitle: 'job_title',
    docType: 'doc_type', documentNumber: 'document_number',
    documentLevel: 'document_level', departmentCode: 'department_code',
    isPrerequisite: 'is_prerequisite', reviewCycleMonths: 'review_cycle_months',
    validationPhase: 'validation_phase', effectiveDate: 'effective_date',
    expirationDate: 'expiration_date', nextReview: 'next_review',
    docScope: 'doc_scope', docReferences: 'doc_references',
    isTemplate: 'is_template', templateReferenceVersion: 'template_reference_version',
    typeSpecificData: 'type_specific_data', customFieldsJson: 'custom_fields_json',
    capaType: 'capa_type', sourceReferenceId: 'source_reference_id',
    problemStatement: 'problem_statement', investigationDetails: 'investigation_details',
    rootCauseAnalysis: 'root_cause_analysis', rootCauseCategory: 'root_cause_category',
    fiveWhysJson: 'five_whys_json', correctiveAction: 'corrective_action',
    effectivenessVerificationMethod: 'effectiveness_verification_method',
    effectivenessCriteria: 'effectiveness_criteria', effectivenessResult: 'effectiveness_result',
    closedDate: 'closed_date', createdDate: 'created_date', capaNumber: 'capa_number',
    ncrType: 'ncr_type', lotNumber: 'lot_number', quantityAffected: 'quantity_affected',
    isOosOot: 'is_oos_oot', analyticalMethod: 'analytical_method',
    measuredValue: 'measured_value', measuredUnit: 'measured_unit', specLimit: 'spec_limit',
    phase1Conclusion: 'phase1_conclusion', phase2Required: 'phase2_required',
    phase2Conclusion: 'phase2_conclusion', rejectLot: 'reject_lot',
    linkedProcedureRef: 'linked_procedure_ref', impactAssessment: 'impact_assessment',
    containmentActions: 'containment_actions', affectedProduct: 'affected_product',
    closedSignatureHash: 'closed_signature_hash', closedSignedAt: 'closed_signed_at',
    ncrNumber: 'ncr_number', deviationType: 'deviation_type',
    deviationDetails: 'deviation_details', productStage: 'product_stage',
    isPlannedDeviation: 'is_planned_deviation', productCode: 'product_code',
    ccType: 'cc_type', proposedChange: 'proposed_change',
    detailedChangeDescription: 'detailed_change_description',
    businessComplianceJustification: 'business_compliance_justification',
    riskAssessment: 'risk_assessment', impactAnalysis: 'impact_analysis',
    affectedAreas: 'affected_areas', impactOnValidatedSystems: 'impact_on_validated_systems',
    impactOnValidatedState: 'impact_on_validated_state',
    impactOnRegulatoryFiling: 'impact_on_regulatory_filing',
    containmentAction: 'containment_action', detectedDate: 'detected_date',
    implementationPlan: 'implementation_plan', implementationDate: 'implementation_date',
    estimatedCostImpact: 'estimated_cost_impact', completionDate: 'completion_date',
    regulatoryTrigger: 'regulatory_trigger', emergencyFlag: 'emergency_flag',
    additionalReferences: 'additional_references', ccNumber: 'cc_number',
    auditType: 'audit_type', auditScope: 'audit_scope', scheduledDate: 'scheduled_date',
    completedSignedAt: 'completed_signed_at', auditNumber: 'audit_number',
    hazardDescription: 'hazard_description', riskOwner: 'risk_owner',
    regulatoryReference: 'regulatory_reference', controlType: 'control_type',
    verificationMethod: 'verification_method', riskAcceptability: 'risk_acceptability',
    priorityNotes: 'priority_notes', riskLevel: 'risk_level', residualRisk: 'residual_risk',
    residualProbability: 'residual_probability', residualImpact: 'residual_impact',
    residualDetectability: 'residual_detectability', residualRpn: 'residual_rpn',
    riskNumber: 'risk_number', trainingType: 'training_type',
    metadataJson: 'metadata_json', productName: 'product_name',
    batchSize: 'batch_size', batchSizeUnit: 'batch_size_unit',
    manufacturingDate: 'manufacturing_date', expiryDate: 'expiry_date',
    isLocked: 'is_locked', qaReleaseDate: 'qa_release_date',
    qaReleasedById: 'qa_released_by_id', stepsJson: 'steps_json',
    rawMaterialsJson: 'raw_materials_json', qualificationDate: 'qualification_date',
    nextReviewDate: 'next_review_date', certificationsJson: 'certifications_json',
    performanceScore: 'performance_score', qualificationMethod: 'qualification_method',
    qualificationDocRef: 'qualification_doc_ref', primaryContactName: 'primary_contact_name',
    primaryContactEmail: 'primary_contact_email', primaryContactPhone: 'primary_contact_phone',
    stateProvince: 'state_province', postalCode: 'postal_code',
    emergencyContactName: 'emergency_contact_name',
    emergencyContactPhone: 'emergency_contact_phone', supplierCode: 'supplier_code',
    statusFlowJson: 'status_flow_json', defaultFieldsJson: 'default_fields_json',
    complianceRefsJson: 'compliance_refs_json', codePrefix: 'code_prefix',
    isSystem: 'is_system', isActive: 'is_active', requiresEsig: 'requires_esig',
    minApproverCount: 'min_approver_count', recipientsJson: 'recipients_json',
    filtersJson: 'filters_json', nextRunAt: 'next_run_at', lastRunAt: 'last_run_at',
    lastResult: 'last_result', reportType: 'report_type', linkType: 'link_type',
    subscriptionStatus: 'subscription_status', nameEn: 'name_en',
    fieldName: 'field_name', fieldType: 'field_type',
    fieldOptionsJson: 'field_options_json', isRequired: 'is_required',
    prerequisiteDocId: 'prerequisite_doc_id', triggerDocId: 'trigger_doc_id',
    triggerEvent: 'trigger_event', autoAction: 'auto_action',
    parentDocId: 'parent_doc_id', childDocId: 'child_doc_id',
    relationType: 'relation_type', currentSequence: 'current_sequence',
    prefixPattern: 'prefix_pattern', departmentName: 'department_name',
    parentDepartmentId: 'parent_department_id', auditFrequency: 'audit_frequency',
    defaultLeadAuditorId: 'default_lead_auditor_id', signatureHash: 'signature_hash',
    signedAt: 'signed_at', ipAddress: 'ip_address', userAgent: 'user_agent',
    auditeesJson: 'auditees_json', findingsJson: 'findings_json',
    auditCriteria: 'audit_criteria', complianceRating: 'compliance_rating',
    completedSignatureHash: 'completed_signature_hash',
  }
  if (map[key]) return map[key]
  return key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
}

function snakeToCamel(key: string): string {
  return key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}

export function toSnakeCase<T = any>(obj: any): T {
  if (obj === null || obj === undefined) return obj
  if (obj instanceof Date) return obj as any
  if (Array.isArray(obj)) return obj.map(toSnakeCase) as any
  if (typeof obj === 'object') {
    const result: any = {}
    for (const [key, value] of Object.entries(obj)) {
      result[camelToSnake(key)] = toSnakeCase(value)
    }
    return result
  }
  return obj
}

export function toCamelCase<T = any>(obj: any): T {
  if (obj === null || obj === undefined) return obj
  if (obj instanceof Date) return obj as any
  if (Array.isArray(obj)) return obj.map(toCamelCase) as any
  if (typeof obj === 'object') {
    const result: any = {}
    for (const [key, value] of Object.entries(obj)) {
      result[snakeToCamel(key)] = toCamelCase(value)
    }
    return result
  }
  return obj
}

// Date fields that Supabase returns as strings but we need as Date objects
const DATE_FIELDS = new Set([
  'createdAt', 'updatedAt', 'lastLoginAt',
  'effectiveDate', 'expirationDate', 'nextReview',
  'dueDate', 'closedDate', 'createdDate',
  'closedSignedAt', 'detectedDate', 'implementationDate',
  'completionDate', 'scheduledDate', 'completedDate',
  'manufacturingDate', 'expiryDate', 'qaReleaseDate',
  'qualificationDate', 'nextReviewDate', 'nextRunAt', 'lastRunAt',
  'signedAt', 'expiresAt',
])

function convertDates(obj: any): any {
  if (obj === null || obj === undefined) return obj
  if (obj instanceof Date) return obj
  if (Array.isArray(obj)) return obj.map(convertDates)
  if (typeof obj === 'object') {
    const result: any = {}
    for (const [key, value] of Object.entries(obj)) {
      if (DATE_FIELDS.has(key) && typeof value === 'string' && value) {
        result[key] = new Date(value)
      } else {
        result[key] = convertDates(value)
      }
    }
    return result
  }
  return obj
}

// ============================================================================
// Where clause builder for Supabase
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyWhere(query: any, _table: string, where: Record<string, any>) {
  let q = query

  for (const [key, value] of Object.entries(where)) {
    if (key === 'OR') {
      handleOr(q, value)
      continue
    }
    if (key === 'AND') {
      for (const andClause of value as any[]) {
        for (const [andKey, andVal] of Object.entries(andClause)) {
          q = q.eq(camelToSnake(andKey), andVal)
        }
      }
      continue
    }
    const snakeKey = camelToSnake(key)
    if (value !== null && typeof value === 'object' && 'contains' in value) {
      q = q.ilike(snakeKey, `%${(value as any).contains}%`)
    } else if (value === null || value === undefined) {
      // skip
    } else {
      q = q.eq(snakeKey, value)
    }
  }

  return q
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function handleOr(query: any, orClauses: any[]) {
  if (!orClauses || orClauses.length === 0) return

  const orParts: string[] = []

  for (const clause of orClauses) {
    if (clause.AND) {
      const andParts: string[] = []
      for (const andItem of clause.AND) {
        for (const [key, val] of Object.entries(andItem)) {
          andParts.push(`${camelToSnake(key)}.eq.${val}`)
        }
      }
      if (andParts.length > 0) {
        orParts.push(`and(${andParts.join(',')})`)
      }
    } else {
      // Simple { field: { contains: value } } clauses
      for (const [key, value] of Object.entries(clause)) {
        if (value !== null && typeof value === 'object' && 'contains' in value) {
          orParts.push(`${camelToSnake(key)}.ilike.%${(value as any).contains}%`)
        }
      }
    }
  }

  if (orParts.length > 0) {
    query.or(orParts.join(','))
  }
}

// ============================================================================
// Model wrapper factory
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaOrderBy = Record<string, 'asc' | 'desc'>

interface FindManyArgs {
  where?: Record<string, any>
  orderBy?: PrismaOrderBy | PrismaOrderBy[]
  include?: Record<string, any>
  select?: Record<string, boolean>
  take?: number
  skip?: number
}

interface FindUniqueArgs {
  where: Record<string, any>
  include?: Record<string, any>
  select?: Record<string, boolean>
}

interface FindFirstArgs {
  where?: Record<string, any>
  orderBy?: PrismaOrderBy | PrismaOrderBy[]
  include?: Record<string, any>
  select?: Record<string, boolean>
}

interface CreateArgs {
  data: Record<string, any>
  select?: Record<string, boolean>
}

interface UpdateArgs {
  where: { id: string } | Record<string, any>
  data: Record<string, any>
  select?: Record<string, boolean>
}

interface DeleteArgs {
  where: { id: string }
}

interface DeleteManyArgs {
  where: Record<string, any>
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createModelWrapper(tableName: string): any {
  return {
    async findMany(args: FindManyArgs = {}) {
      const { where = {}, orderBy, include, select, take, skip } = args

      let selectStr: string | undefined
      if (select) {
        const cols = Object.keys(select).map(k => camelToSnake(k)).join(',')
        selectStr = cols
      } else if (include) {
        // For includes, we'd need PostgREST nested select - kept simple here
        selectStr = undefined
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query: any = supabase.from(tableName).select(selectStr || '*')
      query = applyWhere(query, tableName, where)

      if (orderBy) {
        const orders = Array.isArray(orderBy) ? orderBy : [orderBy]
        for (const o of orders) {
          for (const [key, dir] of Object.entries(o)) {
            query = query.order(camelToSnake(key), { ascending: dir === 'asc' })
          }
        }
      }

      if (skip) query = query.range(skip, skip + (take || 1000) - 1)
      else if (take) query = query.limit(take)

      const { data, error } = await query
      if (error) throw new Error(`${error.message} (${error.code})`)
      return (data || []).map((r: any) => convertDates(toCamelCase(r)))
    },

    async findUnique(args: FindUniqueArgs) {
      const { where, select } = args

      let selectStr: string | undefined
      if (select) {
        selectStr = Object.keys(select).map(k => camelToSnake(k)).join(',')
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query: any = supabase.from(tableName).select(selectStr || '*')

      if (where.email !== undefined) {
        query = query.eq('email', where.email)
      } else if (where.token !== undefined) {
        query = query.eq('token', where.token)
      } else if (where.id !== undefined) {
        query = query.eq('id', where.id)
      } else if (where.slug !== undefined) {
        query = query.eq('slug', where.slug)
      } else {
        // Composite unique
        for (const [key, val] of Object.entries(where)) {
          query = query.eq(camelToSnake(key), val)
        }
      }

      const { data, error } = await query.single()
      if (error) {
        if (error.code === 'PGRST116') return null
        throw new Error(`${error.message} (${error.code})`)
      }
      return convertDates(toCamelCase(data))
    },

    async findFirst(args: FindFirstArgs = {}) {
      const { where = {}, orderBy, select } = args

      let selectStr: string | undefined
      if (select) {
        selectStr = Object.keys(select).map(k => camelToSnake(k)).join(',')
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query: any = supabase.from(tableName).select(selectStr || '*')
      query = applyWhere(query, tableName, where)

      if (orderBy) {
        const orders = Array.isArray(orderBy) ? orderBy : [orderBy]
        for (const o of orders) {
          for (const [key, dir] of Object.entries(o)) {
            query = query.order(camelToSnake(key), { ascending: dir === 'asc' })
          }
        }
      }

      query = query.limit(1)

      const { data, error } = await query
      if (error) throw new Error(`${error.message} (${error.code})`)
      if (!data || data.length === 0) return null
      return convertDates(toCamelCase(data[0]))
    },

    async create(args: CreateArgs) {
      const { data, select } = args
      const snakeData = toSnakeCase(data)

      let selectStr: string | undefined
      if (select) {
        selectStr = Object.keys(select).map(k => camelToSnake(k)).join(',')
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query: any = supabase.from(tableName).insert(snakeData)
      if (selectStr) {
        query = query.select(selectStr)
      } else {
        query = query.select()
      }

      const { data: result, error } = await query.single()
      if (error) throw new Error(`${error.message} (${error.code})`)
      return convertDates(toCamelCase(result))
    },

    async update(args: UpdateArgs) {
      const { where, data, select } = args
      const snakeData = toSnakeCase(data)

      let selectStr: string | undefined
      if (select) {
        selectStr = Object.keys(select).map(k => camelToSnake(k)).join(',')
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query: any = supabase.from(tableName).update(snakeData)

      if (where.id) {
        query = query.eq('id', where.id)
      } else {
        for (const [key, val] of Object.entries(where)) {
          query = query.eq(camelToSnake(key), val)
        }
      }

      if (selectStr) {
        query = query.select(selectStr)
      } else {
        query = query.select()
      }

      const { data: result, error } = await query.single()
      if (error) throw new Error(`${error.message} (${error.code})`)
      return convertDates(toCamelCase(result))
    },

    async delete(args: DeleteArgs) {
      const { error } = await supabase.from(tableName)
        .delete()
        .eq('id', args.where.id)
      if (error) throw new Error(`${error.message} (${error.code})`)
      return null
    },

    async deleteMany(args: DeleteManyArgs) {
      const { where } = args
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query: any = supabase.from(tableName).delete()

      for (const [key, val] of Object.entries(where)) {
        if (val !== undefined && val !== null) {
          query = query.eq(camelToSnake(key), val)
        }
      }

      const { error } = await query
      if (error) throw new Error(`${error.message} (${error.code})`)
      return { count: 0 }
    },

    async count(args: { where?: Record<string, any> } = {}) {
      const { where = {} } = args
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query: any = supabase.from(tableName).select('id', { count: 'exact', head: true })
      query = applyWhere(query, tableName, where)
      const { count, error } = await query
      if (error) throw new Error(`${error.message} (${error.code})`)
      return count ?? 0
    },
  }
}

// ============================================================================
// The db object — mirrors Prisma client property structure
// ============================================================================

export const db = {
  profile: createModelWrapper('profiles'),
  session: createModelWrapper('sessions'),
  organization: createModelWrapper('organizations'),
  organizationMember: createModelWrapper('organization_members'),
  document: createModelWrapper('documents'),
  cAPA: createModelWrapper('capas'),
  nonConformance: createModelWrapper('non_conformances'),
  deviation: createModelWrapper('deviations'),
  changeControl: createModelWrapper('change_controls'),
  audit: createModelWrapper('audits'),
  risk: createModelWrapper('risks'),
  training: createModelWrapper('training'),
  batchRecord: createModelWrapper('batch_records'),
  supplier: createModelWrapper('suppliers'),
  auditTrail: createModelWrapper('audit_trails'),
  recordTypeDefinition: createModelWrapper('record_type_definitions'),
  recordLink: createModelWrapper('record_links'),
  customFieldDefinition: createModelWrapper('custom_field_definitions'),
  scheduledReport: createModelWrapper('scheduled_reports'),
  electronicSignature: createModelWrapper('electronic_signatures'),
  documentPrerequisite: createModelWrapper('document_prerequisites'),
  documentTrigger: createModelWrapper('document_triggers'),
  documentRelationship: createModelWrapper('document_relationships'),
  documentCodeSequence: createModelWrapper('document_code_sequences'),
  department: createModelWrapper('departments'),
  auditConfig: createModelWrapper('audit_config'),
}