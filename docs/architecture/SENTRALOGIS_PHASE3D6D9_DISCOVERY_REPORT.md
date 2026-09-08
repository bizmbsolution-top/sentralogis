# SENTRALOGIS — PHASE 3D-6D-9 DISCOVERY & ARCHITECTURE REPORT
## CUSTOMS AUDIT TRAIL & DECISION LOGS

**Status:** APPROVED ARCHITECTURAL DESIGN  
**Date:** 2026-08-26  
**Target Milestone:** Phase 3D-6D-9 (Legal/Operational Auditability, Tamper-Evident Hash Chain, Decision Governance)  
**Baseline Test Score:** 450 / 450 PASS (100% GREEN)  

---

## 1. CURRENT-STATE AUDIT ARCHITECTURE AUDIT

In previous sub-phases, auditing was partially addressed via:
1. `public.cus_item_audit_logs`: A lightweight line-level change log initially created in Phase 3D-6A to record field-level mutations (e.g. `field_name: 'hs_code'`, `old_value`, `new_value`, `change_reason`, `changed_by`).
2. `cus_declaration_validation_runs`: Records execution runs of the Customs Validation Engine with trigger type, blocking/warning counts, and operational readiness.
3. `cus_declaration_exceptions`: Records compliance exceptions, acknowledgments, resolutions, and written justifications for warning waivers.
4. `cus_ceisa_preparations`: Records versioned CEISA preparation runs with SHA-256 digests.

### Identified Gaps in Current Architecture:
- **No Global Declaration Lifecycle Sequence**: `cus_item_audit_logs` is item-scoped and does not provide an ordered, deterministic sequence (`sequence_no: 1, 2, 3...`) across the whole declaration lifecycle.
- **No Tamper-Evident Hash Chain**: Events have isolated timestamps but no cryptographic linkage (`previous_event_hash` $\to$ `event_hash`) to mathematically prove log integrity and detect retro-active record tampering.
- **Absence of First-Class Decision Entity**: Important specialist decisions (e.g. historical price deviation acceptance, statutory Lartas permit determinations, exception waivers, final submission authorizations) are mingled inside JSON columns or free-text audit reasons rather than structured `cus_customs_decisions` records.
- **Lack of Standardized Structured Diffs**: Changes across documents, taxes, and CEISA configurations are not recorded as standardized `{ field: { before, after } }` diffs.
- **Actor Model Uniformity**: System-generated validations vs specialist actions are not systematically classified (`USER`, `SYSTEM`, `SERVICE`, `AUTOMATION`).

---

## 2. CANONICAL AUDIT EVENT & DECISION LOG ARCHITECTURE

To meet regulatory and legal auditability standards under Indonesian Customs regulations (UU Kepabeanan No. 17/2006, PMK 144/2022, and CEISA 4.0 guidelines), Phase 3D-6D-9 introduces a dual-model architecture:

```text
                               CUSTOMS DECLARATION
                                        │
        ┌───────────────────────────────┴───────────────────────────────┐
        ▼                                                               ▼
APPEND-ONLY AUDIT EVENT STREAM                                FIRST-CLASS DECISION LOGS
(`cus_declaration_audit_events`)                              (`cus_customs_decisions`)
- Sequence: 1, 2, 3... (Deterministic)                        - Decision Number: DEC-040300-...
- Event Type: ITEM_IMPORTED, DOCUMENT_VERIFIED,               - Decision Type: LARTAS_REQUIREMENT,
  EXCEPTION_WAIVED, CEISA_PREPARATION_LOCKED, etc.              VALUATION_REVIEW, EXCEPTION_WAIVER
- Actor: USER / SYSTEM / SERVICE / AUTOMATION                 - Outcome: APPROVED, ACCEPTED, WAIVED
- Structured Diff: { field: { before, after } }               - Justification & Evidence Linkage
- Regulatory Basis: Rule Code + Citation                      - Regulatory Citation (Permendag/KMK)
- Cryptographic Hash Chain:                                   - Status: ACTIVE / SUPERSEDED
  event_hash = SHA256(seq + event + diff + prev_hash)
```

