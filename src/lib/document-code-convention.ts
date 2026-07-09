// Document code convention — 10 prefixes with regex validation
// Replicated from smq-iso-13485-pro

import type { DocumentType, DocumentLevel } from '@/types/qms';

export interface CodePrefix {
  prefix: string;
  labelFr: string;
  labelEn: string;
  docTypes: DocumentType[];
  levels: DocumentLevel[];
  format: 'numeric' | 'mixed';
  example: string;
  pattern: RegExp;
}

export const CODE_PREFIXES: CodePrefix[] = [
  { prefix: 'MQ', labelFr: 'Manuel Qualité', labelEn: 'Quality Manual', docTypes: ['MANUEL'], levels: [1], format: 'numeric', example: 'MQ-001', pattern: /^MQ-\d{3}$/ },
  { prefix: 'REG', labelFr: 'Réglementaire / Registre', labelEn: 'Regulatory / Register', docTypes: ['REGLEMENTAIRE', 'MAPPING', 'REGISTRE'], levels: [1, 4], format: 'mixed', example: 'REG-001', pattern: /^REG(-[A-Z]+-\d{3}|-REF-\d{3}|\d{3})$/ },
  { prefix: 'RD', labelFr: 'Revue de Direction', labelEn: 'Management Review', docTypes: ['PROCEDURE', 'ENREGISTREMENT'], levels: [1, 4], format: 'numeric', example: 'RD-001', pattern: /^RD-\d{3}$/ },
  { prefix: 'PR', labelFr: 'Procédure', labelEn: 'Procedure', docTypes: ['PROCEDURE'], levels: [2, 3], format: 'mixed', example: 'PR-4.2.4', pattern: /^PR(-\d+\.\d+\.\d+|-[A-Z]+-\d{3}|-[A-Z]+-[A-Z]+-\d{3})$/ },
  { prefix: 'WI', labelFr: 'Instruction / Mode Opératoire', labelEn: 'Work Instruction', docTypes: ['INSTRUCTION', 'WI'], levels: [4], format: 'mixed', example: 'WI-LAB-PCQ-001', pattern: /^WI(-[A-Z]+-\d{3}|-[A-Z]+-[A-Z]+-\d{3})$/ },
  { prefix: 'FORM', labelFr: 'Formulaire', labelEn: 'Form', docTypes: ['FORMULAIRE', 'Form'], levels: [4], format: 'mixed', example: 'FORM-DOC-001', pattern: /^FORM(-[A-Z]+-\d{3}|-[A-Z]+-[A-Z]+-\d{3})$/ },
  { prefix: 'DL', labelFr: 'Dossier Lot', labelEn: 'Batch Dossier', docTypes: ['MASTER_BATCH', 'PROCEDURE'], levels: [2, 3], format: 'mixed', example: 'DL-001', pattern: /^DL(-\d{3}|-[A-Z]+-\d{3})$/ },
  { prefix: 'OOS', labelFr: 'Hors Spécification', labelEn: 'Out of Specification', docTypes: ['PROCEDURE', 'FORMULAIRE'], levels: [2, 3, 4], format: 'mixed', example: 'PR-OOS-001', pattern: /^(PR-OOS|FORM-OOS)-[A-Z]*-?\d{3}$/ },
  { prefix: 'CC', labelFr: 'Change Control', labelEn: 'Change Control', docTypes: ['PROCEDURE'], levels: [2, 3], format: 'mixed', example: 'PR-CC-EQP-001', pattern: /^PR-CC(-[A-Z]+-\d{3})$/ },
  { prefix: 'DEV', labelFr: 'Déviation', labelEn: 'Deviation', docTypes: ['PROCEDURE', 'FORMULAIRE'], levels: [2, 3, 4], format: 'mixed', example: 'PR-DEV-001', pattern: /^(PR-DEV|FORM-DEV)-[A-Z]*-?\d{3}$/ },
];

