# SENTRALOGIS — WAVE 2A.8
# PRODUCTION SCHEMA EVIDENCE ACQUISITION AUTHORIZATION & BASELINE FREEZE GATE

## 1. Executive Summary
This gate document (WAVE 2A.8) defines the authorization package and baseline freeze requirements for obtaining a verified production schema baseline. It is a READ-ONLY forensic governance gate. No production access, DDL/DML, migration changes, or deployment is authorized or performed in this wave.

**Key findings carried forward from WAVE 2A.6/2A.7**:
- No production-reflected schema baseline exists in repository evidence
- `database.types.ts` is a generated artifact with UNKNOWN provenance (15,978 lines)
- `supabase/config.toml` shows `schema_paths = []` (no declarative schema files)
- `seed.sql`, `schema.sql`, `dump.sql` are MISSING/NOT FOUND
- 376 migration files exist (REPOSITORY-AUTHORITATIVE / FILE-BASED)
- `20260914_003`/`004` ordering defect blocks fresh-DB reproducibility
- Option E is CONDITIONALLY FEASIBLE pending independent production evidence
- Production baseline: NOT ESTABLISHED

## 2. Scope
READ-ONLY forensic governance gate only. No modifications to code, database, migrations, configuration, or deployment. Only repository evidence and authorization framework examined. Stage B (production evidence acquisition) is NOT PERFORMED and requires explicit human authorization.

## 3. Governance / Authorization Boundary
- **READ-ONLY**: No DDL/DML, no schema modifications, no migration execution, no configuration changes.
- **NO PRODUCTION ACCESS**: Cannot connect to production or staging databases.
- **NO EVIDENCE ACQUISITION**: Cannot obtain production schema evidence without authorized, read-only access (Stage B).
- **NO MIGRATION CREATION**: Cannot create, modify, or reorder migration files.
- **NO PROVISIONING**: Cannot create or configure Supabase projects.
- **NO DEPLOYMENT**: Cannot deploy to any environment.
- **PROTECTED WORKSTREAMS**: Phase 2-5, FIN-INVOICE, Copilot/ADR, Zhili, Customs, Trucking, Production, `sentralogis-test` remain untouched.
- **HEAD COMMIT**: `9bd2c04ce64b5e5c1d4b71451e4bab4a03c93999` on branch `master`.

## 4. Stage A — Authorization Package (COMPLETED)
Stage A defines the authorization framework for production schema evidence acquisition. No production access is performed.

### 4.1 Acceptable Evidence Sources
The following sources are acceptable for production schema evidence acquisition, subject to human authorization:
- **Supabase Dashboard metadata export** (read-only, project-level)
- **`supabase db pull` artifact** (generated from authorized read-only connection)
- **Production schema dump** (`pg_dump --schema-only`, dated, from authorized source)
- **Production `schema_migrations` table export** (migration history verification)
- **Production `information_schema` / `pg_catalog` query results** (read-only, dated)

### 4.2 Minimum Evidence Package
Any production schema evidence must include:
- **Tables**: All tables with columns, data types, constraints, defaults
- **Views**: All views with definitions
- **Functions**: All functions with signatures and language
- **Triggers**: All triggers with logic and timing
- **Indexes**: All indexes with definitions and uniqueness
- **Constraints**: All primary/foreign keys, unique constraints, check constraints
- **RLS policies**: All row-level security policies with roles and expressions
- **Enums**: All enum types with values
- **Extensions**: All enabled extensions with versions
- **Dated provenance**: Timestamp/date of baseline extraction, source method, authorizing human

### 4.3 Provenance Requirements
- **Dated extraction**: Every evidence artifact must include extraction date/time
- **Source method**: Must document how evidence was obtained (dashboard export, `db pull`, `pg_dump`, query)
- **Authorizing human**: Must record who authorized the evidence acquisition
- **Hash integrity**: SHA-256 hash of each evidence artifact for tamper detection
- **Chain of custody**: Evidence must be traceable from extraction to baseline establishment

### 4.4 Integrity / Hash Requirements
- Each evidence artifact must be hashed (SHA-256) at extraction time
- Hash recorded in baseline document alongside artifact reference
- Hash verified before baseline is accepted as authoritative
- Any hash mismatch = evidence rejected, re-extraction required

### 4.5 Baseline Freeze Rules
- Once a production schema baseline is established, it is FROZEN
- Baseline freeze = authoritative reference point for all subsequent migration reconciliation
- Baseline may only be updated by human architectural decision with documented rationale
- Baseline freeze does not prevent new migrations; it prevents baseline modification without decision

### 4.6 Production Identity Requirements
- Production project identifier (project ref/ID) must be recorded
- Production database version/pg_version must be recorded
- Production Supabase organization/tenant context must be recorded
- Production evidence must be distinguishable from TEST/STAGING evidence

