# SENTRALOGIS — PHASE 4B

# U-16R — FULFILLMENT OPERATIONAL COMPOSITION FORENSIC RECONCILIATION REPORT

**Date:** 2026-08-28  
**Mode:** FORENSIC RECONCILIATION ONLY  
**Production Source Code Modified:** 0 files  
**Production Migrations Modified:** 0 files  
**ADR Ratification Performed:** NONE (ADR-PROP-045..050 remain PROPOSED ONLY)  
**Status:** GREEN — ALL 35/35 GATES & CONTROLS PASS · 667/667 FULL REGRESSION PASS · 0 TS ERRORS  

---

## 1. Executive Summary

**U-16R** independently audits and verifies the architecture discovered and designed in **U-16** (the *Handoff Composition Model — Model E Extended*). The audit proves that:

1. **Fulfillment is a Lightweight Composition Aggregate (ADR-039):** It coordinates allocations and tracks progress; it contains **ZERO** operational mechanics, zero driver/truck assignments, zero GPS tracking, zero container manifests, zero customs XML generation, and zero warehouse bin assignments.
2. **Canonical Lineage is Strictly Preserved:**
   $$\text{Commercial Engagement} \xrightarrow{1:N} \text{Sales Order} \xrightarrow{1:N} \text{Fulfillment} \xrightarrow{1:N} \text{Allocations} \xrightarrow{\text{Command/FK}} \text{Domain Operational Aggregates}$$
3. **Operational Sovereignty is Maintained:**
   - **Forwarding (`shp_shipments`)** owns physical logistics movement, container units (`shp_units`), and multimodal execution legs (`shp_execution_legs`).
   - **Customs (`cus_declarations`)** remains sovereign; progressive attachment (`CustomsAttachmentService` / ADR-019, ADR-021) links to shipments/legs/jobs without breaking declaration identity or SHA-256 audit continuity.
   - **Trucking (`work_orders`, `wo_items`, `job_orders`)** is commanded via `svc_service_requests` (ADR-033). Lineage adapter (`trucking-lineage.ts` / U-07) enforces non-detached execution (`SR` $\to$ `Engagement` $\to$ `WO` $\to$ `wo_item` $\to$ `JO`).
   - **Warehouse (`wh_`)** is commanded via `svc_service_requests` (`target_domain='WAREHOUSE'`).
4. **Strict Cardinality Guardrails Enforced:**
   - `Sales Order` $\to$ `Work Order`: $1:N$ (ADR-037).
   - **`Many Sales Orders` $\to$ `One Work Order` is STRICTLY FORBIDDEN** (ADR-037).
   - Direct `Sales Order` $\to$ `Job Order`, `Fulfillment` $\to$ `Job Order`, `Quote` $\to$ `Work Order` are **STRICTLY FORBIDDEN** (0 occurrences).
5. **No Ratification Performed:** ADR-PROP-045 through ADR-PROP-050 remain **PROPOSED ONLY** awaiting human architectural ratification in a dedicated ratification phase.

---

## 2. Baseline & Post-Test Verification

| Gate Phase | TypeScript Errors | Suite Count | Total Passed | Total Failed | Pass Rate |
|---|---|---|---|---|---|
| **U-16 Baseline** | 0 | 26 suites | 632 | 0 | 100% |
| **U-16R Post-Test** | 0 | 27 suites | 667 | 0 | 100% |

---

## 3. Forensic Cross-Domain Inventory & Edge Matrix

A full repository scan of all entity relationships involving commercial, fulfillment, and operational identifiers yielded the following audited classifications:

