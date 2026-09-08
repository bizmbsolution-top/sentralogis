# SENTRALOGIS — PHASE 4A DISCOVERY REPORT
## STANDALONE & INTEGRATED CUSTOMS CONTRACTS + PROGRESSIVE CAPABILITY COMPOSITION

**Document:** `docs/architecture/SENTRALOGIS_PHASE4A_DISCOVERY_REPORT.md`  
**Date:** 2026-08-26  
**Status:** DISCOVERY COMPLETE — IMPLEMENTATION NOT STARTED  
**Production Code Changes:** NONE  
**Database Migrations:** NONE  
**Baseline Tests:** 520 / 520 PASS (verified)

---

## 1. EXECUTIVE SUMMARY

Phase 4A discovery has been completed with a thorough inspection of:

- **13 customs domain tables** (`cus_*`)
- **3 commercial domain tables** (`commercial_work_orders`, `commercial_service_scopes`, `commercial_line_items`)
- **12 forwarding/shipment tables** (`shp_*`)
- **1 cross-domain service request table** (`svc_service_requests`)
- **15 customs domain service files** + 2 sub-modules (audit, CEISA)
- **14 test files** (416 customs tests + 104 other = 520 total)
- **All customs API routes** under `/api/v1/customs/`

### Key Discovery Conclusion

> **Customs Clearance is ALREADY architecturally standalone.**

The existing `cus_declarations` table has **zero** columns named `shipment_id`, `execution_leg_id`, or `job_order_id`. The `CustomsDeclaration` TypeScript interface contains **zero** references to forwarding or trucking. All 416 customs tests already operate **without** any forwarding dependency.

The primary work of Phase 4A is therefore **not a rescue operation** but rather:

1. **Formalizing** the standalone capability into a canonical `CommercialEngagement` + `CapabilityBinding` model
2. **Adding optional cross-domain reference columns** to `cus_declarations` for progressive composition
3. **Defining application-level attachment commands** (idempotent, tenant-safe, auditable)
4. **Proving** all 6 commercial permutations through comprehensive test coverage

---

## 2. CURRENT-STATE SCHEMA ANALYSIS

### 2.1 Customs Domain Tables (13 tables — ALL standalone)

| Table | Migration | FK to Forwarding? | FK to Trucking? | Standalone? |
|-------|-----------|-------------------|-----------------|-------------|
| `cus_declarations` | `20260826_005` | **NO** | **NO** | ✅ YES |
| `cus_classification_lines` | `20260826_005` + `008` | NO | NO | ✅ |
| `cus_declaration_documents` | `20260826_008` + `010` | NO | NO | ✅ |
| `cus_declaration_validation_runs` | `20260826_009` | NO | NO | ✅ |
| `cus_declaration_exceptions` | `20260826_009` | NO | NO | ✅ |
| `cus_ceisa_preparations` | `20260826_011` | NO | NO | ✅ |
| `cus_ceisa_validation_results` | `20260826_011` | NO | NO | ✅ |
| `cus_declaration_audit_events` | `20260826_012` | NO | NO | ✅ |
| `cus_customs_decisions` | `20260826_012` | NO | NO | ✅ |
| `cus_sku_intelligence` | `20260826_008` | NO | NO | ✅ |
| `cus_sku_classification_history` | `20260826_008` | NO | NO | ✅ |
| `cus_item_audit_logs` | `20260826_008` | NO | NO | ✅ |
| `md_customs_hs_codes` | `20260826_008` | NO | NO | ✅ (global) |

### 2.2 `cus_declarations` Current Column Analysis

```
id                    UUID PK NOT NULL
tenant_id             UUID NOT NULL → md_tenants(id)
declaration_number    TEXT NOT NULL (26-digit AJU)
service_request_id    UUID NULLABLE → svc_service_requests(id) ON DELETE SET NULL
work_order_id         UUID NULLABLE → commercial_work_orders(id) ON DELETE SET NULL
importer_id           UUID NOT NULL → md_entities(id)
ppjk_id               UUID NULLABLE → md_entities(id)
declaration_type      cus_declaration_type NOT NULL DEFAULT 'PIB_IMPORT'
customs_office_code   TEXT NOT NULL
billing_code          TEXT NULLABLE
total_duty_and_tax    NUMERIC(18,2) DEFAULT 0
ntpn_payment_ref      TEXT NULLABLE
paid_at               TIMESTAMPTZ NULLABLE
channel               cus_channel_type NULLABLE
sppb_number           TEXT NULLABLE
sppb_date             DATE NULLABLE
status                TEXT NOT NULL DEFAULT 'DRAFT'
version_no            INTEGER NOT NULL DEFAULT 1
created_at            TIMESTAMPTZ NOT NULL
updated_at            TIMESTAMPTZ NOT NULL
```