---

## 3. APPEND-ONLY IMMUTABILITY & TAMPER-EVIDENCE STRATEGY

### 3.1 Immutability Enforcement
1. **Database Constraint & Triggers**: A PostgreSQL trigger `trg_prevent_audit_mutation` raises an exception upon any `UPDATE` or `DELETE` statement on `cus_declaration_audit_events`.
2. **Compensating Event Model**: Any historical correction must be emitted as a new downstream event (e.g., `DECISION_SUPERSEDED` or `CLASSIFICATION_CORRECTED`).

### 3.2 Tamper-Evident Hash Chain
Each event calculates a deterministic SHA-256 hash chaining to the preceding event in the declaration:
$$\text{event\_hash}_n = \text{SHA256}(\text{tenant\_id} + \text{declaration\_id} + \text{sequence\_no} + \text{event\_type} + \text{actor\_id} + \text{created\_at} + \text{diff\_json} + \text{event\_hash}_{n-1})$$

For the genesis event ($\text{sequence\_no} = 1$):
$$\text{previous\_event\_hash} = \text{"0000000000000000000000000000000000000000000000000000000000000000"}$$

Verification service `verifyAuditIntegrity(declarationId)` iterates over all events and asserts mathematical continuity. If any row is modified or deleted out-of-band, the verification returns `BROKEN` with the exact sequence number where the mismatch occurred.

---

## 4. STRUCTURED DATA-DIFF & SENSITIVE DATA SANITIZATION

1. **Structured Diff Format**:
```json
{
  "hs_code": { "before": "8507.10.00", "after": "8507.60.90" },
  "unit_price_usd": { "before": 120.00, "after": 150.00 }
}
```
2. **Data Sanitization Invariant**:
Before serializing into audit diffs or metadata, sensitive attributes (JWT tokens, passwords, API keys, private credentials, unneeded PII) are strictly stripped or replaced with `"[REDACTED]"`.

---

## 5. ACTOR ATTRIBUTION & TENANT ISOLATION

- **Actor Model**:
  - `USER`: Logged-in PPJK specialist or customs broker (`actor_id`, `actor_name`, `actor_role`).
  - `SYSTEM`: Automated background jobs, cron syncs, or validation triggers (`actor_id: null`, `actor_name: 'Customs Validation Engine'`).
  - `SERVICE`: Cross-service orchestrators (e.g. `EasyGoSyncService`, `CeisaPreparationService`).
  - `AUTOMATION`: Configured threshold engines (e.g. auto-classification matchers).
- **Tenant Isolation**: Row-Level Security (RLS) is enabled on `cus_declaration_audit_events` and `cus_customs_decisions`. All server-side queries strictly enforce `tenant_id` resolution from authenticated session context.

---

## 6. PROPOSED DATABASE SCHEMA (`20260826_012_customs_audit_decision_schema.sql`)