export function validateDocumentCode(code: string): { valid: boolean; prefix?: CodePrefix; error?: string } {
  if (!code) return { valid: false, error: 'Code requis' };
  const upper = code.toUpperCase();
  // Detect prefix
  for (const p of CODE_PREFIXES) {
    if (upper.startsWith(p.prefix) || (p.prefix === 'OOS' && (upper.startsWith('PR-OOS') || upper.startsWith('FORM-OOS'))) || (p.prefix === 'CC' && upper.startsWith('PR-CC')) || (p.prefix === 'DEV' && (upper.startsWith('PR-DEV') || upper.startsWith('FORM-DEV')))) {
      if (p.pattern.test(upper)) return { valid: true, prefix: p };
      return { valid: false, prefix: p, error: `Format invalide. Exemple attendu : ${p.example}` };
    }
  }
  return { valid: false, error: 'Préfixe inconnu. Préfixes supportés : ' + CODE_PREFIXES.map(p => p.prefix).join(', ') };
}

export function getCodePrefix(code: string): CodePrefix | undefined {
  return CODE_PREFIXES.find(p => p.pattern.test(code.toUpperCase()));
}

export function generateNextCode(prefix: CodePrefix, departmentSuffix?: string, existingCodes: string[] = []): string {
  const suffix = departmentSuffix ? `-${departmentSuffix.toUpperCase()}` : '';
  const matchingPattern = prefix.format === 'numeric' && !suffix
    ? new RegExp(`^${prefix.prefix}-(\\d{3})$`)
    : new RegExp(`^${prefix.prefix}${suffix}-(\\d{3})$`);

  let maxSeq = 0;
  for (const c of existingCodes) {
    const m = c.toUpperCase().match(matchingPattern);
    if (m) maxSeq = Math.max(maxSeq, parseInt(m[1], 10));
  }
  const next = (maxSeq + 1).toString().padStart(3, '0');
  return suffix ? `${prefix.prefix}${suffix}-${next}` : `${prefix.prefix}-${next}`;
}

export function getRecommendedPrefixForType(type: DocumentType): CodePrefix | undefined {
  return CODE_PREFIXES.find(p => p.docTypes.includes(type));
}

// Document triggers — 5 types
export const TRIGGER_TYPES: { value: string; label: string; description: string }[] = [
  { value: 'prerequisite', label: 'Prérequis', description: 'Le document source doit exister/approuvé avant création du target' },
  { value: 'references', label: 'Référence', description: 'Le target référence le source (informationnel)' },
  { value: 'activates', label: 'Active', description: 'Le source active le target quand une condition se produit' },
  { value: 'output', label: 'Output', description: 'Le target est un output/record du source' },
  { value: 'escalation', label: 'Escalade', description: 'Le target escalade depuis le source (ex. NCR → CAPA)' },
];

// Cycle detection (DFS) for trigger chains
export function validateTriggerChain(triggers: { sourceDocumentId: string; targetDocumentId: string }[]): { valid: boolean; cycle?: string[] } {
  const graph: Record<string, string[]> = {};
  for (const t of triggers) {
    if (!graph[t.sourceDocumentId]) graph[t.sourceDocumentId] = [];
    graph[t.sourceDocumentId].push(t.targetDocumentId);
  }
  const visited: Record<string, 'white' | 'gray' | 'black'> = {};
  const path: string[] = [];

  function dfs(node: string): boolean {
    if (visited[node] === 'gray') {
      const cycleStart = path.indexOf(node);
      return false; // cycle detected
    }
    if (visited[node] === 'black') return true;
    visited[node] = 'gray';
    path.push(node);
    for (const next of graph[node] || []) {
      if (!dfs(next)) return false;
    }
    visited[node] = 'black';
    path.pop();
    return true;
  }

  for (const node of Object.keys(graph)) {
    if (!dfs(node)) return { valid: false, cycle: [...path] };
  }
  return { valid: true };
}
