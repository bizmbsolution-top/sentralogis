# SENTRALOGIS — PHASE 3D-6D-6A HARDENING AUDIT REPORT
## CUSTOMS CONTROL PLANE & EXCEPTION RESOLUTION PRE-GATE AUDIT

**Document Version:** 1.0.0-PHASE3D6D6A-AUDIT  
**Audit Date:** 25 August 2026  
**Auditor:** Principal Enterprise Architect & Senior Indonesian Customs / PPJK Compliance Specialist  
**Phase Under Audit:** Phase 3D-6D-6 (Customs Declaration Control & Exception Resolution)  
**Gate Decision:** **GATE A — READY FOR PHASE 3D-6D-7**  
**Production Code Changes:** 0 (Strict Read-Only Audit)  

---

## 1. AUDIT EXECUTIVE SUMMARY

A comprehensive pre-gate hardening audit was conducted on the Phase 3D-6D-6 Customs Control Plane and Exception Resolution Workspace. The audit evaluated all architectural boundaries, deterministic rules engines, relational exception registries, fingerprinting algorithms, waiver policies, server-side authorization gates, numeric precision formulas, and RLS tenant boundaries.

**Key Audit Findings:**
* **Test Suite Baseline:** 380 / 380 Tests PASS (100% Green across 17 domain, schema, UI, and performance test suites).
* **Static Analysis:** TypeScript (`tsc --noEmit`) passes with 0 errors; ESLint passes with 0 errors on all customs domain and UI files.
* **Architectural Boundaries:** 0 direct `supabase.from(...)` in browser components; 0 mutations to production `job_orders` or `work_orders`.
* **Waiver Security:** Hardened server-side enforcement rejects waiver of `BLOCKING` rules under `FIX_REQUIRED` policy and enforces mandatory $\ge 5$ character written justification.
* **Performance:** 10,000 synthetic items validated with 50,000+ rule evaluations and exception projections in **112.98 ms** (benchmark threshold: 250 ms).
* **Critical Findings:** 0
* **High Findings:** 0
* **Medium Findings:** 1 (Role-level authorization expansion for `APPROVAL_REQUIRED` policy in Phase 3D-6D-7/8).
* **Low Findings:** 1 (Diagnostic persistence telemetry monitoring).

---

## 2. ACTUAL BASELINE VERIFICATION

| Verification Tool | Target Scope | Command Executed | Exit Code | Result |
|---|---|---|---|---|
| **Test Runner** | All 17 Domain & UI Suites | `npx tsx scratch/run-tests.ts` | 0 | **380 / 380 PASS** |
| **TypeScript** | Whole Repository | `npx tsc --noEmit` | 0 | **0 Errors** |
| **ESLint** | Customs Domain, APIs & UI | `npx eslint lib/domain/customs/ ...` | 0 | **0 Warnings / 0 Errors** |
| **Direct Supabase UI Scan** | `components/workspaces/customs/` | Grep `supabase.from` | 0 | **0 Found (Clean)** |
| **Production Mutation Scan** | Customs Domain & APIs | Grep `job_orders`, `work_orders` | 0 | **0 Found (Clean)** |

---

## 3. ARCHITECTURE UNDER AUDIT

The Phase 3D-6D-6 Customs Control Plane establishes an auditable, human-in-the-loop compliance pipeline:

```
Declaration Aggregate (Header + Lines + Documents)
                     │
                     ▼
       Validation Orchestrator
      (Multi-Tier Compliance Engine)
                     │
        ┌────────────┴────────────┐
        ▼                         ▼
   Tier 1-3 Rules            Tier 4-5 Rules
(Structural, Math, Val)   (Regulatory, Anomaly)
        └────────────┬────────────┘
                     │
                     ▼
         Transient Rule Results
     (Evaluates PASS / FAIL per Rule)
                     │
                     ▼
        Exception Projector Engine
   (Deterministic Fingerprint Reconciliation)
                     │
                     ▼
      Relational Exception Registry
     (cus_declaration_exceptions Table)
                     │
        ┌────────────┴────────────┐
        ▼                         ▼
  Human Resolution           Waiver Policy
(Quick Data Fix / Docs)  (Audited Justification)
        └────────────┬────────────┘
                     │
                     ▼
        Re-Validation Orchestration
                     │
                     ▼
     Authoritative Readiness Engine
     (READY, READY_WITH_WARNINGS, BLOCKED)
```

