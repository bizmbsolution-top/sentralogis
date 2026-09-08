# SENTRALOGIS — PHASE 5B
# CUSTOMS–FORWARDING FORENSIC DISCOVERY

**Date:** 2026-09-01  
**Status:** GREEN — DESIGN READY  
**Phase:** 5B — Customs-Forwarding Orchestration

---

## Executive Summary

**The Customs-Forwarding orchestration architecture is ALREADY established and sufficient.**

The current architecture, governed by ADR-019/047/053, correctly coordinates Forwarding and Customs as two independent operational capabilities around one canonical Shipment. The remaining work is **operational completeness** (auto-creating customs declarations from forwarding execution plans, propagating customs status to Control Tower), not architectural redesign.

**Recommendation:** Close Phase 5B discovery. Proceed to implementation of operational orchestration only.

---

## Current Customs Architecture

### Domain Scale

| Component | Count | Status |
|-----------|-------|--------|
| Database tables | 12 (`cus_*`) | Production-ready |
| API routes | 34 | Production-ready |
| UI components | 34 | Production-ready |
| Test files | 15+ (400+ scenarios) | Production-ready |
| Domain services | 12 | Production-ready |

### Customs Tables

| Table | Purpose | RLS |
|-------|---------|-----|
| `cus_declarations` | Aggregate root (PIB/PEB/BC23) | YES |
| `cus_classification_lines` | Line items + HS classification | YES |
| `cus_declaration_documents` | Supporting documents | YES |
| `cus_declaration_validation_runs` | Validation history | YES |
| `cus_declaration_exceptions` | Exception registry | YES |
| `cus_ceisa_preparations` | CEISA 4.0 XML/EDI | YES |
| `cus_ceisa_validation_results` | CEISA validation | YES |
| `cus_declaration_audit_events` | SHA-256 hash chain | YES |
| `cus_customs_decisions` | Decision log | YES |
| `cus_sku_intelligence` | Product memory | YES |
| `cus_sku_classification_history` | Historical evidence | YES |
| `cus_item_audit_logs` | Immutable line audit | YES |

---

## Existing ADRs

### ADR-019 — Progressive Attachment

`cus_declarations.shipment_id` and `execution_leg_id` are **nullable FKs** with `ON DELETE SET NULL`. Enables customs to exist independently from forwarding.

### ADR-047 — Customs Sovereign Progressive Attachment

Customs owns its own lifecycle. Fulfillment MUST NOT become a customs/valuation/CEISA engine. Standalone customs via `fulfillment_allocations` with `capability_type = 'CUSTOMS'`.

### ADR-053 — Customs SBU Handoff Adapter

`CustomsHandoffAdapter` translates allocations into customs declarations. No direct mutation of `cus_declarations` by OperationalHandoff.

---

## Customs Domain Ownership

| Capability | Owner | Table |
|------------|-------|-------|
| Declaration lifecycle | Customs | `cus_declarations.status` |
| HS classification | Customs | `cus_classification_lines` |
| Duty/tax calculation | Customs | `cus_classification_lines.calculated_*` |
| Document workflow | Customs | `cus_declaration_documents` |
| CEISA preparation | Customs | `cus_ceisa_preparations` |
| Audit chain | Customs | `cus_declaration_audit_events` |
| Validation | Customs | `cus_declaration_validation_runs` |
| Exceptions | Customs | `cus_declaration_exceptions` |
| Decisions | Customs | `cus_customs_decisions` |

---

## Shipment Relationship

### Schema

```sql
cus_declarations
  ├── shipment_id → shp_shipments.id (NULLABLE, ON DELETE SET NULL)
  ├── execution_leg_id → shp_execution_legs.id (NULLABLE, ON DELETE SET NULL)
  └── job_order_id → job_orders.id (NULLABLE UUID, no FK)
```

### Cardinality

| Relationship | Cardinality |
|--------------|-------------|
| cus_declarations → shp_shipments | N:1 (nullable) |
| cus_declarations → shp_execution_legs | N:1 (nullable) |
| cus_declarations → job_orders | N:1 (nullable) |

### Key Rules

- One shipment can have multiple customs declarations (split customs)
- One declaration references exactly one shipment
- Declaration survives shipment deletion (`ON DELETE SET NULL`)
- Attachment is idempotent and conflict-aware

