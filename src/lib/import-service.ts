// ============================================================================
// Import Service — CSV import with field validation, type coercion, and template
// ============================================================================
// Extracted from inline logic in /api/import/route.ts for testability and reuse.
// Handles RFC 4180 CSV parsing, per-entity field mapping, validation, and
// type coercion (dates, numbers, booleans, enums).
// ============================================================================

export interface ImportFieldDef {
  /** CSV column header (case-insensitive) */
  header: string
  /** Target DB column name */
  dbColumn: string
  /** Field type for validation/coercion */
  type: 'required' | 'number' | 'date' | 'enum' | 'boolean' | 'default'
  /** For enum: allowed values */
  enumValues?: string[]
  /** For required fields: whether empty is allowed */
  required?: boolean
}

export interface ImportError {
  row: number
  errors: string[]
}

export interface ImportResult {
  valid: Record<string, unknown>[]
  invalid: ImportError[]
}

// ---------------------------------------------------------------------------
// Field mapping per entity — maps CSV headers → DB columns with type info
// ---------------------------------------------------------------------------

const ENTITY_FIELD_MAPS: Record<string, ImportFieldDef[]> = {
  documents: [
    { header: 'Document Number', dbColumn: 'document_number', type: 'required', required: true },
    { header: 'Title', dbColumn: 'title', type: 'required', required: true },
    { header: 'Type', dbColumn: 'type', type: 'enum', enumValues: ['MANUEL','POLITIQUE','INDICATEUR','PROCESS_MAP','ORGANIGRAMME','REGLEMENTAIRE','MAPPING','PROCEDURE','INSTRUCTION','FORMULAIRE','REGISTRE','ENREGISTREMENT','MASTER_BATCH','SOP','WI','Form','Policy','Specification','Technical','Risk_Analysis','Validation_Protocol','Record','Manual','Instruction','Register','Process_Map','Organigram'], required: true },
    { header: 'Version', dbColumn: 'version', type: 'default' },
    { header: 'Status', dbColumn: 'status', type: 'enum', enumValues: ['Draft','Under Review','Approved','Effective','Obsolete','Withdrawn'] },
    { header: 'Effective Date', dbColumn: 'effective_date', type: 'date' },
    { header: 'Expiration Date', dbColumn: 'expiration_date', type: 'date' },
    { header: 'Owner', dbColumn: 'author_id', type: 'default' },
    { header: 'Department', dbColumn: 'department', type: 'default' },
    { header: 'Description', dbColumn: 'description', type: 'default' },
    { header: 'Classification', dbColumn: 'classification', type: 'enum', enumValues: ['Internal','External','Regulatory','Confidential'] },
    { header: 'Retention Period', dbColumn: 'retention_period', type: 'number' },
    { header: 'Scope', dbColumn: 'scope', type: 'default' },
    { header: 'References', dbColumn: 'references', type: 'default' },
    { header: 'Document Level', dbColumn: 'document_level', type: 'number' },
    { header: 'ISO Clause', dbColumn: 'iso_clause', type: 'default' },
  ],
  capas: [
    { header: 'CAPA Number', dbColumn: 'capa_number', type: 'required', required: true },
    { header: 'Title', dbColumn: 'title', type: 'required', required: true },
    { header: 'Type', dbColumn: 'type', type: 'enum', enumValues: ['Corrective','Preventive'], required: true },
    { header: 'Status', dbColumn: 'status', type: 'enum', enumValues: ['Open','Investigation','Implementation','Effectiveness Check','Closed'] },
    { header: 'Priority', dbColumn: 'priority', type: 'enum', enumValues: ['Critical','High','Medium','Low'] },
    { header: 'Source', dbColumn: 'source', type: 'enum', enumValues: ['Non-Conformance','Audit Finding','Customer Complaint','Management Review','Process Monitoring','Supplier Issue'] },
    { header: 'Description', dbColumn: 'description', type: 'required', required: true },
    { header: 'Root Cause Category', dbColumn: 'root_cause_category', type: 'enum', enumValues: ['Man','Machine','Method','Material','Measurement','Environment','Management'] },
    { header: 'Corrective Action', dbColumn: 'corrective_action', type: 'default' },
    { header: 'Assigned To', dbColumn: 'assigned_to', type: 'required', required: true },
    { header: 'Due Date', dbColumn: 'due_date', type: 'date', required: true },
    { header: 'Created Date', dbColumn: 'created_at', type: 'date', required: true },
  ],
  non_conformances: [
    { header: 'NCR Number', dbColumn: 'ncr_number', type: 'required', required: true },
    { header: 'Title', dbColumn: 'title', type: 'required', required: true },
    { header: 'Type', dbColumn: 'type', type: 'enum', enumValues: ['Product','Process','System','Supplier','OOS','OOT'], required: true },
    { header: 'Description', dbColumn: 'description', type: 'required', required: true },
    { header: 'Created Date', dbColumn: 'created_at', type: 'date', required: true },
  ],
  deviations: [
    { header: 'Deviation Number', dbColumn: 'dev_number', type: 'required', required: true },
    { header: 'Title', dbColumn: 'title', type: 'required', required: true },
    { header: 'Type', dbColumn: 'type', type: 'enum', enumValues: ['Planned','Unplanned'] },
    { header: 'Severity', dbColumn: 'severity', type: 'enum', enumValues: ['Critical','Major','Minor'] },
    { header: 'Category', dbColumn: 'category', type: 'enum', enumValues: ['Process','Equipment','Material','Environment','Personnel','Documentation'] },
    { header: 'Description', dbColumn: 'description', type: 'required', required: true },
    { header: 'Deviation Details', dbColumn: 'deviation_details', type: 'default' },
    { header: 'Assigned To', dbColumn: 'assigned_to', type: 'required', required: true },
    { header: 'Due Date', dbColumn: 'due_date', type: 'date', required: true },
  ],
  change_controls: [
    { header: 'CC Number', dbColumn: 'cc_number', type: 'required', required: true },
    { header: 'Title', dbColumn: 'title', type: 'required', required: true },
    { header: 'Type', dbColumn: 'type', type: 'enum', enumValues: ['Planned','Unplanned','Emergency'] },
    { header: 'Status', dbColumn: 'status', type: 'enum', enumValues: ['Requested','Under Review','Approved','In Implementation','Completed','Rejected'] },
    { header: 'Priority', dbColumn: 'priority', type: 'enum', enumValues: ['Critical','High','Medium','Low'] },
    { header: 'Category', dbColumn: 'category', type: 'enum', enumValues: ['Process','Equipment','Facility','Document','Material','Computer System','Organizational','Manufacturing','Regulatory','Supply Chain','Warehouse','Other'] },
    { header: 'Description', dbColumn: 'description', type: 'required', required: true },
    { header: 'Assigned To', dbColumn: 'assigned_to', type: 'required', required: true },
    { header: 'Due Date', dbColumn: 'due_date', type: 'date', required: true },
  ],
  audits: [
    { header: 'Audit Number', dbColumn: 'audit_number', type: 'required', required: true },
    { header: 'Title', dbColumn: 'title', type: 'required', required: true },
    { header: 'Type', dbColumn: 'type', type: 'enum', enumValues: ['Internal','External','Supplier'] },
    { header: 'Status', dbColumn: 'status', type: 'enum', enumValues: ['Planned','In Progress','Completed'] },
    { header: 'Description', dbColumn: 'description', type: 'required', required: true },
    { header: 'Assigned To', dbColumn: 'assigned_to', type: 'required', required: true },
    { header: 'Due Date', dbColumn: 'due_date', type: 'date', required: true },
  ],
  training: [
    { header: 'Title', dbColumn: 'title', type: 'required', required: true },
    { header: 'Type', dbColumn: 'type', type: 'enum', enumValues: ['Onboarding','SOP','Regulatory','Skill','Certification'] },
    { header: 'Assigned To', dbColumn: 'assigned_to', type: 'required', required: true },
    { header: 'Due Date', dbColumn: 'due_date', type: 'date', required: true },
  ],
  risks: [
    { header: 'Risk Number', dbColumn: 'risk_number', type: 'required', required: true },
    { header: 'Title', dbColumn: 'title', type: 'required', required: true },
    { header: 'Probability', dbColumn: 'probability', type: 'number', required: true },
    { header: 'Impact', dbColumn: 'impact', type: 'number', required: true },
    { header: 'Detectability', dbColumn: 'detectability', type: 'number', required: true },
    { header: 'Risk Level', dbColumn: 'risk_level', type: 'enum', enumValues: ['Low','Medium','High','Critical'] },
    { header: 'Description', dbColumn: 'description', type: 'required', required: true },
    { header: 'Category', dbColumn: 'category', type: 'enum', enumValues: ['Product','Process','System','Supplier'] },
    { header: 'Assigned To', dbColumn: 'assigned_to', type: 'required', required: true },
    { header: 'Due Date', dbColumn: 'due_date', type: 'date', required: true },
  ],
  suppliers: [
    { header: 'Supplier Code', dbColumn: 'supplier_code', type: 'required', required: true },
    { header: 'Name', dbColumn: 'name', type: 'required', required: true },
    { header: 'Category', dbColumn: 'category', type: 'enum', enumValues: ['Raw Material','Packaging','Equipment','Reagents','Services','Components','Other'] },
    { header: 'Status', dbColumn: 'status', type: 'enum', enumValues: ['Qualified','Conditional','Disqualified','Under Evaluation'] },
    { header: 'Contact', dbColumn: 'contact_person', type: 'default' },
    { header: 'Email', dbColumn: 'email', type: 'default' },
    { header: 'Phone', dbColumn: 'phone', type: 'default' },
    { header: 'Address', dbColumn: 'address', type: 'default' },
    { header: 'Country', dbColumn: 'country', type: 'default' },
    { header: 'Rating', dbColumn: 'rating', type: 'number' },
    { header: 'Qualification Method', dbColumn: 'qualification_method', type: 'enum', enumValues: ['Audit','Questionnaire','Certificate','Self-Assessment','Other'] },
    { header: 'Notes', dbColumn: 'notes', type: 'default' },
  ],
  batch_records: [
    { header: 'Batch Number', dbColumn: 'batch_number', type: 'required', required: true },
    { header: 'Product Name', dbColumn: 'product_name', type: 'required', required: true },
    { header: 'Product Code', dbColumn: 'product_code', type: 'default' },
    { header: 'Status', dbColumn: 'status', type: 'enum', enumValues: ['In Progress','Pending QA Review','Released','Rejected','Quarantine'] },
    { header: 'Batch Size', dbColumn: 'batch_size', type: 'number' },
    { header: 'Start Date', dbColumn: 'start_date', type: 'date' },
    { header: 'Assigned To', dbColumn: 'assigned_to', type: 'required', required: true },
    { header: 'Due Date', dbColumn: 'due_date', type: 'date', required: true },
  ],
}