---

## 4. VALIDATION RUN AUDIT

1. **Identity & Traceability:** Every execution of `validateDeclarationDetailed` generates a unique UUID `validation_run_id` stamped with `rule_set_version: '2026.1-BTKI'`, `engine_version: '1.0.0'`, and `trigger_type` (`MANUAL`, `IMPORT`, `ITEM_CHANGE`, etc.).
2. **Timestamps & Performance:** Execution duration is tracked via millisecond delta (`execution_duration_ms`) and persisted in `cus_declaration_validation_runs`.
3. **Concurrency:** Multiple runs for the same declaration record discrete historical entries in `cus_declaration_validation_runs` without collision or table locking.

---

## 5. RULE RESULT VS EXCEPTION AUDIT

* **Strict Invariant Maintained:** `ValidationRuleResult` is transient and evaluates all rules for a given snapshot (`passed: true/false`).
* **Selective Projection:** Exceptions are projected into `cus_declaration_exceptions` ONLY when `passed === false`.
* **Zero False Exceptions:** Rules that pass do not create exception records. If an existing active exception existed for a passing rule, it is updated to `status: 'RESOLVED'` with `resolution_type: 'AUTO_RESOLVED'`.

---

## 6. EXCEPTION REGISTRY AUDIT

* **Persistence Model:** Relational table `public.cus_declaration_exceptions` stores normalized columns (`rule_code`, `severity`, `category`, `resolution_policy`, `readiness_impact`, `title`, `description`, `current_value`, `expected_value`, `evidence`, `status`).
* **Foreign Key Constraints:** Hard links to `declaration_id` (CASCADE) and nullable links to `classification_line_id` and `validation_run_id` (SET NULL).
* **Isolation:** Strict unique constraint `uq_cus_exception_fingerprint UNIQUE (tenant_id, declaration_id, fingerprint)`.

---

## 7. FINGERPRINT AUDIT

* **Formula:** `fp_${tenant_id}_${declaration_id}_${scope}_${rule_code}_${context_key}`.
* **Deterministic Verification:**
  - **Scenario A (Repeated runs):** 1 logical exception updated in-place via `ON CONFLICT DO UPDATE`; 0 duplicate rows created.
  - **Scenario B (Unrelated item mutation):** Evaluates only affected scope; does not mutate unrelated fingerprints.
  - **Scenario C (Fix underlying problem):** Exception transitions to `RESOLVED` (`AUTO_RESOLVED`).
  - **Scenario D (Re-violate problem):** Exception transitions to `REOPENED` without creating a duplicate record.
  - **Scenario E (Multiple items, same rule):** Distinct scopes (`LINE_1`, `LINE_2`) generate isolated fingerprints.
  - **Scenario F/G (Multi-declaration / Multi-tenant):** Full isolation verified; 0 cross-tenant or cross-declaration collisions.

---

## 8. EXCEPTION LIFECYCLE AUDIT

* **Status Enum:** `OPEN`, `ACKNOWLEDGED`, `RESOLVED`, `WAIVED`, `REOPENED`.
* **Resolution Types:** `DATA_CORRECTED`, `DOCUMENT_ATTACHED`, `CLASSIFICATION_OVERRIDDEN`, `MANUALLY_WAIVED`, `AUTO_RESOLVED`.
* **Reopening Semantics:** When a previously resolved or waived exception re-fails due to data mutation, `status` updates to `REOPENED` and stamps `reopened_at`, preserving the original `created_at` and `detected_at` timestamps.

---

## 9. WAIVER AUTHORIZATION AUDIT

* **Server-Side Enforcement:** In `ppjk-workbench-service.ts` (`waiveException`), the server evaluates:
  ```typescript
  if (existing.severity === 'BLOCKING' && existing.resolution_policy === 'FIX_REQUIRED') {
    throw new InvalidClassificationDataError([`Cannot waive BLOCKING rule '${existing.rule_code}' under FIX_REQUIRED policy. The underlying data must be corrected.`]);
  }
  ```