> **Critical Finding:** `shipment_id`, `execution_leg_id`, and `job_order_id` do NOT exist on `cus_declarations`. This is the strongest possible foundation for standalone customs.

### 2.3 Commercial Domain Tables (3 tables — existing canonical structure)

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `commercial_work_orders` | Customer commercial agreement | `wo_number`, `customer_id`, `service_scope_id`, `status`, `currency`, `total_agreed_revenue` |
| `commercial_service_scopes` | Service scope template | `scope_code`, `scope_name`, `incoterm`, `included_services[]`, `excluded_services[]` |
| `commercial_line_items` | Priced service lines | `work_order_id`, `service_product_sku`, `unit_sell_price`, `total_sell_price` |

> **Decision Required:** The existing `commercial_work_orders` table already serves as a commercial root. The question is whether to (A) extend it with capability-binding semantics, or (B) introduce a new `commercial_engagements` aggregate alongside it. See ADR-018 below.

### 2.4 Forwarding/Shipment Domain Tables (12 tables — independent)

| Table | Key Foreign Keys |
|-------|-----------------|
| `shp_shipments` | `work_order_id NOT NULL → commercial_work_orders(id)` |
| `shp_execution_legs` | `shipment_id NOT NULL → shp_shipments(id)` |
| `shp_units` / subtypes | `shipment_id NOT NULL → shp_shipments(id)` |
| `shp_execution_plans` | `shipment_id NOT NULL → shp_shipments(id)` |
| `shp_milestones` | `shipment_id NOT NULL → shp_shipments(id)` |
| `shp_exceptions` | `shipment_id NOT NULL → shp_shipments(id)` |

> **Key Finding:** Forwarding tables do NOT reference customs (`cus_declarations`). The two domains are fully decoupled at schema level today.

### 2.5 Cross-Domain Service Request Contract

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `svc_service_requests` | Cross-domain service binding | `source_domain`, `target_domain`, `shipment_id NULLABLE`, `execution_leg_id NULLABLE`, `work_order_id NULLABLE` |

> **Observation:** `svc_service_requests` already supports nullable `shipment_id` and `execution_leg_id`. The customs declaration already has an optional `service_request_id` FK. This is a viable channel for customs↔forwarding binding without direct coupling.

---

## 3. CURRENT DEPENDENCY GRAPH

```text
                           ┌─────────────────────────────────┐
                           │    commercial_work_orders        │
                           │    commercial_service_scopes     │
                           │    commercial_line_items         │
                           └────────┬──────────┬─────────────┘
                                    │          │
                     ┌──────────────┘          └──────────────┐
                     ▼                                         ▼
          ┌─────────────────────┐                   ┌──────────────────────┐
          │   shp_shipments     │                   │   cus_declarations   │
          │   shp_units         │                   │   cus_class_lines    │
          │   shp_exec_legs     │                   │   cus_documents      │
          │   shp_milestones    │                   │   cus_exceptions     │
          │   shp_exec_plans    │                   │   cus_ceisa_preps    │
          │   shp_exceptions    │                   │   cus_audit_events   │
          └─────────┬───────────┘                   │   cus_decisions      │
                    │                               └──────────┬───────────┘
                    ▼                                           │
          ┌─────────────────────┐                               │
          │ svc_service_requests│◄──────────────────────────────┘
          │ (cross-domain)      │      (optional service_request_id)
          └─────────────────────┘
```

### Dependencies That ALREADY Support Standalone Customs