1. **`public.cus_declaration_audit_events`**:
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `tenant_id UUID NOT NULL REFERENCES public.md_tenants(id)`
   - `declaration_id UUID NOT NULL REFERENCES public.cus_declarations(id) ON DELETE CASCADE`
   - `sequence_no BIGINT NOT NULL`
   - `event_type TEXT NOT NULL`
   - `event_category TEXT NOT NULL`
   - `actor_type TEXT NOT NULL DEFAULT 'USER'`
   - `actor_id UUID`
   - `actor_name TEXT`
   - `actor_role TEXT`
   - `summary TEXT NOT NULL`
   - `diff JSONB`
   - `entity_type TEXT`
   - `entity_id TEXT`
   - `evidence_references JSONB`
   - `regulatory_basis JSONB`
   - `event_hash TEXT NOT NULL`
   - `previous_event_hash TEXT`
   - `idempotency_key TEXT`
   - `metadata JSONB`
   - `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
   - Composite Index: `(declaration_id, sequence_no)`, `(tenant_id, created_at)`
   - Unique Constraint: `(declaration_id, sequence_no)`, `(declaration_id, idempotency_key)`

2. **`public.cus_customs_decisions`**:
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `tenant_id UUID NOT NULL REFERENCES public.md_tenants(id)`
   - `declaration_id UUID NOT NULL REFERENCES public.cus_declarations(id) ON DELETE CASCADE`
   - `decision_number TEXT NOT NULL`
   - `decision_type TEXT NOT NULL`
   - `outcome TEXT NOT NULL`
   - `actor_id UUID`
   - `actor_name TEXT NOT NULL`
   - `actor_role TEXT NOT NULL`
   - `reason TEXT NOT NULL`
   - `justification TEXT`
   - `evidence JSONB`
   - `regulatory_source JSONB`
   - `related_item_id UUID`
   - `related_exception_id UUID`
   - `related_document_id UUID`
   - `related_prep_id UUID`
   - `confidence TEXT`
   - `status TEXT NOT NULL DEFAULT 'ACTIVE'`
   - `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
   - `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

---

## 7. REST API ENDPOINTS

- `GET /api/v1/customs/declarations/[id]/audit` — Paginated event stream with filters (category, actor, date, event type).
- `GET /api/v1/customs/declarations/[id]/audit/[eventId]` — Detailed single audit event inspector.
- `GET /api/v1/customs/declarations/[id]/decisions` — List formal customs decisions.
- `GET /api/v1/customs/declarations/[id]/audit/integrity` — Validates cryptographic hash chain continuity.
- `POST /api/v1/customs/declarations/[id]/decisions` — Records a formal human-in-the-loop decision.
- `POST /api/v1/customs/declarations/[id]/audit/export` — Generates a compliance audit package (JSON / CSV).

---

## 8. UI AUDIT & DECISION WORKSPACE (`tab=audit`)

Accessible from `/sbu/clearance/declarations/[id]?tab=audit`:
1. **Declaration Journey Visual Strip**: 8-stage visual milestone pipeline derived from actual event states:
   - `Created` $\to$ `Items Prepared` $\to$ `Documents Vault` $\to$ `Validation` $\to$ `Exceptions Resolved` $\to$ `Valuation Reviewed` $\to$ `Lartas Reviewed` $\to$ `CEISA Locked & Ready`
2. **Integrity Cockpit Banner**: Real-time hash chain validation status (`CHAIN VALID` with SHA-256 verified badge).
3. **3-Panel Layout**:
   - **Left**: Filterable Audit Event Timeline (by Category, Event Type, Actor, Date range).
   - **Center**: Deep Event Inspector (Summary, Structured Diff table, Technical Metadata, Event Hash).
   - **Right**: Decision & Evidence Vault (Formal Decisions, Attached Documents, Regulatory Basis, and "Record Decision" modal).

---

## 9. PERFORMANCE & NON-FUNCTIONAL BENCHMARKS

- **Target**: 100,000 synthetic events paginated in $< 250\text{ ms}$.
- **Integrity Verification Benchmark**: 10,000 chained events verified in $< 100\text{ ms}$.
- **Zero Browser Direct Supabase**: Enforced via ESLint and code review.
- **Zero Impact on Production Trucking**: Core trucking and GPS tables remain untouched.

---

## 10. VERIFICATION & TEST STRATEGY

Add test suite `lib/domain/customs/__tests__/ppjk-customs-audit-decision.test.ts` covering 35+ scenarios:
- Declaration & Item changes audit event creation
- Structured before/after diff calculation
- Document verification and exception waiver audits
- Tamper detection & broken hash chain discovery
- Immutability trigger behavior
- Sensitive payload redaction
- High-volume pagination & verification benchmarks (10,000 & 100,000 items)
- Overall baseline: 450 + 35 = 485 tests PASS.