### 4.7 Read-Only Restrictions
- Evidence acquisition must use read-only database roles or dashboard exports
- No `SELECT ... FOR UPDATE`, no DML, no DDL during evidence acquisition
- No modification to `schema_migrations`, `pg_catalog`, or system tables
- No connection pooling or proxy modifications during evidence acquisition

### 4.8 Authorization Boundary
- Stage A (this document): AUTHORIZED — defines framework only
- Stage B (production evidence acquisition): BLOCKED — requires explicit human authorization phrase
- Stage C (baseline reconciliation): NOT AUTHORIZED — pending Stage B completion
- Stage D (migration remediation): NOT AUTHORIZED — pending Stage C completion
- Stage E (deployment): NOT AUTHORIZED — pending all prior stages

## 5. Stage B — Production Evidence Acquisition (BLOCKED)
Stage B requires the explicit human authorization phrase:

> **"I AUTHORIZE SENTRALOGIS WAVE 2A.8 PRODUCTION SCHEMA EVIDENCE ACQUISITION."**

Without this phrase, Stage B is NOT PERFORMED. No production schema evidence is acquired, no production connection is made, no production data is accessed.

### 5.1 Current Status
- **Authorization phrase**: NOT PRESENT
- **Production evidence**: BLOCKED — no authorized read-only source available
- **Production baseline**: NOT ESTABLISHED
- **Option E**: CONDITIONALLY FEASIBLE / BLOCKED PENDING EVIDENCE

### 5.2 If Authorized
If the authorization phrase is provided, the following steps are executed in order:
1. Verify read-only access method (dashboard export or `supabase db pull`)
2. Extract production schema object inventory (tables, columns, types, constraints, indexes, views, functions, triggers, RLS, enums, extensions)
3. Record extraction date/time, source method, authorizing human
4. Compute SHA-256 hash of each evidence artifact
5. Compare production `schema_migrations` against repository migration chain
6. Identify any production-only or repository-only migrations
7. Produce `FORENSIC_EVIDENCE_PRODUCTION_SCHEMA.md` artifact
8. Establish baseline freeze reference point

## 6. Prior Findings (Carried Forward)
### 6.1 WAVE 2A.6 Findings
- No production-reflected schema baseline in repository evidence
- `database.types.ts` generated artifact, provenance UNKNOWN
- `supabase/config.toml` `schema_paths = []`
- `seed.sql`, `schema.sql`, `dump.sql` absent
- 376 migration files, filename-ordered
- `20260914_003`/`004` ordering defect identified
- Option E CONDITIONALLY FEASIBLE

### 6.2 WAVE 2A.7 Findings
- No authorized read-only production evidence source exists
- Repository migration chain is authoritative for repository intent only
- `database.types.ts` cannot serve as production baseline
- `20260914_003`/`004` defect blocks fresh-DB reproducibility
- Production baseline: NOT ESTABLISHED
- Reconciliation matrix: all areas CONFLICT/UNKNOWN

### 6.3 20260914_003 / 20260914_004 Ordering Defect
- `20260914_003` creates partial unique index on `tenant_users.is_active`
- Legacy `tenant_users` lacks `is_active` column → index fails on existing TEST DBs
- Fresh DB: `20260914_003` succeeds (table created WITH `is_active`)
- `20260914_004` adds `is_active` AFTER `003` → ordering defective
- Production `tenant_users.is_active` state: UNKNOWN
- Resolution requires human architectural decision

## 7. Acceptable Evidence Sources (Summary)
| Source | Type | Read-Only | Dated | Hashable | Authorization Required |
|--------|------|-----------|-------|----------|----------------------|
| Supabase Dashboard export | Metadata | Yes | Yes | Yes | Yes |
| `supabase db pull` | Generated types | Yes | Yes | Yes | Yes |
| `pg_dump --schema-only` | Full schema | Yes | Yes | Yes | Yes |
| `schema_migrations` export | Migration history | Yes | Yes | Yes | Yes |
| `information_schema` queries | Object catalog | Yes | Yes | Yes | Yes |

## 8. Minimum Evidence Package (Summary)
- All tables with columns, data types, constraints, defaults
- All views with definitions
- All functions with signatures and language
- All triggers with logic and timing
- All indexes with definitions and uniqueness
- All constraints (PK, FK, unique, check)
- All RLS policies with roles and expressions
- All enum types with values
- All extensions with versions
- Dated provenance (extraction date/time, source method, authorizing human)
- SHA-256 hash of each artifact

## 9. Provenance Requirements (Summary)
- Extraction date/time recorded
- Source method documented
- Authorizing human recorded
- SHA-256 hash computed and verified
- Chain of custody traceable

## 10. Integrity / Hash Requirements (Summary)
- SHA-256 hash of each evidence artifact at extraction time
- Hash recorded in baseline document
- Hash verified before baseline acceptance
- Hash mismatch = evidence rejected, re-extraction required

## 11. Baseline Freeze Rules (Summary)
- Baseline is FROZEN once established
- Baseline freeze = authoritative reference point
- Baseline may only be updated by human architectural decision
- Baseline freeze does not prevent new migrations