| Concern | Status |
|---------|--------|
| `cus_declarations.shipment_id` | **DOES NOT EXIST** — ✅ Customs is standalone |
| `cus_declarations.execution_leg_id` | **DOES NOT EXIST** — ✅ |
| `cus_declarations.job_order_id` | **DOES NOT EXIST** — ✅ |
| `cus_declarations.work_order_id` | **EXISTS but NULLABLE** — ✅ Customs can operate without a commercial WO |
| `cus_declarations.service_request_id` | **EXISTS but NULLABLE** — ✅ |
| Domain code imports from forwarding | **ZERO** — ✅ |
| Domain code references `shipment_id` | **ZERO** in entire `lib/domain/customs/` — ✅ |
| API routes requiring `shipment_id` | **ZERO** in `/api/v1/customs/` — ✅ |
| Tests assuming shipment presence | **ZERO** — all 416 customs tests are standalone — ✅ |

---

## 4. TARGET-STATE DOMAIN GRAPH

```text
                     ┌──────────────────────────────────────┐
                     │        COMMERCIAL ENGAGEMENT         │
                     │  (customer_id, tenant_id, status)    │
                     └────────────┬─────────────────────────┘
                                  │
                    ┌─────────────┼─────────────┬───────────────────┐
                    ▼             ▼             ▼                   ▼
           ┌────────────┐ ┌────────────┐ ┌────────────┐    ┌────────────┐
           │ CAPABILITY │ │ CAPABILITY │ │ CAPABILITY │    │ CAPABILITY │
           │  CUSTOMS   │ │ FORWARDING │ │  TRUCKING  │    │ WAREHOUSE  │
           └──────┬─────┘ └──────┬─────┘ └──────┬─────┘    └──────┬─────┘
                  │              │              │                  │
                  ▼              ▼              ▼                  ▼
          ┌──────────────┐ ┌──────────┐ ┌───────────┐    ┌────────────┐
          │ cus_         │ │ shp_     │ │ job_      │    │ wh_        │
          │ declarations │ │ shipments│ │ orders    │    │ operations │
          └──────────────┘ └──────────┘ └───────────┘    └────────────┘
                  ▲              ▲              ▲
                  │              │              │
                  └──── optional cross-domain references ────┘
```

Capabilities are **peers**, not a hierarchy. No capability requires any other capability.

---

## 5. COMMERCIAL ENGAGEMENT MODEL

### 5.1 ADR-018: Commercial Engagement vs Commercial Work Order

**Context:** The existing `commercial_work_orders` table already serves as the commercial root. However, it is tightly coupled to `commercial_service_scopes` which implies a single predefined service scope per work order.

**Decision: OPTION B — Introduce `commercial_engagements` as a lightweight parent**

| Criterion | Option A: Extend `commercial_work_orders` | Option B: New `commercial_engagements` |
|-----------|-------------------------------------------|---------------------------------------|
| Backward compatibility | HIGH (no new tables) | HIGH (additive only) |
| Semantic clarity | MEDIUM (WO implies operational) | HIGH (engagement = commercial agreement) |
| Progressive composition | AWKWARD (WO has single `service_scope_id`) | CLEAN (engagement → many capabilities) |
| Existing FK impact | Requires adding columns to existing table | Zero changes to existing WO table |
| Capability binding | Would need a junction table anyway | Natural parent for capability bindings |

**Rationale:** A `CommercialEngagement` represents "why the customer engaged Sentralogis" and is the natural parent for progressive capability attachment. The existing `commercial_work_orders` can remain as operational WOs generated per capability. Each engagement may produce zero or more WOs.

### 5.2 Proposed `commercial_engagements` Schema

```sql
CREATE TABLE IF NOT EXISTS public.commercial_engagements (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES public.md_tenants(id),
  engagement_number     TEXT NOT NULL,
  customer_id           UUID NOT NULL REFERENCES public.md_entities(id),
  status                TEXT NOT NULL DEFAULT 'ACTIVE',
    -- DRAFT, ACTIVE, IN_PROGRESS, COMPLETED, CANCELLED
  commercial_notes      TEXT,
  billing_currency      TEXT NOT NULL DEFAULT 'IDR',
  total_estimated_value NUMERIC(18,2) DEFAULT 0,
  payment_terms_days    INTEGER DEFAULT 30,
  effective_from        DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to          DATE,
  version_no            INTEGER NOT NULL DEFAULT 1,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by            UUID REFERENCES auth.users(id),
  CONSTRAINT uq_com_engagement_number UNIQUE (tenant_id, engagement_number)
);
```