// ---------------------------------------------------------------------------
// CSV Parsing (RFC 4180 compliant)
// ---------------------------------------------------------------------------

function splitCsvLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      fields.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  fields.push(current.trim())
  return fields
}

export function parseCsv(csvText: string): { headers: string[]; rows: Record<string, string>[] } {
  // Remove BOM
  if (csvText.charCodeAt(0) === 0xFEFF) csvText = csvText.slice(1)

  const lines: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i]
    if (char === '"') {
      if (inQuotes && csvText[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && csvText[i + 1] === '\n') i++
      lines.push(current)
      current = ''
    } else {
      current += char
    }
  }
  if (current.trim()) lines.push(current)

  if (lines.length < 2) return { headers: [], rows: [] }

  const headers = splitCsvLine(lines[0])

  const rows: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const values = splitCsvLine(line)
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => {
      row[h.trim().toLowerCase().replace(/\s+/g, '_')] = values[idx] || ''
    })
    rows.push(row)
  }

  return { headers, rows }
}

// ---------------------------------------------------------------------------
// Type coercion
// ---------------------------------------------------------------------------

function coerceValue(raw: string, field: ImportFieldDef): { value: unknown; error?: string } {
  const v = raw.trim()

  if (v === '' && !field.required) return { value: null }

  switch (field.type) {
    case 'number': {
      const n = Number(v)
      if (Number.isNaN(n)) return { value: v, error: `'${field.header}' = "${v}" n'est pas un nombre valide` }
      return { value: n }
    }
    case 'date': {
      const d = Date.parse(v)
      if (Number.isNaN(d)) return { value: v, error: `'${field.header}' = "${v}" n'est pas une date valide (YYYY-MM-DD attendu)` }
      return { value: new Date(d).toISOString() }
    }
    case 'boolean': {
      const lower = v.toLowerCase()
      if (['true', '1', 'yes', 'oui'].includes(lower)) return { value: true }
      if (['false', '0', 'no', 'non'].includes(lower)) return { value: false }
      return { value: v, error: `'${field.header}' = "${v}" n'est pas un booléen valide` }
    }
    case 'enum': {
      if (field.enumValues && field.enumValues.length > 0 && !field.enumValues.includes(v)) {
        return { value: v, error: `'${field.header}' = "${v}" — valeurs acceptées : ${field.enumValues.join(', ')}` }
      }
      return { value: v }
    }
    case 'required': {
      if (!v) return { value: v, error: `'${field.header}' est requis` }
      return { value: v }
    }
    default:
      return { value: v }
  }
}

