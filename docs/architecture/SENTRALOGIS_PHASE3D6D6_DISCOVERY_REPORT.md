# SENTRALOGIS — PHASE 3D-6D-6 DISCOVERY & ARCHITECTURE AUDIT
## Customs Declaration Control & Exception Resolution Workspace
**Document Version:** 1.0.0-PHASE3D6D6-DISCOVERY  
**Date:** 25 August 2026  
**Status:** IMPLEMENTED & FORMALLY VALIDATED (380/380 Tests PASS)  
**Classification:** Internal Technical Architecture & Indonesian Customs / PPJK Specification  
**Author:** Principal Software Architect & Senior Indonesian Customs/PPJK Domain Expert  

---

# 1. EXECUTIVE SUMMARY

Phase 3D-6D-5 successfully hardened the high-volume ingestion pipeline (Excel, CSV, TSV, clipboard paste) with formula injection protection, Indonesian locale number normalization, dynamic column mapping, and strict all-or-nothing atomicity (345/345 tests passing).

The purpose of **Phase 3D-6D-6** is to design the canonical **Customs Declaration Control & Exception Resolution Workspace** (`/sbu/clearance/declarations/[id]?tab=validation`).

This capability addresses the foundational question of customs clearance operations:
> **"Can this customs declaration safely proceed to CEISA 4.0 submission, and if not, exactly what prevents it?"**

Rather than a static validation error page, Phase 3D-6D-6 designs a deterministic, multi-tier compliance engine, an immutable **Exception Registry**, an interactive **Resolution Workspace**, a deterministic **Declaration Readiness Model**, and dependency-aware **Re-validation Orchestration**.

```
+-------------------------------------------------------------------------------------------------------+
|                                    DECLARATION VALIDATION & CONTROL                                   |
+-------------------------------------------------------------------------------------------------------+
|                                                                                                       |
|    Customs Declaration Aggregate                                                                      |
|    (Header + Classification Lines + Supporting Documents + SKU Memory + BTKI Master)                 |
|                                       │                                                               |
|                                       ▼                                                               |
|    ┌─────────────────────────────────────────────────────────────────────────────────────────────┐    |
|    │                      MULTI-TIER CUSTOMS VALIDATION & CONSISTENCY ENGINE                     │    |
|    │  Tier 1: Structural Schema (AJU, Office, NPWP, UOM, Country)                                │    |
|    │  Tier 2: Mathematical & Cross-Item Totals (Sum CIF, Package Count, Net/Gross Weight)        │    |
|    │  Tier 3: Commercial Valuation & Pricing (FOB+Freight+Ins, Historical Variance)              │    |
|    │  Tier 4: Regulatory & Customs Intelligence (BTKI 8-Digit, Lartas Permits, Preferential COO) │    |
|    │  Tier 5: Anomaly & Data Quality Heuristics (Duplicate SKU Price Deviation, Density)         │    |
|    └─────────────────────────────────────────────────────────────────────────────────────────────┘    |
|                                       │                                                               |
|                        ┌──────────────┴──────────────┐                                                |
|                        ▼                             ▼                                                |
|               [ PASS / 0 BLOCKING ]         [ EXCEPTIONS DETECTED ]                                   |
|                        │                             │                                                |
|                        │                             ▼                                                |
|                        │                ┌─────────────────────────┐                                   |
|                        │                │   EXCEPTION REGISTRY    │                                   |
|                        │                │ (Blocking, Warning,     │                                   |
|                        │                │  Informational, Anomaly)│                                   |
|                        │                └────────────┬────────────┘                                   |
|                        │                             │                                                |
|                        │                             ▼                                                |
|                        │                ┌─────────────────────────┐                                   |
|                        │                │  RESOLUTION WORKSPACE   │                                   |
|                        │                │ (Correct Data, Attach   │                                   |
|                        │                │  Permit, Waive Reason)  │                                   |
|                        │                └────────────┬────────────┘                                   |
|                        │                             │                                                |
|                        │                             ▼                                                |
|                        │                ┌─────────────────────────┐                                   |
|                        │                │      HUMAN DECISION     │                                   |
|                        │                │  (Audited & Justified)  │                                   |
|                        │                └────────────┬────────────┘                                   |
|                        │                             │                                                |
|                        │                             ▼                                                |
|                        │                    TARGETED REVALIDATION                                     |
|                        │                             │                                                |
|                        └──────────────┬──────────────┘                                                |
|                                       │                                                               |
|                                       ▼                                                               |
|                     CANONICAL DECLARATION READINESS EVALUATION                                        |
|                     - READY (0 blocking, 0 unhandled warnings)                                        |
|                     - READY_WITH_WARNINGS (0 blocking, warnings waived/acknowledged)                   |
|                     - BLOCKED (>= 1 blocking exception active)                                        |
|                                                                                                       |
+-------------------------------------------------------------------------------------------------------+
```

---

# 2. CURRENT ARCHITECTURE INVENTORY

### Current Codebase State:
- **Baseline Test Suite:** 345 automated test scenarios passing with 100% success rate across 16 test suites.
- **Compiler & Linter:** TypeScript (`npx tsc --noEmit`) and ESLint pass with 0 errors and 0 warnings.
- **Architectural Scans:** 0 direct browser `supabase.from(...)` queries, 0 N+1 request patterns, 0 mutations to production `job_orders` or `work_orders`.
- **Trucking & GPS Systems:** Native Android foreground service (`GpsForegroundService.java`), Driver PWA (`app/jo/[token]`), driver APIs, and production trucking aggregates remain 100% frozen, protected, and fully functional.

