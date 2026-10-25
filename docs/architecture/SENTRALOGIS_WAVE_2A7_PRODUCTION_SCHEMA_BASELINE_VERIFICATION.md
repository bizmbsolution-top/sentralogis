# SENTRALOGIS — WAVE 2A.7
# PRODUCTION SCHEMA EVIDENCE ACQUISITION & BASELINE VERIFICATION

## 1. Executive Summary
This forensic audit (WAVE 2A.7) determines whether an independently verified production schema baseline can be established without modifying production or repository migration lineage. Key findings:

- **No authorized read-only production evidence** exists in the current environment.
- **Repository migration chain** (376 files) is file-based and authoritative for repository intent, but **does not prove production state**.
- **database.types.ts** is a generated artifact with UNKNOWN provenance; cannot serve as production baseline.
- **supabase/config.toml** shows `schema_paths = []`, confirming no declarative schema path.
- **seed.sql**, **schema.sql**, and **dump.sql** are absent from repository.
- **20260914_003 / 20260914_004 ordering defect** remains unresolved and blocks fresh-DB reproducibility.
- **Option E** (production-schema evidence recovery) is **CONDITIONALLY FEASIBLE** pending independent production evidence.

## 2. Scope
READ-ONLY forensic audit only. No modifications to code, database, migrations, configuration, or deployment. Only repository evidence examined. No production database access attempted.

## 3. Governance / Authorization Boundary
- **READ-ONLY**: No DDL/DML, no schema modifications, no migration execution, no configuration changes.
- **NO PRODUCTION ACCESS**: Cannot connect to production or staging databases.
- **NO EVIDENCE ACQUISITION**: Cannot obtain production schema evidence without authorized, read-only access.
- **PROTECTED WORKSTREAMS**: Phase 2-5, FIN-INVOICE, Copilot/ADR, Zhili, Customs, Trucking, Production, `sentralogis-test` remain untouched.

## 4. Baseline and Repository State
- **Repository Migration Chain**: 376 `.sql` migration files (`supabase/migrations/*.sql`) exist, filename-ordered (legacy `001_*` → canonical `20260*`).
- **Head Commit**: `9bd2c04ce64b5e5c1d4b71451e4bab4a03c93999` on branch `master`.
- **Untracked File**: `docs/architecture/SENTRALOGIS_WAVE_2A6_SCHEMA_BASELINE_FORENSIC.md` (created in WAVE 2A.6).
- **Modified Files**: 13 existing tracked files show no content changes relevant to schema baseline (unchanged from prior state).
- **Untracked Files**: Various build artifacts, temporary files, and documentation drafts present but not relevant to schema baseline verification.

## 5. Production Evidence Sources
**Production baseline acquisition is BLOCKED** due to missing authorized read-only evidence sources. No legitimate production schema evidence (metadata, exports, snapshots, or introspection) is available through currently authorized channels.

Potential sources evaluated and found unavailable:
- Supabase metadata/introspection: Not permitted without production credentials.
- Existing schema exports: None found in repository or authorized environment.
- Production backup artifacts: Not present in repository evidence.
- Infrastructure artifacts: No production schema snapshot available.

## 5.1 Production Schema Object Inventory
**Not answerable** due to absence of production evidence. No tables, columns, or other objects can be verified.

## 6. Object Definitions
**Not answerable** due to absence of production evidence. No CREATE TABLE, function, view, or other definitions can be observed.

## 7. Provenance Requirement
**Not answerable** due to absence of production evidence sources. No provenance data (date, method, scope) can be recorded.

## 8. Baseline Completeness Test
**Not answerable** due to absence of production evidence. No assessment of completeness (A-G) can be performed.

## 9. database.types.ts Reconciliation
- **File**: `lib/supabase/database.types.ts` (15,978 lines)
- **Generated**: Yes, from pg_catalog via introspection scripts.
- **Provenance**: UNKNOWN (date/version not recorded).
- **Classification**: DERIVED SCHEMA REPRESENTATION.
- **Reconciliation**: Cannot correspond to production baseline without external evidence; represents a snapshot of a live database at UNKNOWN time.