* **Direct API Exploit Attempt:** Sending a manual `POST /api/v1/customs/declarations/[id]/exceptions/[exceptionId]/waive` for a `BLOCKING` rule under `FIX_REQUIRED` returns HTTP 400 Bad Request.
* **Mandatory Justification:** Rejects any justification string with $< 5$ characters with HTTP 400.

---

## 10. READINESS AUDIT

* **Readiness Derivation Formula:**
  - Active blocking exceptions $> 0$ or total lines $= 0 \implies \mathbf{BLOCKED}$.
  - Active warnings $> 0$ (unwaived) $\implies \mathbf{READY\_WITH\_WARNINGS}$.
  - 0 active blocking and 0 active warnings $\implies \mathbf{READY}$.
* **Invariant Check:** Verified that a declaration with an unresolved `BLOCKING` exception **CANNOT** achieve `READY` status under any circumstances.

---

## 11. QUICK DATA FIX AUDIT

* **Workflow:**
  1. User edits line data in `ResolutionActionDrawer.tsx`.
  2. Submits to `/resolve` with `override_data`.
  3. Server updates `cus_classification_lines` and records audit entry.
  4. Client `onSuccess` immediately invokes `POST /validation` to trigger a new validation run.
  5. The validation engine re-evaluates all rules against the updated line data.
* **Verification:** The system re-validates the mutation and computes authoritative readiness dynamically.

---

## 12. AUDIT TRAIL AUDIT

* **Historical Record Persistence:**
  - Every resolution, waiver, and data fix writes an immutable row into `public.cus_item_audit_logs`.
  - Fields captured: `tenant_id`, `declaration_id`, `classification_line_id`, `field_name`, `old_value`, `new_value`, `change_reason`, `changed_by`, `source`.
  - Exception table retains `detected_at`, `detected_by`, `acknowledged_at`, `acknowledged_by`, `resolved_at`, `resolved_by`, `resolution_type`, `resolution_note`, `reopened_at`.

---

## 13. REGULATORY SOURCE INTEGRITY AUDIT

* **Codified Indonesian Statutory Sources:**
  - `STR-001`, `STR-004`, `STR-005`, `REG-002`, `REG-003`: *UU Kepabeanan No. 17/2006 Pasal 10B*.
  - `STR-002`: *PMK No. 190/PMK.04/2022*.
  - `STR-003`: *DJBC KPPBC Office Directory*.
  - `STR-007`, `MTH-001`, `MTH-002`, `VAL-002`: *PMK No. 144/PMK.04/2022 tentang Nilai Pabean*.
  - `STR-008`, `STR-009`: *Buku Tarif Kepabeanan Indonesia (BTKI 2026)*.
  - `REG-001`: *INSW / Permendag No. 36/2023 tentang Kebijakan Impor*.
* **Uncodified Intelligence:** `REG-005` (Trade Remedy Review) is explicitly stamped with `ruleSource: 'RULE SOURCE REQUIRED'` and set to `INFORMATIONAL_ONLY`.

---

## 14. LARTAS AUDIT

* **Permit Chain Verification:**
  $$\text{Item HS} \longrightarrow \text{BTKI Master } (\text{lartas\_flag} = \text{true}) \longrightarrow \text{Document Vault } (\text{document\_type} = \text{PERMIT}) \longrightarrow \text{Rule Evaluation}$$
* If permit is attached in Document Vault $\implies$ `REG-001` passes.
* If permit is missing $\implies$ `REG-001` triggers `BLOCKING` exception with permit requirement string (`hsMaster.lartas_permit_type`).

---

## 15. VALUATION AUDIT

* **Valuation Rules:**
  - `MTH-001`: Reconciles $\sum \text{Line CIF}$ against declared Header CIF within $\$0.05$ rounding tolerance.
  - `VAL-001`: Computes percentage variance against historical average:
    $$\Delta\% = \frac{|\text{Price}_{\text{curr}} - \text{Price}_{\text{hist}}|}{\text{Price}_{\text{hist}}} \times 100$$
    Flags `WARNING` if $\Delta\% > 50\%$.