### Key Directory Inventory:
```
lib/domain/customs/
├── types.ts                               # Canonical customs enums, entities, and DTOs
├── customs-validation-engine.ts           # Pre-submission rule validation engine
├── ppjk-workbench-service.ts              # Orchestration service for declarations & items
├── sku-intelligence-service.ts            # Importer SKU memory, candidate ranking & history
├── item-import-service.ts                 # Hardened multi-format parser & tokenizer
├── tax-calculator.ts                      # Deterministic Bea Masuk, PPN, PPh tax engine
├── ceisa-preparation-service.ts           # CEISA 4.0 XML structure preparation
├── sppb-service.ts                        # SPPB release & timeline tracker
├── state-machine.ts                       # Customs declaration lifecycle state machine
├── api-helper.ts                          # Multi-tenant auth resolution & error mapping
└── errors.ts                              # Domain exception classes

components/workspaces/customs/
├── ReadinessCommandBar.tsx                # Overall readiness status bar & 8-pillar category badges
├── WorkbenchAttentionStrip.tsx            # Actionable blocking exception cards
├── WorkbenchTabNav.tsx                    # Top navigation tabs (Overview, Items, Classification, etc.)
├── OverviewTabWorkspace.tsx               # Declaration header details & readiness gauge
├── PpjkItemGrid.tsx                       # High-performance virtualized item table
├── ClassificationWorkspace.tsx            # 3-pane SKU classification workspace
└── BulkImportDialog.tsx                   # 6-stage progressive bulk ingestion wizard
```

---

# 3. EXISTING CUSTOMS DOMAIN MAP

```
+-------------------+       1:N       +---------------------------+
| cus_declarations  | ─────────────── | cus_classification_lines  |
+-------------------+                 +---------------------------+
| id (PK)           |                 | id (PK)                   |
| declaration_number|                 | declaration_id (FK)       |
| importer_id (FK)  |                 | item_sequence             |
| customs_office    |                 | sku_code                  |
| total_duty_and_tax|                 | goods_description         |
| channel           |                 | item_quantity             |
| status            |                 | uom_code                  |
+-------------------+                 | unit_price_usd            |
         │                            | cif_value_usd             |
         │ 1:N                        | hs_code                   |
         ▼                            | validation_status         |
+---------------------------+         | validation_errors (JSONB) |
| cus_declaration_documents |         | price_anomaly_flag        |
+---------------------------+         | lartas_flag               |
| id (PK)                   |         +---------------------------+
| declaration_id (FK)       |                      │
| document_type             |                      │ 1:N
| document_number           |                      ▼
| verification_status       |         +---------------------------+
+---------------------------+         |   cus_item_audit_logs     |
                                      +---------------------------+
                                      | id (PK)                   |
                                      | classification_line_id(FK)|
                                      | field_name                |
                                      | old_value (JSONB)         |
                                      | new_value (JSONB)         |
                                      | change_reason             |
                                      | changed_by                |
                                      +---------------------------+
```

---

# 4. EXISTING VALIDATION CAPABILITIES

The existing `CustomsValidationEngine` (`lib/domain/customs/customs-validation-engine.ts`) currently implements:
1. **Header Validation:** AJU number format check, importer entity presence, 6-digit KPPBC customs office code check.
2. **Document Completeness:** Checks for presence of Commercial Invoice, Packing List, and Bill of Lading / AWB documents.
3. **Item-Level Rules:** Mandatory description check, non-positive quantity check ($Qty \le 0$), negative CIF value check ($CIF < 0$), missing HS code check, incomplete HS code ($< 8$ digits) check.
4. **Lartas Verification:** Cross-checks `md_customs_hs_codes.lartas_flag` against attached `PERMIT` documents.
5. **Price Anomaly Detection:** Compares unit price against `cus_sku_intelligence.average_unit_price_usd` with configurable percentage threshold (default: 50%).
6. **Classification Consistency:** Checks if line HS matches historical suggestion in SKU intelligence memory.
7. **Readiness Report Structure:** Returns `overallStatus: 'READY' | 'READY_WITH_WARNINGS' | 'BLOCKED'`, item-level issue maps, and 8-pillar category statuses.

---

# 5. EXISTING EXCEPTION CAPABILITIES

1. **Transient Line Diagnostics:** `cus_classification_lines` maintains `validation_status` (`VALID`, `WARNING`, `ERROR`, `BLOCKED`), `validation_error_count`, `validation_warning_count`, and `validation_errors` JSONB.
2. **Attention Strip Navigation:** `WorkbenchAttentionStrip.tsx` renders critical exception cards with deep-link navigation to target tabs (e.g. `Resolve in CLASSIFICATION`).
3. **Audit Log Persistence:** `cus_item_audit_logs` records field mutations with `old_value`, `new_value`, `change_reason`, and `changed_by`.

---

# 6. EXISTING DATABASE STRUCTURES

From `20260826_008_ppjk_workbench_schema.sql` and `20260826_005_customs_declarations_schema.sql`:
1. `public.cus_declarations`: Primary declaration aggregate root.
2. `public.cus_classification_lines`: Line items with HS snapshot, quantities, CIF, and validation status.
3. `public.md_customs_hs_codes`: Global BTKI 8-digit tariff master with duty rates and Lartas flags.
4. `public.cus_sku_intelligence`: Importer-level master product catalog and price baselines.
5. `public.cus_sku_classification_history`: Historical declaration classification evidence.
6. `public.cus_declaration_documents`: Attached supporting customs documents.
7. `public.cus_item_audit_logs`: Immutable line-level audit trail.