### 5.3 Proposed `commercial_capability_bindings` Schema

```sql
CREATE TABLE IF NOT EXISTS public.commercial_capability_bindings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES public.md_tenants(id),
  engagement_id     UUID NOT NULL REFERENCES public.commercial_engagements(id) ON DELETE CASCADE,
  capability_type   TEXT NOT NULL,
    -- 'CUSTOMS', 'FORWARDING', 'TRUCKING', 'WAREHOUSE'
  status            TEXT NOT NULL DEFAULT 'ACTIVE',
    -- 'ACTIVE', 'SUSPENDED', 'COMPLETED', 'CANCELLED'
  scope             JSONB DEFAULT '{}'::jsonb,
  pricing           JSONB DEFAULT '{}'::jsonb,
  activated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at      TIMESTAMPTZ,
  deactivated_at    TIMESTAMPTZ,
  metadata          JSONB DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_engagement_capability UNIQUE (tenant_id, engagement_id, capability_type)
);
```

---

## 6. STANDALONE CUSTOMS LIFECYCLE

```text
                     ┌─────────────────────────────────────┐
                     │ 1. Customer requests Customs Service │
                     └──────────────┬──────────────────────┘
                                    ▼
                     ┌─────────────────────────────────────┐
                     │ 2. Create CommercialEngagement       │
                     │    + CapabilityBinding(CUSTOMS)      │
                     └──────────────┬──────────────────────┘
                                    ▼
                     ┌─────────────────────────────────────┐
                     │ 3. Create CustomsDeclaration         │
                     │    engagement_id = engagement.id     │
                     │    shipment_id   = NULL               │
                     │    job_order_id  = NULL               │
                     └──────────────┬──────────────────────┘
                                    ▼
                     ┌─────────────────────────────────────┐
                     │ 4. Full PPJK Workbench Lifecycle     │
                     │    Classification → Validation →     │
                     │    Documents → Valuation → Lartas →  │
                     │    CEISA Preparation → Decisions →   │
                     │    Audit Trail                       │
                     └──────────────┬──────────────────────┘
                                    ▼
                     ┌─────────────────────────────────────┐
                     │ 5. SPPB Release                      │
                     │    Engagement status = COMPLETED      │
                     │    CapabilityBinding(CUSTOMS) =       │
                     │      COMPLETED                       │
                     └─────────────────────────────────────┘
```

**No Shipment. No Forwarding. No Trucking. Fully operational.**

---

## 7. INTEGRATED CUSTOMS LIFECYCLE (FORWARDING + CUSTOMS)

```text
Day 1: Shipment → CustomsDeclaration created
        cus_declarations.engagement_id = engagement.id
        cus_declarations.shipment_id   = shipment.id

Day 2: PPJK Workbench processes declaration (unchanged)

Day 3: SPPB Released → Event: CustomsReleased
        Trucking capability may be attached
```

---

## 8. PROGRESSIVE COMPOSITION LIFECYCLE

### Day 1: Customs-Only

```text
CommercialEngagement (ENG-001)
  └── CapabilityBinding: CUSTOMS (ACTIVE)

CustomsDeclaration (AJU-040300-...)
  └── engagement_id = ENG-001
  └── shipment_id   = NULL
  └── job_order_id  = NULL
```

### Day 2: + Trucking

```text
CommercialEngagement (ENG-001)
  ├── CapabilityBinding: CUSTOMS (ACTIVE)
  └── CapabilityBinding: TRUCKING (ACTIVE)   ← NEW

CustomsDeclaration (AJU-040300-...)
  └── engagement_id = ENG-001
  └── shipment_id   = NULL
  └── job_order_id  = JO-001               ← ATTACHED (not recreated)
```

### Day 3: + Origin Freight