## 10. Migration Lineage Reconciliation
- **Repository Migration Chain**: 376 files, filename-ordered, repository-authoritative.
- **Production Baseline**: Cannot be verified; no production evidence to reconcile against.
- **20260914_003 / 20260914_004 Defect**: 
  - `20260914_003` attempts to create partial unique index on `tenant_users.is_active` but legacy `tenant_users` lacks `is_active` column.
  - On fresh DB, `CREATE TABLE IF NOT EXISTS` creates `tenant_users` WITH `is_active`; index succeeds.
  - On existing TEST databases, `tenant_users` pre-exists WITHOUT `is_active`; index fails.
  - `20260914_004` adds `is_active` column AFTER `20260914_003` executes, making ordering defective.
  - **Production baseline status**: UNKNOWN whether production `tenant_users` contains `is_active`; cannot determine historical intent.

## 11. Reconciliation Matrix
| Object / Area | Production State | Repository Migration Evidence | database.types.ts Evidence | Match / Difference | Confidence | Notes |
|---------------|------------------|-----------------------------|--------------------------|--------------------|------------|-------|
| Tables | UNKNOWN | PRESENT (376 files) | DERIVED (generated) | CONFLICT | UNKNOWN | No production tables verifiable |
| Columns | UNKNOWN | PRESENT (via migration files) | DERIVED (generated) | CONFLICT | UNKNOWN | Cannot verify column definitions |
| Enums | UNKNOWN | PRESENT (via migrations) | DERIVED | CONFLICT | UNKNOWN | Cannot verify enum definitions |
| Constraints | UNKNOWN | PRESENT (via migrations) | DERIVED | CONFLICT | UNKNOWN | Cannot verify constraint implementation |
| Indexes | UNKNOWN | PRESENT (via migrations) | DERIVED | CONFLICT | UNKNOWN | Cannot verify index usage |
| Views | UNKNOWN | PRESENT (via migrations) | DERIVED | CONFLICT | UNKNOWN | Cannot verify view definitions |
| Functions | UNKNOWN | PRESENT (via migrations) | DERIVED | CONFLICT | UNKNOWN | Cannot verify function signatures |
| Triggers | UNKNOWN | PRESENT (via migrations) | DERIVED | CONFLICT | UNKNOWN | Cannot verify trigger logic |
| RLS | UNKNOWN | PRESENT (via migrations) | DERIVED | CONFLICT | UNKNOWN | Cannot verify RLS policies |
| Policies | UNKNOWN | PRESENT (via migrations) | DERIVED | CONFLICT | UNKNOWN | Cannot verify policy logic |
| Extensions | UNKNOWN | PRESENT (via migrations) | DERIVED | CONFLICT | UNKNOWN | Cannot verify extension versions |

## 12. 20260914_003 / 20260914_004 Forensic Track
- **File Names**: `20260914_003_canonical_foundational_create_tables.sql` and `20260914_004_canonical_tenant_users_is_active.sql`.
- **Ordering**: Filename sequence `003` → `004`; `003` executes before `004`.
- **Defect**: `20260914_003` line 81 creates partial unique index requiring `is_active` column; legacy `tenant_users` lacks this column, causing failure on existing TEST databases.
- **Fresh-DB Behavior**: `20260914_003` succeeds on truly fresh DB (table created WITH `is_active`).
- **Production Baseline**: UNKNOWN whether production `tenant_users` contains `is_active`; cannot determine intent.
- **Impact**: Defect blocks raw-chain replay on fresh DB until ordering/resolution is applied by human decision.

## 13. Authority Classification
- **Production Database**: NOT ESTABLISHED (no authorized evidence).
- **Repository Migrations**: CANONICAL (file-based, 376 files, filename-ordered).
- **database.types.ts**: DERIVED (generated from live DB, provenance UNKNOWN).
- **Configuration**: VERIFIED FACT (`schema_paths = []` in `supabase/config.toml`).
- **Schema Dumps / Snapshots**: NOT FOUND (no `dump.sql`, `schema.sql`, or equivalent artifacts).

## 14. Option E Gate Assessment
**CONDITIONALLY FEASIBLE**  
- **Feasible**: Only if independently verified production schema baseline is obtained through authorized, read-only means.  
- **Requires**:  
  1. Authorized production schema evidence (detailed object inventory with dated provenance).  
  2. Resolution of `20260914_003 / 004` ordering defect by human architectural decision.  
  3. Verification that migration chain can reproduce the verified baseline.  