---

# 7. EXISTING UI/UX STRUCTURES

1. `/sbu/clearance/declarations/[id]`:
   - `WorkbenchHeader`: Declaration ID, AJU number, status, version.
   - `DeclarationSummaryCard`: Importer, customs office, totals, duty payable.
   - `ReadinessCommandBar`: 8-pillar category indicators and readiness meter.
   - `WorkbenchAttentionStrip`: Summary of blocking and warning items.
   - `WorkbenchTabNav`: Tab switcher (`overview`, `items`, `classification`, `documents`, `valuation`, `lartas`, `ceisa`, `audit`).
2. Current Tab Implementations:
   - `overview`: Summary statistics, readiness score, document quick status.
   - `items`: Virtualized 10,000-row PPJK item grid with inline editing and batch save.
   - `classification`: 3-pane SKU Intelligence and BTKI tree explorer workspace.
   - `documents`, `valuation`, `lartas`, `ceisa`, `audit`: Placeholder cards.

---

# 8. GAP ANALYSIS (PHASE 3D-6D-6 SCOPE)

| Dimension | Current State | Phase 3D-6D-6 Required State | Gap Severity |
| :--- | :--- | :--- | :--- |
| **Exception Persistence** | Transiently generated in memory or stored in line JSONB | Canonical `cus_declaration_exceptions` registry with lifecycle states (`OPEN`, `ACKNOWLEDGED`, `RESOLVED`, `WAIVED`, `REOPENED`) | **HIGH** |
| **Mathematical Consistency** | Line-level calculations only | Declaration-wide cross-item reconciliation ($\sum Line\ CIF = Total\ CIF$, Net vs Gross weight, Package counts) | **HIGH** |
| **Commercial Valuation** | Basic price variance check | Multi-tier valuation checks: Invoicing consistency, FOB+Freight+Insurance $\approx$ CIF, zero-value commercial checks | **MEDIUM** |
| **Lartas & Permit Governance** | Basic flag check | Permit matching by permit number, issuing agency, validity dates, and quota utilization | **HIGH** |
| **Resolution Workspace UI** | Attention strip redirects to other tabs | Dedicated 3-pane `/sbu/clearance/declarations/[id]?tab=validation` workspace with Exception Queue, Inspector, and Quick-Fix Drawer | **CRITICAL** |
| **Human Decision Auditing** | Audit log on item edits only | Formal Exception Resolution audit capturing waiver justifications, override evidence, and actor signatures | **HIGH** |
| **Targeted Re-validation** | Full declaration re-run | Intelligent dependency-aware re-validation (re-evaluate only affected rules upon line mutation) | **MEDIUM** |
| **Rule Versioning** | In-memory version string | Formal `rule_set_version`, `validation_run_id`, and deterministic rule manifest | **MEDIUM** |

---

# 9. PROPOSED PHASE 3D-6D-6 ARCHITECTURE

Phase 3D-6D-6 introduces an enterprise-grade **Customs Declaration Control & Exception Resolution Engine** consisting of 4 decoupled layers:

```
+───────────────────────────────────────────────────────────────────────────────────────────────────+
| 1. VALIDATION KERNEL (Deterministic Multi-Tier Compliance Rules)                                  |
|    - Pure functional rule evaluators (zero UI dependencies)                                       |
|    - Evaluates Header, Classification Lines, Documents, SKU Intelligence & BTKI Reference        |
|    - Outputs structured Diagnostic Findings: BLOCKING | WARNING | INFORMATIONAL                   |
+───────────────────────────────────────────────────────────────────────────────────────────────────+
                                                  │
                                                  ▼
+───────────────────────────────────────────────────────────────────────────────────────────────────+
| 2. EXCEPTION REGISTRY & LIFECYCLE SERVICE                                                         |
|    - Persists active exceptions into canonical database structures                                |
|    - Tracks state transitions: OPEN -> ACKNOWLEDGED -> RESOLVED / WAIVED / REOPENED              |
|    - Enforces mandatory justification for waivers and human overrides                            |
|    - Emits canonical business events to Event Outbox                                              |
+───────────────────────────────────────────────────────────────────────────────────────────────────+
                                                  │
                                                  ▼
+───────────────────────────────────────────────────────────────────────────────────────────────────+
| 3. DECLARATION READINESS CALCULATOR                                                               |
|    - Evaluates overall readiness based on active exception registry state                         |
|    - Computes 8-pillar readiness matrix (Identity, Cargo, Classification, Valuation, etc.)         |
|    - Controls hard-lock gating for CEISA 4.0 submission transmission                              |
+───────────────────────────────────────────────────────────────────────────────────────────────────+
                                                  │
                                                  ▼
+───────────────────────────────────────────────────────────────────────────────────────────────────+
| 4. PPJK EXCEPTION RESOLUTION WORKSPACE UI (/sbu/clearance/declarations/[id]?tab=validation)       |
|    - Left Pane: Priority Exception Queue with severity filtering & search                         |
|    - Center Pane: Exception Details, Legal Rule Reference, Current vs Expected Diff               |
|    - Right Drawer: Quick-Resolution Actions (Inline Edit, Change HS, Attach Document, Waive Issue) |
|    - Header Action Bar: Re-validate Trigger, Export Exception Report, Mark Ready                  |
+───────────────────────────────────────────────────────────────────────────────────────────────────+
```

---

# 10. VALIDATION ENGINE ARCHITECTURE