```text
CommercialEngagement (ENG-001)
  ├── CapabilityBinding: CUSTOMS (ACTIVE)
  ├── CapabilityBinding: TRUCKING (ACTIVE)
  └── CapabilityBinding: FORWARDING (ACTIVE) ← NEW

CustomsDeclaration (AJU-040300-...)
  └── engagement_id = ENG-001
  └── shipment_id   = SHP-001              ← ATTACHED (not recreated)
  └── job_order_id  = JO-001
```

**Zero data loss. Zero declaration recreation. All audit hashes preserved.**

---

## 9. RECOMMENDED SCHEMA CHANGES

### 9.1 New Tables (Additive)

| Table | Purpose | Risk |
|-------|---------|------|
| `commercial_engagements` | Commercial customer engagement root | LOW — new table, no existing dependencies |
| `commercial_capability_bindings` | Service capability registry per engagement | LOW — new table |

### 9.2 Column Additions to `cus_declarations` (Additive, NULLABLE)

| Column | Type | FK Target | Nullable? | Purpose |
|--------|------|-----------|-----------|---------|
| `engagement_id` | UUID | `commercial_engagements(id)` | YES | Links declaration to commercial engagement |
| `shipment_id` | UUID | `shp_shipments(id)` | YES | Optional forwarding reference |
| `execution_leg_id` | UUID | `shp_execution_legs(id)` | YES | Optional leg reference |
| `job_order_id` | UUID | `job_orders(id)` | YES | Optional trucking reference |

> **CRITICAL:** All new columns are NULLABLE with `ON DELETE SET NULL`. The existing standalone customs lifecycle is NOT affected. All 520 existing tests continue to pass because they never set these columns.

### 9.3 Index Additions

```sql
CREATE INDEX idx_cus_dec_engagement ON cus_declarations(engagement_id);
CREATE INDEX idx_cus_dec_shipment ON cus_declarations(shipment_id);
CREATE INDEX idx_cus_dec_jo ON cus_declarations(job_order_id);
CREATE INDEX idx_com_eng_tenant ON commercial_engagements(tenant_id);
CREATE INDEX idx_com_eng_customer ON commercial_engagements(customer_id);
CREATE INDEX idx_com_cap_engagement ON commercial_capability_bindings(engagement_id);
CREATE INDEX idx_com_cap_type ON commercial_capability_bindings(tenant_id, capability_type);
```

### 9.4 RLS Policies

All new tables will use the standard `tenant_id = public.get_my_tenant_id()` pattern.

---

## 10. RECOMMENDED API CONTRACTS

### 10.1 Commercial Engagement APIs

```
POST   /api/v1/commercial/engagements
  → Creates a new commercial engagement

GET    /api/v1/commercial/engagements
  → Lists engagements for current tenant

GET    /api/v1/commercial/engagements/[id]
  → Gets engagement with capability bindings

POST   /api/v1/commercial/engagements/[id]/capabilities
  → Adds a capability binding to an engagement

GET    /api/v1/commercial/engagements/[id]/capabilities
  → Lists capability bindings
```

### 10.2 Progressive Attachment APIs

```
POST   /api/v1/customs/declarations/[id]/attach-shipment
  Body: { shipment_id: UUID }
  → Sets cus_declarations.shipment_id (idempotent, tenant-safe)

POST   /api/v1/customs/declarations/[id]/attach-trucking
  Body: { job_order_id: UUID }
  → Sets cus_declarations.job_order_id (idempotent, tenant-safe)

POST   /api/v1/customs/declarations/[id]/attach-engagement
  Body: { engagement_id: UUID }
  → Sets cus_declarations.engagement_id (idempotent, tenant-safe)
```

### 10.3 Attachment Contract Requirements

| Requirement | Implementation |
|-------------|---------------|
| Idempotent | Setting same reference ID twice = no-op, returns success |
| Tenant-safe | Cross-tenant reference → 403 Forbidden |
| Authorization-aware | Requires authenticated user with customs write access |
| Auditable | Emits audit event to `cus_declaration_audit_events` |
| No aggregate duplication | Only sets FK column — does NOT recreate declaration |
| No destructive reassignment | Cannot overwrite existing non-null reference without explicit detach |
| Conflict detection | Attempting to set `shipment_id` when already set to different value → 409 Conflict |

---

## 11. RECOMMENDED SERVICE BOUNDARIES