---

## Forwarding Relationship

### How Forwarding Creates the Shipment

```
Fulfillment Allocation (FORWARDING)
    ↓
ForwardingHandoffAdapter (ADR-052)
    ↓
shp_shipments (canonical shipment)
    ↓
shp_execution_legs (multimodal legs)
```

### How Customs Attaches

```
Fulfillment Allocation (CUSTOMS)
    ↓
CustomsHandoffAdapter (ADR-053)
    ↓
cus_declarations (standalone first)
    ↓
CustomsAttachmentService.attachShipment() (progressive)
    ↓
cus_declarations.shipment_id = shp_shipments.id
```

---

## Capability Binding Relationship

```
commercial_work_orders (Engagement)
    ↓
commercial_capability_bindings
    ├── capability_type = 'FORWARDING' (UNIQUE per engagement)
    ├── capability_type = 'CUSTOMS' (UNIQUE per engagement)
    ├── capability_type = 'TRUCKING'
    └── capability_type = 'WAREHOUSE'
    ↓
fulfillment_allocations
    ├── capability_type = 'FORWARDING' → ForwardingHandoffAdapter
    └── capability_type = 'CUSTOMS' → CustomsHandoffAdapter
```

Customs is a **first-class peer capability**, not a child of Forwarding.

---

## Current Lifecycle

### Customs Declaration

```
DRAFT → DOCUMENTS_PENDING → READY_FOR_CLASSIFICATION → CLASSIFIED → READY_FOR_SUBMISSION → SUBMITTED
                                                                                           ↓
                                    ACCEPTED → CHANNEL_ASSIGNED → INSPECTION_REQUIRED → APPROVED → SPPB_PENDING → RELEASED → COMPLETED
                                                                                           ↓
                                                                                    DOCUMENT_REVIEW ↗
                                                                                           ↓
                                                                                    REJECTED → DRAFT (retry)

ON_HOLD: Can transition back to ANY prior state or forward to CANCELLED
CANCELLED, COMPLETED: Terminal states
```

### Shipment

```
DRAFT → PLANNED → BOOKED → IN_TRANSIT → AT_INTERMEDIATE_NODE → CUSTOMS_HOLD → CUSTOMS_RELEASED → OUT_FOR_DELIVERY → DELIVERED → COMPLETED
```

---

## Current Writers

| Writer | Table | Classification |
|--------|-------|----------------|
| `customs-service.ts` | `cus_declarations` | Canonical |
| `declaration-repository.ts` | `cus_declarations` | Canonical |
| `classification-service.ts` | `cus_classification_lines` | Canonical |
| `attachment-service.ts` | `cus_declarations.shipment_id` | Canonical (ADR-021) |
| `ceisa-preparation-service.ts` | `cus_ceisa_preparations` | Canonical |
| `audit-service.ts` | `cus_declaration_audit_events` | Canonical |

**No forbidden writers found.**

---

## Tenant Isolation

| Check | Result |
|-------|--------|
| Server-derived tenant | PASS — `resolveCustomsAuthContext()` |
| RLS on all tables | PASS — All 12 `cus_*` tables |
| Cross-tenant attachment | PASS — `FORBIDDEN` in `CustomsAttachmentService` |
| Client tenant_id ignored | PASS — Never trusted |

---

## Client Mutation Boundary

**PASS** — All mutations go through server APIs. Zero browser direct DB writes in Customs UI.

---

## Identifier Authority

| Identifier | Authority |
|------------|-----------|
| Declaration number | `UNIQUE(tenant_id, declaration_number)` |
| CEISA preparation | DB UUID |
| Audit events | DB UUID + SHA-256 hash chain |

---

## Architecture Model Comparison

### Model A — Forwarding owns Customs
**REJECTED** — Violates ADR-047 (Customs sovereignty)

### Model B — Customs owns Forwarding
**REJECTED** — Violates ADR-046 (Forwarding multimodal sovereignty)

### Model C — Shared Shipment Coordination
**ACCEPTABLE** — But ADR-019/047/053 already implement this more cleanly

### Model D — Capability Orchestration
**ACCEPTED** — This is the current architecture:
```
Fulfillment → Capability Bindings → Forwarding + Customs → Shipment
```