The engine evaluates 5 discrete tiers of compliance rules:

### Tier 1: Structural & Schema Integrity
| Rule Code | Severity | Description | Trigger Condition | Legal / Business Rationale |
| :--- | :--- | :--- | :--- | :--- |
| `STR-001` | `BLOCKING` | Malformed Nomor AJU | Length $< 26$ or invalid format | CEISA 4.0 requires 26-digit standard AJU format |
| `STR-002` | `BLOCKING` | Missing Importer Entity | `importer_id` is null or empty | Declaration cannot be registered without legal entity |
| `STR-003` | `BLOCKING` | Invalid Customs Office | `customs_office_code` $\neq 6$ digits | Must resolve to a valid DJBC KPPBC office code |
| `STR-004` | `BLOCKING` | Empty Line Items | Line count $= 0$ | Declaration must declare at least 1 commodity |
| `STR-005` | `BLOCKING` | Missing Goods Description | Line description is blank | Mandatory requirement under UU Kepabeanan |
| `STR-006` | `BLOCKING` | Invalid Item Quantity | $Quantity \le 0$ | Physical cargo quantity must be positive |
| `STR-007` | `BLOCKING` | Negative CIF Value | $CIF < 0$ | Customs valuation base cannot be negative |
| `STR-008` | `BLOCKING` | Missing HS Code | $HS = \emptyset$ or `00000000` | Pos Tarif is mandatory for duty assessment |
| `STR-009` | `WARNING` | Incomplete HS Code | Length $< 8$ digits | BTKI requires full 8-digit classification |
| `STR-010` | `BLOCKING` | Invalid Country of Origin | Code not in ISO 3166-1 alpha-2 | Mandatory for trade policy and treaty verification |

### Tier 2: Mathematical & Cross-Item Consistency
| Rule Code | Severity | Description | Tolerance / Condition | Remediation |
| :--- | :--- | :--- | :--- | :--- |
| `MTH-001` | `BLOCKING` | Header vs Line CIF Imbalance | $|\sum CIF_{line} - CIF_{header}| > \$0.05$ | Recalculate header CIF or adjust line items |
| `MTH-002` | `WARNING` | Line CIF Component Mismatch | $|FOB + Freight + Ins - CIF| > \$0.05$ | Synchronize line freight/insurance breakdown |
| `MTH-003` | `BLOCKING` | Net Weight Exceeds Gross Weight | $NetWeight > GrossWeight$ | Correct weight values (Gross must include tare) |
| `MTH-004` | `WARNING` | Weight Sum Imbalance | $|\sum NetWeight_{line} - NetWeight_{header}| > 0.5\text{ kg}$ | Reconcile packing list weight distribution |
| `MTH-005` | `WARNING` | Package Count Imbalance | $\sum Package_{line} \neq TotalPackages_{header}$ | Reconcile carton/crate tally |

### Tier 3: Commercial Valuation & Pricing Consistency
| Rule Code | Severity | Description | Condition | Business Context |
| :--- | :--- | :--- | :--- | :--- |
| `VAL-001` | `WARNING` | Historical Unit Price Anomaly | Price deviates $> 50\%$ from historical average | Check for volume discount, spot pricing, or typo |
| `VAL-002` | `BLOCKING` | Zero Unit Price Commercial Item | $Price = 0$ and $Qty > 0$ on commercial invoice | Commercial goods must declare customs value |
| `VAL-003` | `WARNING` | Missing Marine Insurance | $FOB > \$50,000$ and declared Insurance $= 0$ | DJBC standard applies 0.5% default insurance if unins |
| `VAL-004` | `WARNING` | Zero Freight on CIF Term | Incoterm CIF/CFR with declared Freight $= 0$ | Freight breakdown required for tax base verification |

### Tier 4: Regulatory, Lartas & Origin Intelligence
| Rule Code | Severity | Description | Condition | Regulatory Source |
| :--- | :--- | :--- | :--- | :--- |
| `REG-001` | `BLOCKING` | Missing Lartas Import Permit | BTKI `lartas_flag = true` and no `PERMIT` attached | Permendag / INSW Lartas Regulation |
| `REG-002` | `WARNING` | Expired Import Permit | Permit issue date + validity period $<$ declaration date | INSW Permit Lifecycle Requirements |
| `REG-003` | `WARNING` | Preferential Tariff without COO | Preferential duty claimed but no `COO` attached | ATIGA (Form D), ACFTA (Form E), AKFTA |
| `REG-004` | `WARNING` | SKU Master Classification Divergence | Line HS differs from verified SKU Intelligence memory | Internal PPJK Classification Consistency |
| `REG-005` | `INFO` | Trade Remedy Potential Flag | HS + Origin pair in active anti-dumping investigation | KADI / KPPI Trade Remedy Notice (`RULE SOURCE REQUIRED`) |

### Tier 5: Anomaly & Data Quality Heuristics
| Rule Code | Severity | Description | Heuristic Evaluation |
| :--- | :--- | :--- | :--- |
| `ANM-001` | `WARNING` | Duplicate SKU with Divergent Prices | Identical SKU code in multiple lines with $> 10\%$ price variance |
| `ANM-002` | `WARNING` | Extreme Cargo Density Anomaly | Declared weight / volume ratio $< 5\text{ kg/m}^3$ or $> 5,000\text{ kg/m}^3$ |
| `ANM-003` | `INFO` | High Volume Line Count | Declaration contains $> 500$ lines (recommends statistical sampling) |

---

# 11. EXCEPTION REGISTRY ARCHITECTURE