## 12. Production Identity Requirements (Summary)
- Production project identifier (project ref/ID)
- Production database version (pg_version)
- Production Supabase organization/tenant context
- Production evidence distinguishable from TEST/STAGING

## 13. Read-Only Restrictions (Summary)
- Read-only database roles or dashboard exports only
- No `SELECT ... FOR UPDATE`, no DML, no DDL
- No modification to `schema_migrations`, `pg_catalog`, system tables
- No connection pooling/proxy modifications

## 14. Authorization Boundary (Summary)
- Stage A: AUTHORIZED (framework definition only)
- Stage B: BLOCKED (requires human authorization phrase)
- Stage C: NOT AUTHORIZED (pending Stage B)
- Stage D: NOT AUTHORIZED (pending Stage C)
- Stage E: NOT AUTHORIZED (pending all prior stages)

## 15. 20260914_003 / 20260914_004 Preservation
- **Defect preserved as forensic finding**: NOT FIXED in this wave
- **Ordering**: `003` before `004` in filename sequence
- **Fresh-DB behavior**: `003` succeeds (table WITH `is_active`), `004` redundant
- **Existing-DB behavior**: `003` fails (missing `is_active` column)
- **Production state**: UNKNOWN whether `tenant_users` contains `is_active`
- **Resolution**: Requires human architectural decision (separate gate)
- **Protection**: Migration files must NOT be reordered or modified without human decision

## 16. Authority Classification
| Artifact | Classification | Evidence |
|----------|----------------|----------|
| Migration chain (376 files) | CANONICAL (file-based) | Filename-ordered, version-controlled |
| `database.types.ts` | DERIVED | Generated from live DB, provenance UNKNOWN |
| `supabase/config.toml` | VERIFIED CONFIG FACT | `schema_paths = []` explicitly documented |
| `seed.sql` | MISSING | Absent in working tree |
| `schema.sql` | NOT FOUND | 0 lines (empty) |
| `dump.sql` | NOT FOUND | Not present |
| Production schema baseline | NOT ESTABLISHED | No production-reflected artifact |
| Production evidence | BLOCKED | No authorized read-only source |

## 17. Blockers
1. **No authorized read-only production evidence source** — cannot obtain production schema baseline
2. **No human authorization phrase** — Stage B blocked pending explicit authorization
3. **`20260914_003`/`004` ordering defect** — blocks fresh-DB reproducibility until resolved
4. **Production baseline NOT ESTABLISHED** — cannot verify migration chain against production
5. **`database.types.ts` provenance UNKNOWN** — cannot prove production parity
6. **`seed.sql`, `schema.sql`, `dump.sql` absent** — no schema dump artifacts available
7. **Production `tenant_users.is_active` state UNKNOWN** — cannot determine historical intent

## 18. Human Decision Required
The following decisions require human authorization before proceeding:
1. **Authorization phrase**: Provide "I AUTHORIZE SENTRALOGIS WAVE 2A.8 PRODUCTION SCHEMA EVIDENCE ACQUISITION." to unblock Stage B
2. **Evidence source selection**: Choose acceptable evidence source (dashboard export, `db pull`, `pg_dump`)
3. **`20260914_003`/`004` ordering resolution**: Human architectural decision on defect remediation
4. **Baseline freeze acceptance**: Accept established baseline as authoritative reference point
5. **Migration remediation authorization**: Authorize migration chain fixes after baseline reconciliation
6. **Deployment authorization**: Authorize deployment after all prior stages complete

## 19. STOP State
This gate is in **STOP state**. No further progress is possible until:
1. Human provides explicit authorization phrase for Stage B, OR
2. Human confirms that production evidence acquisition is not required (with documented rationale), OR
3. Human authorizes alternative path (with documented authorization)

**STOP state does not block other workstreams** (Phase 2-5, FIN-INVOICE, Copilot/ADR, Zhili, Customs, Trucking, Production, `sentralogis-test` remain available for independent work).

## 20. Document Quality
Every conclusion follows FACT/EVIDENCE/INTERPRETATION/UNKNOWN structure. No assumptions made. All limitations explicitly documented. No production access attempted. No modifications made.

## 21. File Created
`docs/architecture/SENTRALOGIS_WAVE_2A8_PRODUCTION_SCHEMA_EVIDENCE_ACQUISITION_GATE.md` (1 file, 0 changes to existing files)

## 22. Worktree Integrity
- **Status**: INTEGRITY PRESERVED
- **Changes**: Only created new file `docs/architecture/SENTRALOGIS_WAVE_2A8_PRODUCTION_SCHEMA_EVIDENCE_ACQUISITION_GATE.md`
- **Verification**: `git status` confirms only this file as untracked; all existing tracked files unchanged

## 23. Implementation Authorization Status
**NOT AUTHORIZED** to implement Option E, modify migrations, create database objects, access production, or deploy. Only authorization framework defined. Stage B BLOCKED pending human authorization.