### 11.1 New Domain Services

| Service | Location | Purpose |
|---------|----------|---------|
| `CommercialEngagementService` | `lib/domain/commercial/engagement-service.ts` | CRUD for engagements + capability bindings |
| `CapabilityBindingService` | `lib/domain/commercial/capability-binding-service.ts` | Capability lifecycle management |
| `CustomsAttachmentService` | `lib/domain/customs/attachment-service.ts` | Progressive cross-domain reference attachment |

### 11.2 Domain Boundary Rules

```text
CustomsAttachmentService:
  ✅ CAN read from commercial_engagements (verify tenant)
  ✅ CAN read from shp_shipments (verify tenant)
  ✅ CAN read from job_orders (verify tenant)
  ✅ CAN write to cus_declarations (set FK columns)
  ✅ CAN write to cus_declaration_audit_events (audit trail)
  ❌ CANNOT write to shp_shipments
  ❌ CANNOT write to job_orders
  ❌ CANNOT write to commercial_work_orders
```

---

## 12. MIGRATION RISKS

| Risk | Severity | Mitigation |
|------|----------|------------|
| Adding nullable columns to `cus_declarations` | **LOW** | `ALTER TABLE ADD COLUMN ... NULL` is non-blocking in PostgreSQL |
| New FK constraints on existing table | **LOW** | FK on nullable column with `ON DELETE SET NULL` is safe |
| Existing tests breaking | **NONE** | All new columns are nullable; tests never set them |
| Existing API breaking | **NONE** | No existing API requires new fields |
| Production data migration needed | **NONE** | Existing declarations simply have `NULL` for new columns |
| Type system changes | **LOW** | Add optional fields to `CustomsDeclaration` interface |

**Overall Migration Risk: LOW**

---

## 13. BACKWARD COMPATIBILITY STRATEGY

### 13.1 Zero-Breaking-Change Guarantee

| Guarantee | Mechanism |
|-----------|-----------|
| Existing customs declarations remain valid | All new columns are NULLABLE |
| Existing customs API endpoints unchanged | No parameter changes to existing routes |
| Existing 520 tests pass unmodified | New columns not referenced by existing tests |
| Existing `CreateDeclarationDTO` unchanged | New fields added as optional |
| Existing forwarding→customs flow via `svc_service_requests` preserved | No changes to existing service request table |
| Protected systems untouched | No changes to `job_orders`, `work_orders`, driver, GPS |

### 13.2 Migration Strategy

```text
Phase 1: ADDITIVE SCHEMA
  → New tables: commercial_engagements, commercial_capability_bindings
  → New columns: cus_declarations.(engagement_id, shipment_id, execution_leg_id, job_order_id)
  → All NULLABLE, all ON DELETE SET NULL

Phase 2: TYPE EXTENSIONS
  → Add optional fields to CustomsDeclaration interface
  → Add new service methods (attachment commands)
  → No modifications to existing service methods

Phase 3: API ADDITIONS
  → New routes only — no modifications to existing routes

Phase 4: TEST ADDITIONS
  → New test file for Phase 4A scenarios
  → Existing 520 tests run unchanged
```

---

## 14. ADR DECISIONS

### ADR-018: Commercial Engagement Model

**Decision:** Introduce `commercial_engagements` as a lightweight commercial root, separate from `commercial_work_orders`.

**Rationale:** An engagement represents a commercial agreement that may produce multiple work orders across multiple capabilities. The existing `commercial_work_orders` table has a mandatory `service_scope_id` which ties it to a single predefined scope. An engagement is scope-agnostic and can progressively bind capabilities.

**Consequence:** Existing `commercial_work_orders` remain unchanged. New declarations may reference either `work_order_id` (legacy) or `engagement_id` (Phase 4A+) or both.

### ADR-019: Nullable Cross-Domain References

**Decision:** Add `shipment_id`, `execution_leg_id`, `job_order_id` to `cus_declarations` as NULLABLE foreign keys with `ON DELETE SET NULL`.

**Rationale:** These references enable progressive composition without breaking standalone customs. The `ON DELETE SET NULL` policy ensures that if a forwarding shipment or trucking job is deleted, the customs declaration survives intact.

