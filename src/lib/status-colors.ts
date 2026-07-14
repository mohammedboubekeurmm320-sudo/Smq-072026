// ============================================================================
// Shared status colors — used by list, detail, and workflow components
// ============================================================================

export const STATUS_COLORS: Record<string, string> = {
  // Open / Active states
  Open: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
  Active: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400',

  // Investigation states
  Investigation: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
  'Under Investigation': 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',

  // In-progress states
  Implementation: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
  'In Progress': 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
  'In Implementation': 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400',

  // Pending states
  'Pending Disposition': 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
  'Pending QA Review': 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
  Requested: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  'Under Evaluation': 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  'Under Review': 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
  Planned: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  Conditional: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
  Mitigated: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
  Draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',

  // Effectiveness / Special
  'Effectiveness Check': 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400',

  // Positive terminal states
  Closed: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400',
  Completed: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400',
  Approved: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400',
  Effective: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400',
  Released: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400',
  Qualified: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400',
  Accepted: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400',

  // Negative terminal states
  Rejected: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
  Disqualified: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
  Quarantine: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',

  // Inactive states
  Archived: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
  Withdrawn: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
  Obsolete: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
  Overdue: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
}

/** Get status badge class, fallback to slate */
export function getStatusColor(status: string): string {
  return STATUS_COLORS[status] || 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
}

/** Check if a status represents a "positive" terminal state */
export function isPositiveStatus(status: string): boolean {
  return ['Closed', 'Completed', 'Approved', 'Effective', 'Released', 'Qualified', 'Accepted'].includes(status)
}

/** Check if a status represents a "negative" terminal state */
export function isNegativeStatus(status: string): boolean {
  return ['Rejected', 'Disqualified', 'Quarantine', 'Overdue'].includes(status)
}