---

## 16. NUMERIC PRECISION AUDIT

* **Floating-Point Safeguard:** A tolerance threshold of $\$0.05$ is enforced in mathematical reconciliation to eliminate IEEE 754 floating-point rounding false positives across large item batches.
* **Locale Normalization:** Number strings from Indonesian format (`1.250.500,50`) and US format (`1,250,500.50`) are parsed and normalized accurately.

---

## 17. TENANT ISOLATION AUDIT

* **Multi-Tenant Partitioning:**
  - All API routes extract `tenantId` from authenticated SSR cookie session or authorized `x-tenant-id` header.
  - All database queries and mutations enforce `.eq('tenant_id', tenantId).eq('declaration_id', declarationId)`.
  - Cross-tenant requests to read or mutate another tenant's exceptions return HTTP 400/403/404.

---

## 18. ROW-LEVEL SECURITY (RLS) AUDIT

* **Migration Policies:**
  - `cus_declaration_validation_runs`: RLS enabled with `USING (tenant_id = public.get_my_tenant_id())`.
  - `cus_declaration_exceptions`: RLS enabled with `USING (tenant_id = public.get_my_tenant_id())`.
* Direct authenticated PostgREST queries cannot view or mutate cross-tenant records.

---

## 19. API SECURITY AUDIT

* **Error Sanitization:** `handleCustomsError` maps domain errors to structured JSON (`{ success: false, error: ..., code: ... }`) and catches unhandled runtime errors with generic 500 responses, preventing stack trace leakage.
* **Input Validation:** Required DTO fields (`justification_reason`, `exception_id`) are validated on the server.

---

## 20. IDEMPOTENCY AUDIT

* **Repeated API Calls:**
  - `POST /validation`: Runs pipeline and upserts exceptions via deterministic fingerprinting. 3 successive calls yield 1 consistent set of exception records.
  - `POST /resolve` and `POST /waive`: Subsequent identical calls update timestamps without corrupting lifecycle state.

---

## 21. CONCURRENCY AUDIT

* **Database Constraints:** `uq_cus_exception_fingerprint (tenant_id, declaration_id, fingerprint)` prevents concurrent validation runs from inserting duplicate exception rows for the same logical issue.

---

## 22. TRANSACTION SAFETY AUDIT

* **Persistence Isolation:** The diagnostic validation engine executes in-memory, ensuring that transient database connection drops do not crash the workbench UI while logging structured diagnostic warnings.

---

## 23. STALE EXCEPTION AUDIT

* **Auto-Resolution:** When a previously failed condition passes in a subsequent validation run, the existing exception row is updated to `status: 'RESOLVED'` and `resolution_type: 'AUTO_RESOLVED'`. Stale open exceptions are eliminated.

---

## 24. READINESS VS VALIDATION COMPLETION

* **Mandatory Pre-Conditions:** An empty declaration (0 lines) or a declaration with unresolved blocking exceptions strictly produces `overall_status: 'BLOCKED'`.
* False readiness is mathematically impossible under the current rules matrix.

---

## 25. EVENT ARCHITECTURE AUDIT

* **Event Catalog Alignment:** Outbox events (`CustomsValidationCompleted`, `CustomsExceptionResolved`, `CustomsExceptionWaived`) conform to canonical schemas defined in `docs/architecture/SENTRALOGIS_EVENT_CATALOG_v1.md`.

---

## 26. AI BOUNDARY AUDIT

* **Deterministic Compliance Guardrail:**
  - 100% of compliance validation rules are deterministic code functions.
  - No AI model or autonomous agent can mutate declaration data, waive an exception, or approve customs readiness without explicit human action.

---

## 27. UI SAFETY AUDIT

* **Component Architecture:**
  - `ValidationWorkspace.tsx`: 3-pane layout with reactive search, category filtering, and status tabs.
  - `ExceptionQueue.tsx`: Priority queue displaying severity badges and line sequence tags.
  - `ExceptionInspector.tsx`: Value diffs, regulatory authorities, and JSON technical evidence viewers.
  - `ResolutionActionDrawer.tsx`: Context-aware remediation forms with client-side and server-side validation.