**Consequence:** Customs declarations can be created and fully processed without any forwarding or trucking reference. References can be attached later through idempotent attachment commands.

### ADR-020: Capability Binding Uniqueness

**Decision:** Enforce `UNIQUE(tenant_id, engagement_id, capability_type)` — one capability type per engagement.

**Rationale:** A customer engagement should have at most one active CUSTOMS capability, one FORWARDING capability, etc. Multiple instances of the same capability type would create ambiguity in progressive composition.

**Consequence:** If a customer needs two separate customs declarations under one commercial relationship, they reference the same capability binding. The binding is the commercial authorization, not the operational instance.

### ADR-021: Attachment Idempotency and Conflict Detection

**Decision:** Attachment commands are idempotent (setting the same value is a no-op) but reject conflicting reassignment (setting a different value when already set).

**Rationale:** Prevents accidental overwriting of a customs declaration's forwarding or trucking linkage. Explicit detachment must precede reassignment.

**Consequence:** The `attachCustomsToShipment(declarationId, shipmentId)` command succeeds if `cus_declarations.shipment_id` is NULL or already equals `shipmentId`. It returns 409 Conflict if `shipment_id` is set to a different value.

---

## 15. TEST STRATEGY

### 15.1 New Test File

`lib/domain/customs/__tests__/ppjk-phase4a-commercial-composition.test.ts`

### 15.2 Acceptance Scenarios (20 tests)

| # | Scenario | Category |
|---|----------|----------|
| 1 | Create customs-only engagement (no shipment, no trucking) | Standalone |
| 2 | Create customs declaration under engagement (engagement_id set, shipment_id NULL) | Standalone |
| 3 | Customs-only declaration passes full validation without forwarding references | Standalone |
| 4 | Customs-only CEISA preparation succeeds without shipment | Standalone |
| 5 | Customs-only SPPB release completes engagement | Standalone |
| 6 | Attach trucking job order to existing customs declaration | Progressive |
| 7 | Attach shipment to existing customs declaration | Progressive |
| 8 | Attach engagement to existing customs declaration | Progressive |
| 9 | Full logistics composition: engagement + customs + forwarding + trucking | Composition |
| 10 | Late capability attachment preserves all existing audit hashes | Progressive |
| 11 | Idempotent attachment: setting same shipment_id twice = no-op | Idempotency |
| 12 | Idempotent attachment: setting same job_order_id twice = no-op | Idempotency |
| 13 | Cross-tenant shipment attachment rejected (403) | Security |
| 14 | Cross-tenant job_order attachment rejected (403) | Security |
| 15 | Cross-tenant engagement attachment rejected (403) | Security |
| 16 | Conflict detection: overwriting non-null shipment_id = 409 | Conflict |
| 17 | Conflict detection: overwriting non-null job_order_id = 409 | Conflict |
| 18 | Existing legacy declaration (no engagement_id) continues to work | Backward |
| 19 | Customs remains fully operational with shipment_id = NULL | Backward |
| 20 | Performance: 10,000 capability bindings resolved in < 50ms | Performance |

### 15.3 Test Baseline Preservation

All existing 520 tests must remain green. The new test file adds ~20 tests for a target total of ~540.

---

## 16. CODE THAT DOES NOT REQUIRE MODIFICATION

| Component | Reason |
|-----------|--------|
| `lib/domain/customs/customs-validation-engine.ts` | Does not reference any forwarding/trucking fields |
| `lib/domain/customs/ceisa-preparation-service.ts` | Operates on declaration aggregate only |
| `lib/domain/customs/tax-calculator.ts` | Pure mathematical calculation |
| `lib/domain/customs/state-machine.ts` | Status transitions are customs-internal |
| `lib/domain/customs/item-import-service.ts` | Bulk import has no cross-domain dependency |
| `lib/domain/customs/sku-intelligence-service.ts` | Importer-scoped, no forwarding reference |
| `lib/domain/customs/audit/` (all files) | Audit operates on declaration events only |
| `lib/domain/customs/ceisa/` (all files) | CEISA serializer compiles from declaration only |
| All 14 existing test files | No modifications needed |
| Android Native Driver App | FROZEN |
| Driver PWA | FROZEN |
| GPS Foreground Service | FROZEN |
| Trucking execution engine | FROZEN |