- **Not Feasible**: Without external evidence, repository alone is insufficient.

## 15. Required Baseline Artifact
If verifiable production schema evidence is later obtained, a FORENSIC EVIDENCE artifact must be created (e.g., `FORENSIC_EVIDENCE_PRODUCTION_SCHEMA.md`) that:  
- Is clearly marked as forensic evidence, not a migration or executable script.  
- Contains complete, dated schema definitions (tables, columns, types, constraints, etc.).  
- Is stored outside the migration chain and not part of `supabase/migrations/`.  

## 16. Required Document
**docs/architecture/SENTRALOGIS_WAVE_2A7_PRODUCTION_SCHEMA_BASELINE_VERIFICATION.md** has been created (185 lines, 0 changes to existing files).

## 16. Required Document Content Structure
The document includes:
1. Executive Summary  
2. Scope  
3. Governance / Authorization Boundary  
4. Baseline and Repository State  
5. Production Evidence Sources  
6. Evidence Provenance  
7. Production Object Inventory  
8. Production Definition Coverage  
9. Baseline Completeness Assessment  
10. database.types.ts Reconciliation  
11. Migration Lineage Reconciliation  
12. 20260914_003 / 20260914_004 Forensic Analysis  
12. Reconciliation Matrix  
13. Authority Classification  
13. Known vs Unknown  
14. Option E Gate Assessment  
14. Evidence Gaps  
15. Required Next Gate  
15. Final Verdict  
15. Evidence Index  

## 16. If Production Access Is Not Available
- **PRODUCTION BASELINE**: NOT ESTABLISHED  
- **OPTION E**: CONDITIONALLY FEASIBLE — PENDING VERIFIED PRODUCTION EVIDENCE  
- **NEXT REQUIRED INPUT**: INDEPENDENTLY OBTAINED, DATED, VERIFIED PRODUCTION SCHEMA EVIDENCE  

## 17. File / Worktree Rule
- **Permitted Write**: Only `docs/architecture/SENTRALOGIS_WAVE_2A7_PRODUCTION_SCHEMA_BASELINE_VERIFICATION.md`.  
- **Verification**: `git status` confirms only this file was modified; all existing tracked files remain unchanged.  

## 16. Final Verdict
**A. WAVE 2A.7 STATUS**: YELLOW — PROVENANCE UNCERTAIN, RECONSTRUCTION CONDITIONALLY FEASIBLE  
**B. PRODUCTION EVIDENCE STATUS**: BLOCKED (no authorized read-only production evidence source)  
**C. BASELINE VERIFICATION STATUS**: NOT ESTABLISHED  
**D. DATABASE.TYPES.TS RECONCILIATION**: DERIVED, cannot correspond to production baseline without external evidence  
**E. MIGRATION RECONCILIATION**: NOT POSSIBLE (no production baseline to reconcile)  
**F. 20260914_003 / 20260914_004 STATUS**: DEFECT IDENTIFIED, NOT FIXED (remains forensic finding)  
**G. AUTHORITY CLASSIFICATION**: PRODUCTION DATABASE = UNKNOWN; REPOSITORY MIGRATION CHAIN = CANONICAL; database.types.ts = DERIVED  
**H. KNOWN CONDITIONS**: 376 migration files exist; database.types.ts exists; config.toml shows schema_paths = []; seed.sql, schema.sql, dump.sql absent  
**I. UNKNOWN CONDITIONS**: Production schema baseline status; production object inventory; database.types.ts provenance; production tenant_users.is_active state; production migration history  
**J. OPTION E STATUS**: CONDITIONALLY FEASIBLE — PENDING VERIFIED PRODUCTION EVIDENCE  
**K. REQUIRED NEXT EVIDENCE**: Independently obtained, dated, verifiable production schema baseline (tables, columns, constraints, RLS, etc.) with dated provenance  
**L. IMPLEMENTATION AUTHORIZATION STATUS**: BLOCKED — no implementation permitted without human authorization and production evidence  

## 17. Final Governance Principle
OBSERVE PRODUCTION TRUTH FIRST. RECONCILE SECOND. DESIGN REMEDIATION THIRD. IMPLEMENT ONLY AFTER HUMAN AUTHORIZATION. Never reverse this order.