* **Zero Browser Database Calls:** 0 `supabase.from(...)` in UI components.

---

## 28. PERFORMANCE BENCHMARK RESULTS

Actual execution times measured for multi-tier rule evaluation and exception projection:

| Item Count | Rules Evaluated | Execution Duration | Status |
|---|---|---|---|
| **10 Items** | 57 rules | **2.21 ms** | PASS |
| **100 Items** | 507 rules | **1.63 ms** | PASS |
| **1,000 Items** | 5,007 rules | **9.96 ms** | PASS |
| **10,000 Items** | 50,007 rules | **112.98 ms** | **PASS (Benchmark Threshold: 250 ms)** |

---

## 29. N+1 AUDIT

* **Batch Query Pattern:** In `validateDeclarationDetailed`, all master HS codes, SKU intelligence records, declaration lines, and existing exceptions are retrieved in 3 batch queries prior to in-memory evaluation.
* **0 N+1 Query Loops:** Rule evaluation contains 0 per-item database queries.

---

## 30. REGRESSION VERIFICATION

* **Historical Baseline:** 345 / 345 PASS.
* **Phase 3D-6D-6 Test Suite:** 35 / 35 PASS.
* **Total Suite:** **380 / 380 PASS (100% Green)**.

---

## 31. PROTECTED SYSTEMS VERIFICATION

* `android/app/src/main/java/com/sentralogis/driver/*` $\longrightarrow$ **100% Untouched**
* `app/jo/[token]/page.tsx` $\longrightarrow$ **100% Untouched**
* `app/api/jo/*` $\longrightarrow$ **100% Untouched**
* `src/domains/trucking/*` $\longrightarrow$ **100% Untouched**
* Production tables `job_orders`, `work_orders`, `data_armada`, `data_driver` $\longrightarrow$ **100% Untouched**

---

## 32. FINDINGS BY SEVERITY

### Critical Findings (0)
* *None.*

### High Findings (0)
* *None.*

### Medium Findings (1)
* **FINDING-M01:** *Role-Level Authority Enforcement on Waiver Policies:* Server-side waiver policy currently validates that `BLOCKING` rules under `FIX_REQUIRED` cannot be waived and requires a minimum 5-character justification. When the Customs Organization & Role hierarchy is introduced in Phase 3D-6D-7/8, custom role levels (e.g. `PPJK_SUPERVISOR` vs `PPJK_OPERATOR`) should be strictly enforced against `resolution_policy === 'APPROVAL_REQUIRED'`.

### Low Findings (1)
* **FINDING-L01:** *Diagnostic Persistence Telemetry Monitoring:* In `validateDeclarationDetailed`, database persistence warnings during validation runs are caught and logged with `console.warn`. An enterprise telemetry sink (e.g. OpenTelemetry / Sentry) should capture persistence notices in production.

### Observations (2)
* **OBS-01:** Extreme throughput: In-memory evaluation of 10,000 lines executes in ~113 ms.
* **OBS-02:** Strict regulatory integrity: Rules lacking complete statutory articles (e.g. `REG-005`) are classified as `RULE SOURCE REQUIRED` with `INFORMATIONAL_ONLY` impact.

---

## 33. REQUIRED REMEDIATION

1. *(For Phase 3D-6D-7/8):* Wire `CustomsAuthContext.role` into `waiveException` when `resolution_policy === 'APPROVAL_REQUIRED'`.
2. *(For Production Telemetry):* Replace `console.warn` in service persistence with enterprise telemetry sink.

---

## 34. GATE DECISION & RECOMMENDATION FOR PHASE 3D-6D-7

### GATE DECISION:
```
================================================================================
                    GATE A — READY FOR PHASE 3D-6D-7
================================================================================
```

### Recommendation:
Phase 3D-6D-6 has passed all architectural, security, performance, and tenant isolation audits with 0 Critical and 0 High defects.

**Phase 3D-6D-7 (Supporting Documents + Valuation + Lartas Verification Workspace)** is cleared for implementation upon user authorization.