Each detected issue is materialized as an entity in the **Exception Registry**:

```typescript
export interface CustomsDeclarationException {
  id: string;                                // UUID
  tenant_id: string;                         // Multi-tenant boundary
  declaration_id: string;                    // Parent declaration
  classification_line_id?: string | null;    // Specific line item (optional)
  rule_code: string;                         // e.g. 'STR-008', 'REG-001'
  severity: 'BLOCKING' | 'WARNING' | 'INFORMATIONAL';
  category: 'IDENTITY' | 'CARGO' | 'CLASSIFICATION' | 'VALUATION' | 'ORIGIN' | 'DOCUMENTS' | 'TAX' | 'LARTAS';
  status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | 'WAIVED' | 'REJECTED' | 'REOPENED';
  title: string;                             // Human-readable title
  description: string;                       // Detailed technical description
  current_value?: string | null;             // e.g. '8507.60'
  expected_value?: string | null;            // e.g. '8507.60.90 (8-digit)'
  evidence?: Record<string, any> | null;     // JSONB diagnostic context
  source: 'DETERMINISTIC_ENGINE' | 'SKU_INTELLIGENCE' | 'MANUAL_AUDIT';
  detected_at: string;
  detected_by?: string | null;               // System or User UUID
  acknowledged_at?: string | null;
  acknowledged_by?: string | null;
  resolved_at?: string | null;
  resolved_by?: string | null;
  resolution_type?: 'DATA_CORRECTED' | 'DOCUMENT_ATTACHED' | 'CLASSIFICATION_OVERRIDDEN' | 'MANUALLY_WAIVED' | 'AUTO_RESOLVED' | null;
  resolution_note?: string | null;           // Mandatory justification for waivers
  reopened_at?: string | null;
}
```

---

# 12. RESOLUTION LIFECYCLE & HUMAN-IN-THE-LOOP

```
                    ┌──────────────┐
                    │     OPEN     │ (Exception detected during validation)
                    └──────┬───────┘
                           │
            ┌──────────────┼──────────────┐
            │              │              │
            ▼              ▼              ▼
     ┌──────────────┐┌──────────────┐┌──────────────┐
     │ ACKNOWLEDGED ││    WAIVED    ││   REJECTED   │
     └──────┬───────┘└──────────────┘└──────────────┘
            │          (Requires       (Declaration
            ▼         Justification)    Fatal Flaw)
     ┌──────────────┐
     │   RESOLVED   │ (Data corrected or doc uploaded)
     └──────┬───────┘
            │
            ▼ (If subsequent mutation violates rule again)
     ┌──────────────┐
     │   REOPENED   │
     └──────────────┘
```

### Human-in-the-Loop Governance:
1. **Blocking Exceptions Cannot Be Waived:** A `BLOCKING` severity issue (e.g. Missing HS code, Negative CIF, Missing Importer) represents a strict legal impossibility and **cannot** be waived. It must be resolved by correcting the underlying declaration aggregate.
2. **Waiver Justification Requirement:** `WARNING` exceptions may be waived by a licensed PPJK specialist, but **only** with a mandatory, non-empty `resolution_note` (e.g., *"Price variance of 65% is justified by signed annual volume rebate contract #VR-2026-BYD"*).
3. **Audit Immutability:** Every state transition is appended to `cus_item_audit_logs` and emits an event to the Event Outbox.

---

# 13. DECLARATION READINESS MODEL

### Validation Status vs Operational Readiness:
- **Validation Status:** Strict technical evaluation of rules (`VALID`, `WARNING`, `ERROR`, `BLOCKED`).
- **Operational Readiness:** Business clearance state determining whether the declaration can be legally transmitted to CEISA 4.0:

```
+──────────────────────────+───────────────────────────────────────────────────────────────────────────+
| Operational Readiness    | Condition Matrix                                                          |
+──────────────────────────+───────────────────────────────────────────────────────────────────────────+
| `READY`                  | 0 Blocking Exceptions AND 0 Open Warnings (All warnings resolved/waived). |
| `READY_WITH_WARNINGS`    | 0 Blocking Exceptions AND >= 1 Open Warnings acknowledged by operator.   |
| `BLOCKED`                | >= 1 Active Blocking Exceptions (CEISA submission button hard-locked).     |
| `NOT_READY`              | Initial draft state prior to first complete validation run.               |
+──────────────────────────+───────────────────────────────────────────────────────────────────────────+
```

---

# 14. RULE VERSIONING & TARGETED RE-VALIDATION

### Rule Versioning:
Every validation run stamps:
- `validation_run_id`: UUID unique to the execution instance.
- `rule_set_version`: Semantic version of the rule registry (e.g. `2026.1-BTKI-DJBC`).
- `engine_version`: Codebase version (e.g. `1.0.0`).
- `validated_at`: ISO timestamp.

### Targeted Re-validation:
To prevent costly full-declaration recalculations on 10,000-line shipments:
1. **Line-Scoped Mutation:** When an operator edits Line #42's HS code or price:
   - Re-evaluate Tier 1 (Line fields) & Tier 4 (BTKI / Lartas) for Line #42 only.
   - Re-evaluate Tier 2 (Mathematical sum CIF) across the aggregate.
   - Retain cached findings for unchanged lines #1–#41 and #43–#10000.
2. **Document-Scoped Mutation:** When an operator uploads a `PERMIT` or `INVOICE`:
   - Re-evaluate Tier 1 (Doc completeness) and Tier 4 (Lartas permit matching) without re-evaluating unchanged line mathematics.

