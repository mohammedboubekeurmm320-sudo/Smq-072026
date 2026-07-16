#!/usr/bin/env python3
"""
Build full_migration_unified.sql by concatenating all migration files
in the correct order, with 004 functions/views replaced by 005 fixed versions.

Output: supabase/migrations/full_migration_unified.sql
"""

import re
import os

BASE = '/home/z/my-project/smq-072026/supabase/migrations'

# Read all migration files in order
files_in_order = [
    '000_prisma_base_tables.sql',
    '002_rls_and_helpers.sql',
    '003_audit_triggers.sql',
    '004_missing_rpcs_views_triggers.sql',
    '005_fix_004_bugs.sql',
]

sections = []
for fname in files_in_order:
    fpath = os.path.join(BASE, fname)
    if not os.path.exists(fpath):
        print(f'WARNING: {fname} not found, skipping')
        continue
    with open(fpath, 'r') as f:
        content = f.read()
    sections.append((fname, content))

# Build unified file
parts = []

# Header
header = """-- ============================================================================
-- QMS ISO 13485 Pro — FULL UNIFIED MIGRATION
-- ============================================================================
-- Single-file deployment for fresh Supabase instances.
-- Concatenates: 000 (tables) + 002 (RLS) + 003 (audit) + 004 (RPCs/views) + 005 (bug fixes)
--
-- INSTRUCTIONS: Paste into Supabase SQL Editor and click "Run"
--
-- CONTENTS:
--   1. Extensions PostgreSQL (pgcrypto)
--   2. 28 tables (27 Prisma models + audit_config)
--   3. Index, unique constraints, foreign keys
--   4. RLS policies multi-tenant (Row Level Security)
--   5. Helper functions (is_org_member, is_org_admin, current_profile_id, etc.)
--   6. Audit trail triggers (HMAC-SHA256 blockchain, 21 CFR Part 11)
--   7. RPC: set_user_context, validate_status_transition, get_upcoming_deadlines
--   8. RPC: get_org_compliance_score (industry-weighted)
--   9. Views: v_current_user, v_org_dashboard, document_hierarchy,
--            document_trigger_graph, record_type_usage
--  10. Triggers: maker-checker (9 QMS tables), form instance validation
--
-- Generated: 2026-07-16
-- ============================================================================

BEGIN;

"""

parts.append(header)

# Add each section with a separator
for fname, content in sections:
    # Remove BEGIN/COMMIT from individual files
    content = re.sub(r'^\s*BEGIN;\s*$', '', content, flags=re.MULTILINE)
    content = re.sub(r'^\s*COMMIT;\s*$', '', content, flags=re.MULTILINE)

    # Add section header
    separator = f"-- ============================================================================\n-- SECTION: {fname}\n-- ============================================================================\n\n"
    parts.append(separator)
    parts.append(content.strip())
    parts.append('\n\n')

# Footer
footer = """
-- ============================================================================
-- END OF UNIFIED MIGRATION
-- ============================================================================

COMMIT;
"""

parts.append(footer)

# Write output
output_path = os.path.join(BASE, 'full_migration_unified.sql')
with open(output_path, 'w') as f:
    f.write(''.join(parts))

# Count lines
with open(output_path, 'r') as f:
    lines = len(f.readlines())

print(f'Created {output_path} ({lines} lines)')
print(f'Sections: {len(sections)}')