| Source Entity | Edge / Foreign Key | Target Entity | Relationship Type | Classification | ADR Authority |
|---|---|---|---|---|---|
| `commercial_work_orders` | PK `id` | Root | Commercial Root | CANONICAL | ADR-018 |
| `sales_orders` | `engagement_id` | `commercial_work_orders` | $1:N$ Header Child | CANONICAL | ADR-034 |
| `sales_orders` | `quote_id` | `crm_quotations` | Optional Link | CANONICAL | ADR-034 |
| `fulfillments` | `sales_order_id` | `sales_orders` | $1:N$ Header Child | CANONICAL | ADR-042 |
| `fulfillment_allocations` | `fulfillment_id` | `fulfillments` | $1:N$ Composition Child | CANONICAL | ADR-042 |
| `fulfillment_allocations` | `capability_binding_id` | `commercial_capability_bindings` | Scoped Binding | CANONICAL | ADR-020, ADR-042 |
| `fulfillment_allocations` | `shipment_id` | `shp_shipments` | Optional Handoff Link | CANONICAL | ADR-038, ADR-040 |
| `shp_shipments` | `sales_order_id` | `sales_orders` | $1:N$ Reference | CANONICAL | ADR-038 |
| `shp_shipments` | `work_order_id` | `commercial_work_orders` | Engagement Link | CANONICAL | ADR-018 |
| `shp_execution_legs` | `shipment_id` | `shp_shipments` | Multimodal Leg Child | CANONICAL | Canonical Forwarding |
| `cus_declarations` | `shipment_id` | `shp_shipments` | Progressive Attachment | CANONICAL | ADR-019, ADR-021 |
| `cus_declarations` | `execution_leg_id` | `shp_execution_legs` | Progressive Attachment | CANONICAL | ADR-019, ADR-021 |
| `cus_declarations` | `job_order_id` | `job_orders` | Progressive Attachment | CANONICAL | ADR-019, ADR-021 |
| `svc_service_requests` | `work_order_id` | `commercial_work_orders` | Engagement Link | CANONICAL | ADR-033 |
| `svc_service_requests` | `assigned_domain_job_id` | Polymorphic (no FK) | Command Result Pointer | CANONICAL | ADR-033 |
| `work_orders` | `id` | Operational Case File | Operational Commitment | CANONICAL | Canonical Trucking |
| `wo_items` | `wo_id` | `work_orders` | $1:N$ Work Item Child | CANONICAL | Canonical Trucking |
| `job_orders` | `wo_item_id` | `wo_items` | $1:N$ Execution Child | CANONICAL | Canonical Execution |

---

## 4. Audit of Gates U16R-A through U16R-U

| Gate | Title | Finding / Evidence | Verdict |
|---|---|---|---|
| **U16R-A** | Fulfillment Boundary | Fulfillments domain contains 0 driver assignments, 0 GPS tracking, 0 armada mechanics, 0 dispatch logic. | **PASS** |
| **U16R-B** | Allocation Semantics | `fulfillment_allocations` stores `capability_type`, `allocated_quantity`, and `delivered_quantity`; contains 0 driver/vehicle columns. | **PASS** |
| **U16R-C** | SO $\to$ Fulfillment | `fulfillments.sales_order_id` is NOT NULL FK (`ON DELETE RESTRICT`); validates `CONFIRMED` SO status before create. | **PASS** |
| **U16R-D** | Shipment Separation | `shp_shipments` is the movement root; `fulfillments` contains 0 POL/POD/MBL/HBL/vessel/voyage columns. | **PASS** |
| **U16R-E** | Forwarding Multimodal | `shp_execution_legs` and `shp_units` encapsulate multimodal routes, container types, and carrier details. | **PASS** |
| **U16R-F** | Customs Sovereignty | `CustomsAttachmentService` attaches progressively without mutating declaration identity or SHA-256 audit history. | **PASS** |
| **U16R-G** | Service Request Boundary | `svc_service_requests` acts as cross-domain command (ADR-033) with loose polymorphic pointer and SLA target time. | **PASS** |
| **U16R-H** | Trucking Handoff | Trucking lineage adapter (`trucking-lineage.ts`) enforces lineage (`SR` $\to$ `Engagement` $\to$ `WO` $\to$ `wo_item` $\to$ `JO`). | **PASS** |
| **U16R-I** | Warehouse Handoff | Warehouse operations commanded via `svc_service_requests(target_domain='WAREHOUSE')`; Fulfillment does not mutate WMS inventory. | **PASS** |
| **U16R-J** | Cardinality Guardrails | Many SO $\to$ 1 WO is FORBIDDEN (ADR-037); direct SO $\to$ JO and FL $\to$ JO are 0. | **PASS** |
| **U16R-K** | Partial Fulfillment | Allocation tracks `allocated_quantity` vs `delivered_quantity` without mutating parent Sales Order header. | **PASS** |
| **U16R-L** | Split Shipment | Multiple allocations can link to distinct shipments under a single fulfillment composition. | **PASS** |
| **U16R-M** | Multi-SBU Composition | Single SO/Fulfillment supports allocations across FORWARDING, CUSTOMS, TRUCKING, and WAREHOUSE. | **PASS** |
| **U16R-N** | Replanning (ADR-043/044) | Revision incrementing preserves historical immutability; does NOT mutate commercial Sales Orders. | **PASS** |
| **U16R-O** | Failure Isolation | Logistics exceptions (`EXCEPTION_HOLD`, demurrage risks) isolated in domain aggregates. | **PASS** |
| **U16R-P** | Identity Authority | Number authorities are atomic database sequences (`next_sales_order`, `next_fulfillment_number`); 0 client generators. | **PASS** |
| **U16R-Q** | Tenant Isolation | RLS active on fulfillments/allocations; domain strictly derives tenant from server `IdentityContext`. | **PASS** |
| **U16R-R** | Authorization | Commercial permissions (`commercial:manage`, `commercial:read`) enforced at domain boundary. | **PASS** |
| **U16R-S** | Second Engine Absence | Broad scan confirms zero driver, vehicle, GPS, or armada execution engines in Fulfillment code. | **PASS** |
| **U16R-T** | Direct Bypass Detection | Zero Quote $\to$ WO, Quote $\to$ JO, or SO $\to$ wo_items direct bypass foreign keys. | **PASS** |
| **U16R-U** | Proposed ADR Consistency | ADR-PROP-045..050 verified as consistent, non-colliding proposals that remain PROPOSED ONLY. | **PASS** |