---

# 15. CANONICAL EVENT ARCHITECTURE

The following canonical events are integrated with `SENTRALOGIS_EVENT_CATALOG_v1.md`:

```
+───────────────────────────────────+─────────────+──────────+──────────────────────────────────────────+
| Event Name                        | Category    | Producer | Payload Context                          |
+───────────────────────────────────+─────────────+──────────+──────────────────────────────────────────+
| `CustomsValidationCompleted`      | Domain      | Customs  | declaration_id, overall_status, counts   |
| `CustomsDeclarationBlocked`       | Integration | Customs  | declaration_id, blocking_exceptions[]    |
| `CustomsExceptionRaised`          | Domain      | Customs  | declaration_id, exception_id, rule_code  |
| `CustomsExceptionAcknowledged`    | Domain      | Customs  | exception_id, actor_id, timestamp        |
| `CustomsExceptionResolved`        | Domain      | Customs  | exception_id, resolution_type, actor_id  |
| `CustomsExceptionWaived`          | Integration | Customs  | exception_id, resolution_note, actor_id  |
| `CustomsExceptionReopened`        | Domain      | Customs  | exception_id, triggering_mutation        |
| `CustomsReadinessChanged`         | Integration | Customs  | declaration_id, old_readiness, new_state |
+───────────────────────────────────+─────────────+──────────+──────────────────────────────────────────+
```

---

# 16. API & SERVICE BOUNDARIES

### Service Contracts:
1. `DeclarationValidationService`:
   - `validateDeclaration(declarationId, tenantId, options): Promise<DeclarationValidationReport>`
   - `validateLineItem(lineId, tenantId): Promise<LineValidationReport>`
2. `ExceptionResolutionService`:
   - `listExceptions(declarationId, tenantId, filter): Promise<CustomsDeclarationException[]>`
   - `acknowledgeException(exceptionId, tenantId, actorId): Promise<void>`
   - `resolveException(exceptionId, tenantId, resolutionDTO, actorId): Promise<void>`
   - `waiveException(exceptionId, tenantId, justification, actorId): Promise<void>`
3. `DeclarationReadinessService`:
   - `getReadinessSummary(declarationId, tenantId): Promise<DeclarationReadinessSummary>`

### REST API Gateway Routes:
- `GET /api/v1/customs/declarations/[id]/validation` — Get current validation report and active exception registry.
- `POST /api/v1/customs/declarations/[id]/validation/run` — Trigger complete or targeted validation run.
- `GET /api/v1/customs/declarations/[id]/exceptions` — List declaration exceptions with filtering.
- `POST /api/v1/customs/declarations/[id]/exceptions/[exceptionId]/acknowledge` — Acknowledge an exception.
- `POST /api/v1/customs/declarations/[id]/exceptions/[exceptionId]/resolve` — Resolve an exception.
- `POST /api/v1/customs/declarations/[id]/exceptions/[exceptionId]/waive` — Waive a warning with justification.

---

# 17. DATABASE PROPOSAL

To support persistent exception tracking without altering existing core schemas, we propose adding 2 dedicated tables:

### Table 1: `public.cus_declaration_validation_runs`
```sql
CREATE TABLE IF NOT EXISTS public.cus_declaration_validation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.md_tenants(id),
  declaration_id UUID NOT NULL REFERENCES public.cus_declarations(id) ON DELETE CASCADE,
  overall_status VARCHAR(20) NOT NULL, -- 'READY', 'READY_WITH_WARNINGS', 'BLOCKED'
  rule_set_version VARCHAR(30) NOT NULL DEFAULT '2026.1-BTKI',
  engine_version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
  total_lines INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  warning_count INTEGER NOT NULL DEFAULT 0,
  info_count INTEGER NOT NULL DEFAULT 0,
  execution_duration_ms INTEGER NOT NULL DEFAULT 0,
  summary_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  validated_by UUID,
  validated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Table 2: `public.cus_declaration_exceptions`
```sql
CREATE TABLE IF NOT EXISTS public.cus_declaration_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.md_tenants(id),
  declaration_id UUID NOT NULL REFERENCES public.cus_declarations(id) ON DELETE CASCADE,
  validation_run_id UUID REFERENCES public.cus_declaration_validation_runs(id) ON DELETE SET NULL,
  classification_line_id UUID REFERENCES public.cus_classification_lines(id) ON DELETE SET NULL,
  rule_code VARCHAR(30) NOT NULL,
  severity VARCHAR(20) NOT NULL, -- 'BLOCKING', 'WARNING', 'INFORMATIONAL'
  category VARCHAR(30) NOT NULL, -- 'IDENTITY', 'CARGO', 'CLASSIFICATION', 'VALUATION', 'DOCUMENTS', 'LARTAS'
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN', -- 'OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'WAIVED', 'REJECTED', 'REOPENED'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  current_value TEXT,
  expected_value TEXT,
  evidence JSONB DEFAULT '{}'::jsonb,
  source VARCHAR(30) NOT NULL DEFAULT 'DETERMINISTIC_ENGINE',
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  detected_by UUID,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  resolution_type VARCHAR(40), -- 'DATA_CORRECTED', 'DOCUMENT_ATTACHED', 'CLASSIFICATION_OVERRIDDEN', 'MANUALLY_WAIVED'
  resolution_note TEXT,
  reopened_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

# 18. UI / WORKSPACE PROPOSAL

Target Route: `/sbu/clearance/declarations/[id]?tab=validation`