---

## 17. IDENTIFIED ACCIDENTAL FORWARDING DEPENDENCIES

| Location | Finding | Severity |
|----------|---------|----------|
| `cus_declarations.service_request_id → svc_service_requests(id)` | `svc_service_requests.source_domain DEFAULT 'FORWARDING'` | **INFORMATIONAL** — The default is 'FORWARDING' but `source_domain` can be any value. Not a hard dependency. |
| `svc_service_requests.shipment_id` | EXISTS but NULLABLE | **NONE** — Already nullable. Service requests can exist without a shipment. |
| Discovery doc mentions `cus_declarations.work_order_id` as "Mandatory Commercial Anchor" | The column is actually NULLABLE in the schema | **INFORMATIONAL** — Documentation inaccuracy in prior discovery. The schema is correct (nullable). |

**Critical accidental forwarding dependencies found: ZERO**

---

## 18. IMPLEMENTATION SCOPE ESTIMATE

| Component | Effort | Files |
|-----------|--------|-------|
| Migration: `commercial_engagements` + `commercial_capability_bindings` | 1 hour | 1 SQL file |
| Migration: Add nullable columns to `cus_declarations` | 30 min | 1 SQL file (or same) |
| Domain types: `lib/domain/commercial/types.ts` | 30 min | 1 new file |
| Domain service: `CommercialEngagementService` | 1 hour | 1 new file |
| Domain service: `CustomsAttachmentService` | 1 hour | 1 new file |
| API routes: Commercial engagement CRUD | 1.5 hours | 4-5 new route files |
| API routes: Attachment endpoints | 1 hour | 3 new route files |
| Update `CustomsDeclaration` type | 15 min | 1 file (additive) |
| Test suite: 20 acceptance scenarios | 2 hours | 1 new test file |
| TypeScript build verification | 15 min | — |
| Documentation | 30 min | 1 report file |
| **Total** | **~9 hours** | **~15 files** |

---

## 19. FINAL ASSESSMENT

```text
PHASE 4A DISCOVERY COMPLETE

Architecture:                    GREEN
Customs Standalone:              ALREADY SUPPORTED (zero forwarding dependencies exist)
Progressive Composition:         SUPPORTED (with additive schema changes)
Forwarding Dependency:           NONE (verified across schema, domain, API, tests)
Migration Risk:                  LOW (all changes additive, all new columns nullable)
Existing 520-test Baseline:      PRESERVED (zero modifications to existing code required)
Implementation Authorization:    NOT REQUESTED — AWAITING APPROVAL
```

### Recommended ADRs

| ADR | Decision |
|-----|----------|
| ADR-018 | Introduce `commercial_engagements` as commercial root (alongside existing `commercial_work_orders`) |
| ADR-019 | Add nullable `shipment_id`, `execution_leg_id`, `job_order_id` to `cus_declarations` |
| ADR-020 | Enforce `UNIQUE(tenant_id, engagement_id, capability_type)` on capability bindings |
| ADR-021 | Attachment commands are idempotent with conflict detection for reassignment |

### Schema Changes Required

| Change | Type | Risk |
|--------|------|------|
| New table: `commercial_engagements` | ADDITIVE | LOW |
| New table: `commercial_capability_bindings` | ADDITIVE | LOW |
| New columns on `cus_declarations`: `engagement_id`, `shipment_id`, `execution_leg_id`, `job_order_id` | ADDITIVE (NULLABLE) | LOW |
| New indexes (7) | ADDITIVE | LOW |
| New RLS policies (2 tables) | ADDITIVE | LOW |

### API Contract Changes Required

| Change | Type |
|--------|------|
| 5 new commercial engagement routes | ADDITIVE |
| 3 new attachment routes | ADDITIVE |
| 0 modifications to existing routes | NONE |

### Protected Systems Impact

| System | Impact |
|--------|--------|
| Trucking | NONE |
| Driver PWA | NONE |
| Android Native Driver | NONE |
| GPS | NONE |
| Job Orders | NONE |
| Work Orders | NONE |
| Existing Customs Workbench | NONE |