---

## 5. Positive & Negative Soundness Controls

### Positive Controls (Legitimate Behaviors Proven Allowed):
- **PC1:** `fulfillment_allocations` references `fulfillments(id)` with `ON DELETE CASCADE` (**PASS**).
- **PC2:** `fulfillment_allocations` references `shp_shipments(id)` with `ON DELETE SET NULL` (**PASS**).
- **PC3:** `svc_service_requests` table exists with valid cross-domain target domains (**PASS**).
- **PC4:** `fulfillments` table supports multiple revisions per Sales Order (**PASS**).
- **PC5:** `fulfillment_allocations` supports multiple peer capability allocations per fulfillment (**PASS**).
- **PC6:** `fulfillment_allocations` tracks both allocated and delivered quantities (**PASS**).
- **PC7:** `shp_shipments` has `sales_order_id` FK permitting multiple shipments per SO (**PASS**).

### Negative Controls (Detectors Proven Sound Against Violations):
- **NC1:** Planted direct `Fulfillment` $\to$ `Job Order` FK is reliably caught (**PASS**).
- **NC2:** Planted direct `Fulfillment` $\to$ `Driver` FK is reliably caught (**PASS**).
- **NC3:** Planted direct `Fulfillment` $\to$ `GPS` fields are reliably caught (**PASS**).
- **NC4:** Planted `Many SO` $\to$ `One WO` FK is reliably caught (**PASS**).
- **NC5:** Client-side `Math.random()` Fulfillment number generation is reliably caught (**PASS**).
- **NC6:** Client-provided `x-tenant-id` header trust is reliably caught (**PASS**).
- **NC7:** Forwarding `POL/POD` columns planted in `fulfillments` table are reliably caught (**PASS**).

---

## 6. Defect Classification

- **P0 (Critical Architecture Violations):** 0
- **P1 (Secondary Defects):** 0
- **P2 (Suboptimal Ambiguities):** 0
- **P3 (Minor Polish):** 0
- **P4 (Documentation / Comment Polish):** 0

---

## 7. ADR Status & Governance

- **Ratified & Unchanged:** ADR-018, ADR-020, ADR-033, ADR-034, ADR-035, ADR-036, ADR-037, ADR-038, ADR-039, ADR-040, ADR-041, ADR-042, ADR-043, ADR-044.
- **Proposed Only (Unratified):** ADR-PROP-045, ADR-PROP-046, ADR-PROP-047, ADR-PROP-048, ADR-PROP-049, ADR-PROP-050.
- **Ratification Action:** NONE in U-16R.
- **Implementation Action:** NONE in U-16R (0 production code changes, 0 production migration changes).

---

## 8. Final Reconciliation Verdict

**ARCHITECTURE RECONCILED — GREEN**

The U-16 operational composition architecture is structurally sound, faithful to all ratified ADRs, free of operational bypasses, and ready for human architectural review in the next authorized phase.