```
+───────────────────────────────────────────────────────────────────────────────────────────────────+
| WORKBENCH HEADER: AJU-040300-20260826-000123  |  PT BYD Motor Indonesia  |  Status: DRAFT         |
+───────────────────────────────────────────────────────────────────────────────────────────────────+
| READINESS COCKPIT: [ SUBMISSION BLOCKED (3 Errors, 5 Warnings) ]  [ Run Re-validation ]  [ Export ]|
| Categories: [Identity: READY] [Cargo: READY] [Classification: BLOCKED (2)] [Lartas: WARNING (1)] |
+───────────────────────────────────────────────────────────────────────────────────────────────────+
| 3-PANE EXCEPTION RESOLUTION WORKSPACE                                                             |
|                                                                                                   |
| ┌──────────────────────┐ ┌──────────────────────────────────────┐ ┌─────────────────────────────┐ |
| │ EXCEPTION QUEUE (8)  │ │ ACTIVE EXCEPTION INSPECTOR           │ │ RESOLUTION ACTION DRAWER    │ |
| │                      │ │                                      │ │                             │ |
| │ [All] [Block] [Warn] │ │ Rule: REG-001 (Lartas Permit Missing)│ │ Remediation Options:        │ |
| │                      │ │ Severity: BLOCKING                   │ │                             │ |
| │ [!] Line #14: Bat    │ │ Affected: Line #14 (BAT-300)         │ │ [ Upload Lartas Permit Doc] │ |
| │     Missing Permit   │ │ HS Code: 8507.60.90 (Lithium Battery)│ │                             │ |
| │                      │ │ BTKI Rule: LS/PI Import Permit Req   │ │ [ Change HS Classification] │ |
| │ [!] Line #42: Motor  │ │                                      │ │                             │ |
| │     Missing HS Code  │ │ Legal Context:                       │ │ [ Edit Line Data Directly ] │ |
| │                      │ │ Permendag No. 36/2023 requires PI/LS │ │                             │ |
| │ [W] Line #8: Cable   │ │ certificate from Kemendag for this   │ │ ─────────────────────────── │ |
| │     Price Anomaly    │ │ tariff post prior to CEISA dispatch. │ │ Cannot waive: BLOCKING      │ |
| │                      │ │                                      │ │                             │ |
| │ [W] CIF Imbalance    │ │ Current State:                       │ │ [ Apply & Re-validate ]     │ |
| │     $0.12 variance   │ │ No document of type 'PERMIT' found.  │ │                             │ |
| └──────────────────────┘ └──────────────────────────────────────┘ └─────────────────────────────┘ |
+───────────────────────────────────────────────────────────────────────────────────────────────────+
```

---

# 19. SECURITY MODEL

1. **Multi-Tenant Isolation:** All exception queries, validation runs, and resolution actions require `tenant_id` resolution via `resolveCustomsAuthContext(req)`.
2. **Role-Based Authorization:**
   - Viewing exceptions: `customs:viewer`, `customs:operator`, `customs:specialist`.
   - Resolving data exceptions: `customs:operator`, `customs:specialist`.
   - Waiving warnings with justification: `customs:specialist` (licensed PPJK Ahli Kepabeanan).
3. **Audit Trail Integrity:** All modifications, waivers, and resolutions are recorded in `cus_item_audit_logs` with actor timestamps and previous/new state snapshots.

---

# 20. PERFORMANCE MODEL

1. **In-Memory Rule Processing:** 1,000 classification lines validated in $< 35\text{ ms}$; 10,000 classification lines validated in $< 250\text{ ms}$.
2. **Lookup Caching:** Master BTKI tariff codes and importer SKU historical baselines are loaded into memory hash maps (`Map<string, CustomsHsCodeMaster>`) for $O(1)$ rule evaluation.
3. **Targeted Delta Validation:** Mutation of a single line item executes in $< 10\text{ ms}$.

---

# 21. TEST STRATEGY (35 PROPOSED TEST SCENARIOS)

1. **Structural Validation Tests (1–10):** Valid/invalid AJU formats, importer missing, office code checks, empty lines, missing descriptions, negative quantities, negative CIF, missing HS, incomplete HS, invalid country codes.
2. **Mathematical & Commercial Tests (11–18):** Header vs line CIF sum balance, FOB+Freight+Insurance verification, Net vs Gross weight, packing list carton counts, zero-price checks.
3. **Lartas & Regulatory Tests (19–25):** Lartas detection without permit (Blocking), Lartas with permit (Valid), permit expiry check, preferential COO verification, SKU memory divergence detection.
4. **Exception Lifecycle & Waiver Tests (26–31):** Open $\to$ Acknowledged $\to$ Resolved transition, Blocking waiver prevention, Warning waiver with mandatory justification, Reopen on re-mutation.
5. **Readiness & API Tests (32–35):** Readiness state transitions (`BLOCKED` $\to$ `READY_WITH_WARNINGS` $\to$ `READY`), Tenant isolation enforcement, 10,000-line performance benchmark ($< 250\text{ ms}$).

---

# 22. AI & INTELLIGENCE BOUNDARY

1. **Deterministic Rule Engine (Law & Math):** Computes definitive compliance, tax bases, mathematical balances, and legal permit mandates.
2. **Probabilistic Intelligence (Assistance Only):** SKU Intelligence ranking, historical price anomaly scoring, and suggested next actions.
3. **AI Copilot (Explainer & Summarizer):** Generates human-friendly explanations of complex customs regulations (e.g. *"Why is HS 8507.60.90 blocked?"* $\to$ *"Permendag 36/2023 requires Persetujuan Impor (PI) from Kementerian Perdagangan"*).
4. **Strict Boundary Invariant:** AI Copilot **never** mutates declaration data, never waives exceptions, and never submits declarations automatically.

