# ADR-045 — Operational Composition Handoff Boundary

**Status:** RATIFIED (U-16A architectural ratification, 2026-08-28)  
**Date:** 2026-08-28  
**Depends on:** ADR-018 (Engagement), ADR-020 (Capability Binding), ADR-033 (SR Command), ADR-036 (Fulfillment Boundary), ADR-037 (SO $\to$ WO Cardinality), ADR-038 (Shipment $\to$ SO), ADR-039 (Fulfillment Composition-not-Engine), ADR-042 (Fulfillment Lineage)  

---

## 1. Context

U-15 implemented the canonical `fulfillments` and `fulfillment_allocations` tables. U-16/U-16R discovered and reconciled the exact operational composition handoff model from a commercial Sales Order down to executing SBU domains (Forwarding, Customs, Trucking, Warehouse). We must formalize the architectural boundary where Fulfillment stops and operational domain execution begins.

---

## 2. Decision

**Fulfillment is the composition and progress boundary; operational domains own execution.**

The canonical lineage handoff is strictly governed as:
$$\text{Sales Order} \longrightarrow \text{Fulfillment} \longrightarrow \text{Fulfillment Allocation} \longrightarrow \text{Domain Handoff} \longrightarrow \text{Operational Domain}$$

1. **Fulfillment Owns:**
   - Multi-capability composition planning.
   - Per-capability scoping (`fulfillment_allocations`).
   - Commercial quantity allocation and progress tracking (`allocated_quantity`, `delivered_quantity`).
   - Versioned plan revisions (`revision_no`, `version_no`).
   - Aggregate status lifecycle (`PLANNED`, `ACTIVE`, `PARTIALLY_FULFILLED`, `FULFILLED`, `CLOSED`, `CANCELLED`).

2. **Fulfillment DOES NOT Own:**
   - Resource assignment or driver scheduling.
   - GPS telemetry or vehicle tracking.
   - Statutory customs filings or CEISA EDI generation.
   - Warehouse inventory movements, bin locations, or picking execution.
   - Trucking work order / job order execution.
   - Multimodal transit legs or carrier manifests.

3. **Domain Handoff Ports:**
   - **Forwarding:** Binds to `shp_shipments` via optional `shipment_id` on Forwarding allocations.
   - **Customs:** Binds to `cus_declarations` via progressive attachment (`CustomsAttachmentService` / ADR-019, ADR-021).
   - **Trucking:** Dispatches cross-domain command via `svc_service_requests` (ADR-033) $\to$ lineage resolution (`trucking-lineage.ts` / U-07) $\to$ `work_orders` $\to$ `wo_items` $\to$ `job_orders`.
   - **Warehouse:** Dispatches cross-domain command via `svc_service_requests(target_domain='WAREHOUSE')` $\to$ WMS inbound receipt / picking list.

---

## 3. Invariants & Rules

1. **Fulfillment is NOT an Operational Engine:** Fulfillment services must never contain driver, vehicle, GPS, armada, or dispatch execution mechanics.
2. **Zero Direct Execution Mutations:** Fulfillment domain code MUST NOT directly insert, update, or delete rows in `job_orders`, `wo_items`, `wh_inventory`, or `cus_declarations`.
3. **Command Delegation:** Cross-domain dispatch from Fulfillment MUST route through canonical domain entry ports or `svc_service_requests` command envelopes (ADR-033).
4. **Tenant Isolation:** Tenant identity MUST be server-derived from `IdentityContext` and enforced via PostgreSQL RLS `tenant_id = public.get_my_tenant_id()`.

---

## 4. Forbidden Patterns

- **FORBIDDEN:** Direct `Sales Order` $\to$ `Job Order` or `Fulfillment` $\to$ `Job Order` creation.
- **FORBIDDEN:** Direct `Fulfillment` $\to$ `Driver` / `GPS` assignment.
- **FORBIDDEN:** Embedding domain execution state (e.g. driver license, GPS coordinates, warehouse rack ID) inside `fulfillments` or `fulfillment_allocations`.
- **FORBIDDEN:** Bypassing `svc_service_requests` or domain adapters to mutate operational tables.

---

## 5. Consequences & Implementation Scope

- **Consequences:** Provides a clean, decoupled boundary that enables complex multi-capability fulfillment without polluting commercial or composition models with operational mechanics.
- **Scope Note:** **This ADR does NOT authorize implementation during U-16A.** Implementation of operational handoff adapters is deferred to the next authorized implementation phase (U-17).