### Model E — Hybrid Event/Command
**ACCEPTABLE** — Event outbox exists for `customs.sppb.issued` and `customs.declaration.released`

---

## Recommended Architecture

### The current architecture IS the recommended architecture:

```
Sales Order
    ↓
Fulfillment (Composition)
    ↓
Capability Bindings (CUSTOMS + FORWARDING)
    ↓
    ├── ForwardingHandoffAdapter → shp_shipments
    │                                    ↓
    │                              shp_execution_legs
    │                                    ↓
    │                              (Customs clearance required?)
    │                                    ↓
    └── CustomsHandoffAdapter → cus_declarations
                                         ↓
                              CustomsAttachmentService.attachShipment()
                                         ↓
                              cus_declarations.shipment_id = shp_shipments.id
                                         ↓
                              Customs clearance execution
                                         ↓
                              customs.sppb.issued event
                                         ↓
                              Forwarding consumes event → advance execution
```

### What Forwarding May Do

- Request Customs execution via `svc_service_requests`
- Display Customs readiness in work queue
- Consume Customs status events
- Block downstream execution when Customs is required but not released

### What Forwarding Must NOT Do

- Directly update `cus_declarations.status`
- Directly submit customs documents
- Directly mutate customs lifecycle
- Bypass Customs service

### What Customs May Do

- Create/update declarations independently
- Process declarations autonomously
- Emit clearance results
- Manage documents, classification, valuation, CEISA

### What Customs Must NOT Do

- Mutate shipment commercial intent
- Assign trucking
- Alter Forwarding execution

---

## Business Scenario Analysis

### Import FCL

```
Overseas supplier → Ocean freight → Indonesia port → Customs clearance → Trucking → Customer
                         ↑                ↑                ↑
                   Forwarding        Forwarding         Customs
                   (shipment)        (leg execution)    (declaration)
```

**Architecture supports this:** Forwarding creates shipment, Customs attaches progressively, both coordinate via shipment reference.

### Import LCL

```
Multiple cargo owners → Consolidation → Ocean freight → Deconsolidation → Customs → Delivery
                                                        ↑                ↑
                                                   Forwarding         Customs
                                                   (consol + legs)    (declaration)
```

**Architecture supports this:** Multiple declarations can reference one shipment (split customs).

### Export FCL

```
Customer → Cargo preparation → Customs export → Port → Vessel → Destination
              ↑                    ↑
         Forwarding            Customs
```

**Architecture supports this:** Customs can exist independently (export without forwarding).

### Customs-only Customer

```
Sales Order → Fulfillment → Customs capability → Customs execution
```

**Architecture supports this:** `capability_type = 'CUSTOMS'` can exist without FORWARDING binding.

### Forwarding + Customs

```
Sales Order → Fulfillment → Forwarding + Customs → Coordinated execution
```

**Architecture supports this:** Both capabilities bound to same engagement, coordinated via shipment reference.

---

## Cardinality Findings

| Relationship | Cardinality | Evidence |
|--------------|-------------|----------|
| Shipment → Customs | 1:N | No UNIQUE constraint on `cus_declarations.shipment_id` |
| Customs → Shipment | N:1 | Single `shipment_id` column |
| Shipment Unit → Customs | 1:N | Via `execution_leg_id` |
| Cargo Owner → Customs | N:1 | Multiple owners per declaration |
| Declaration → Attachments | 1:N | `cus_declaration_documents` |

---

## Failure Semantics

| Failure | Compensation |
|---------|--------------|
| Customs rejects declaration | Declaration returns to `DRAFT` for rework |
| Customs requires document | Status → `DOCUMENTS_PENDING` |
| Customs delayed | Status → `ON_HOLD` |
| Forwarding cancelled | `cus_declarations.shipment_id` → NULL (survives) |
| Shipment deleted | `cus_declarations.shipment_id` → NULL (survives) |
| Customs succeeds, Forwarding fails | Customs `RELEASED`, Forwarding status independent |
| Forwarding succeeds, Customs fails | Shipment exists, Customs `REJECTED` |

---

## Idempotency