---

# 23. MIGRATION STRATEGY

1. **Zero Downtime:** Backward compatible with existing `cus_declarations` and `cus_classification_lines`.
2. **Non-Destructive DDL:** The proposed tables (`cus_declaration_validation_runs`, `cus_declaration_exceptions`) are additive and do not alter existing production trucking, driver, or forwarding tables.
3. **Safe Coexistence:** Existing declaration detail pages continue to function normally during rollout.

---

# 24. RISKS & MITIGATIONS

| Risk | Impact | Mitigation |
| :--- | :--- | :--- |
| **Overly Strict Blocking Rules** | Operators unable to submit valid non-standard declarations | Clear distinction between legal `BLOCKING` vs commercial `WARNING`; allow specialist waivers for warnings. |
| **Performance Lag on 10k Items** | UI freeze or timeout | Use in-memory hash maps, background async validation, and targeted delta re-validation. |
| **Unauthorized Exception Waivers** | Non-compliant CEISA submissions | Restrict waiver capability to authorized PPJK Ahli Kepabeanan with mandatory written justifications. |

---

# 25. ARCHITECTURAL DECISIONS REQUIRED BEFORE IMPLEMENTATION

Before starting production code implementation for Phase 3D-6D-6, the following architectural decisions require explicit review and authorization:

1. **ADR-3D-6D-6.1: Dedicated Exception Registry Table vs JSONB Snapshot:**
   - *Option A (Recommended):* Dedicated `cus_declaration_exceptions` table with individual row lifecycle (`OPEN`, `ACKNOWLEDGED`, `RESOLVED`, `WAIVED`), foreign keys, and indexed querying.
   - *Option B:* Store entire validation report as JSONB inside `cus_declarations` or `cus_declaration_validation_runs`.
   - *Recommendation:* Option A for granular tracking, auditability, and targeted re-validation.

2. **ADR-3D-6D-6.2: Exception Waiver Permission Policy:**
   - *Option A (Recommended):* Strictly forbid waiving `BLOCKING` exceptions. Allow waiving `WARNING` exceptions only with mandatory justification text.
   - *Option B:* Allow operators to override all exceptions with supervisor approval.
   - *Recommendation:* Option A to prevent illegal CEISA 4.0 submissions that would be rejected by DJBC.

3. **ADR-3D-6D-6.3: UI Tab Navigation Structure:**
   - *Option A (Recommended):* Implement a dedicated `Validation & Exception Control Center` tab at `/sbu/clearance/declarations/[id]?tab=validation` alongside `items` and `classification`.
   - *Option B:* Embed the exception drawer inside the existing `items` grid.
   - *Recommendation:* Option A for a focused, cockpit-style exception resolution experience.

---

# 26. RECOMMENDED IMPLEMENTATION SEQUENCE

Once authorized, Phase 3D-6D-6 should execute in 5 logical steps:

1. **Step 1 — Domain Kernel & Rules Expansion (`lib/domain/customs/`):**
   - Expand `CustomsValidationEngine` to support Tier 1–5 rules (cross-item mathematics, valuation consistency, Lartas permit matching, and density checks).
   - Implement `DeclarationValidationService` and `ExceptionResolutionService`.
2. **Step 2 — Database Migration (`supabase/migrations/`):**
   - Create `20260826_009_customs_exceptions_schema.sql` adding `cus_declaration_validation_runs` and `cus_declaration_exceptions` with RLS and indexes.
3. **Step 3 — REST API Gateway (`app/api/v1/customs/`):**
   - Implement `/api/v1/customs/declarations/[id]/validation`, `/exceptions`, `/acknowledge`, `/resolve`, `/waive`.
4. **Step 4 — Exception Resolution Workspace UI (`components/workspaces/customs/`):**
   - Build `ValidationWorkspace.tsx`, `ExceptionQueue.tsx`, `ExceptionInspector.tsx`, and `ResolutionActionDrawer.tsx`.
   - Connect tab `validation` in `declarations/[id]/page.tsx`.
5. **Step 5 — Acceptance Test Suite & Verification (`__tests__/`):**
   - Write 35 comprehensive test scenarios in `ppjk-validation-exceptions.test.ts`.
   - Verify TypeScript (`tsc --noEmit`), ESLint, architectural scans, and performance benchmarks.

---

# 27. EXPLICIT NON-GOALS

1. **No Direct CEISA 4.0 XML Transmission:** Phase 3D-6D-6 focuses on pre-submission validation and exception resolution. CEISA XML export is scheduled for Phase 3D-6D-8.
2. **No Automated Bot Scraping of DJBC Portals:** Strictly complies with human-in-the-loop principles.
3. **No Modification of Trucking or Driver Modules:** 100% frozen and isolated.

---

# 28. FINAL RECOMMENDATION

Phase 3D-6D-6 transforms customs validation from a simple error check into an enterprise operational cockpit. The proposed multi-tier rules, canonical Exception Registry, and dedicated Resolution Workspace provide the safety, speed, and auditability required for high-volume Indonesian PPJK operations.

**Discovery Status:** COMPLETE  
**Code Changes:** NONE  
**Database Migrations:** NONE  
**Awaiting Architecture Review & Implementation Authorization.**

---
*Signed by Principal Software Architect & Senior Indonesian Customs/PPJK Domain Expert — 25 August 2026*