// ---------------------------------------------------------------------------
// Auto RPN calculation for risks
// ---------------------------------------------------------------------------

function computeRpnIfMissing(record: Record<string, unknown>): Record<string, unknown> {
  if (record.probability != null && record.impact != null && record.detectability != null && !record.rpn) {
    record.rpn = Number(record.probability) * Number(record.impact) * Number(record.detectability)
  }
  return record
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getFieldMap(entityType: string): ImportFieldDef[] {
  return ENTITY_FIELD_MAPS[entityType] || []
}

export function validateImportData(entityType: string, rows: Record<string, string>[]): ImportResult {
  const fieldMap = ENTITY_FIELD_MAPS[entityType]
  if (!fieldMap || fieldMap.length === 0) {
    return { valid: rows, invalid: [] }
  }

  const valid: Record<string, unknown>[] = []
  const invalid: ImportError[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const record: Record<string, unknown> = {}
    const rowErrors: string[] = []

    for (const field of fieldMap) {
      const rawValue = row[field.header.toLowerCase().replace(/\s+/g, '_')] ?? ''
      const { value, error } = coerceValue(rawValue, field)

      if (error) rowErrors.push(error)
      if (value !== null) record[field.dbColumn] = value
    }

    if (rowErrors.length > 0) {
      invalid.push({ row: i + 2, errors: rowErrors }) // +2: header row + 1-indexed
    } else {
      // Special: auto-compute RPN for risks
      computeRpnIfMissing(record)
      valid.push(record)
    }
  }

  return { valid, invalid }
}

/**
 * Generate a CSV template string for a given entity type.
 * First line = headers, second line = example values.
 */
export function generateImportTemplate(entityType: string): string {
  const fieldMap = ENTITY_FIELD_MAPS[entityType]
  if (!fieldMap) return ''

  const headers = fieldMap.map(f => f.header).join(',')
  const example = fieldMap.map(f => {
    switch (f.type) {
      case 'number': return '1'
      case 'date': return '2025-01-15'
      case 'boolean': return 'true'
      case 'enum': return f.enumValues?.[0] || ''
      default: return f.required ? `Exemple ${f.header}` : ''
    }
  }).join(',')

  return `${headers}\n${example}\n`
}