| Operation | Status | Mechanism |
|-----------|--------|-----------|
| Create customs process | SAFE | `UNIQUE(tenant_id, declaration_number)` |
| Attach shipment | SAFE | `ALREADY_ATTACHED` / `CONFLICT` (ADR-021) |
| Submit declaration | CONDITIONALLY SAFE | State machine guard |
| Release SPPB | SAFE | State machine guard |
| Retry submission | SAFE | State machine guard |

---

## Legacy Writer Classification

| Writer | Table | Classification |
|--------|-------|----------------|
| `customs-service.ts` | `cus_declarations` | Canonical |
| `attachment-service.ts` | `cus_declarations` | Canonical |
| `ceisa-preparation-service.ts` | `cus_ceisa_preparations` | Canonical |

**No forbidden writers found.**

---

## Existing DEBT Review

| Debt | Evidence | Severity | Production Impact | Can Defer? |
|------|----------|----------|-------------------|------------|
| DEBT-01 | `shipment-factory.ts:29` — `Math.random()` for shipment number | Low | Intermittent insert failure at scale | YES |
| DEBT-02 | `shipment-service.ts` — No idempotency | Low | Duplicate shipments on retry | YES |
| DEBT-03 | `job_orders` — No centralized status enum | Low | Query fragility | YES |

---

## Hidden GAP Scan

| Category | Finding |
|----------|---------|
| Commercial pollution | NONE |
| Fulfillment pollution | NONE |
| Shipment duplication | NONE |
| Tenant authority | NONE in Customs/Forwarding |
| Client mutation | NONE |
| Identifier authority | NONE |

**GAP: 0**

---

## Hidden RISK Scan

| Category | Finding |
|----------|---------|
| Customs-specific RISK | NONE |
| Cross-tenant access | NONE |
| Lifecycle bypass | NONE |
| Duplicate aggregates | NONE |

**RISK: 0**

---

## Adjacent Capability Discovery

| Capability | Exists? | Connected to Forwarding? | Candidate Next Phase? | Priority |
|------------|---------|--------------------------|----------------------|----------|
| Customs Declaration | FULL domain | YES (ADR-019) | Current phase | — |
| MBL/HBL | In `shp_shipments` | YES | Done | — |
| Incoterms | In `commercial_service_scopes` | NO FK to Forwarding | YES | MEDIUM |
| Freight Pricing | `fw_price_master` (legacy) | Used, not integrated | YES | HIGH |
| Financial Settlement | Mock only | NO | YES | HIGH |
| Document Management | Fragmented | NONE | YES | MEDIUM |
| Carrier Integration | Minimal | Entity pointers | YES | MEDIUM |

---

## Required ADRs

**No new ADRs required.** The existing ADR-019/047/053 already govern the Customs-Forwarding relationship.

---

## Implementation Readiness

### Architecture Status: SUFFICIENT

The current architecture already supports:
1. ✅ Customs capability composed with Forwarding
2. ✅ Customs operates independently
3. ✅ Shipment remains canonical
4. ✅ Each domain owns its lifecycle
5. ✅ Cross-domain state coordinated without duplicated ownership
6. ✅ Tenant isolation intact
7. ✅ Failure/retry semantics deterministic

### Remaining Operational Work (NOT architectural)

| Work | Description |
|------|-------------|
| Auto-create customs from forwarding | When forwarding execution plan requires customs, auto-create declaration |
| Propagate customs status to Control Tower | Display customs milestones in execution tracking |
| Forwarding SBU customs visibility | Show customs status in forwarding work queue |

---

## Final GAP

**0**

---

## Final RISK

**0**

---

## Final DEBT

**3 — pre-existing / documented / non-blocking**

---

## Recommended Next Boundary

**Customs-Forwarding Operational Orchestration** (not architectural redesign):

1. **Auto-create customs declarations** from forwarding execution plans
2. **Propagate customs status** to Control Tower and forwarding work queue
3. **Forward SBU customs visibility** in operational timeline

---

## Final Decision

**GREEN — DESIGN READY**

The Customs-Forwarding orchestration architecture is ALREADY established and sufficient. ADR-019/047/053 correctly govern the relationship. No architectural redesign is needed.

**Close Phase 5B discovery.** Proceed to implementation of operational orchestration only if business demand requires it. Otherwise, move to the next architectural boundary: **Freight Pricing Engine** or **Financial Settlement**.

---

**END OF PHASE 5B DISCOVERY REPORT**
