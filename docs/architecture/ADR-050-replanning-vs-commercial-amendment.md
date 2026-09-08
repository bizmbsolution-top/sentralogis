# ADR-050 — Versioned Fulfillment Replanning vs Commercial Amendment & Failure Isolation

**Status:** RATIFIED (U-16A architectural ratification, 2026-08-28)  
**Date:** 2026-08-28  
**Depends on:** ADR-042 (Fulfillment Lineage), ADR-043 (Fulfillment State & Events), ADR-044 (Commercial Amendment vs Fulfillment Change), ADR-045 (Handoff Boundary)  

---

## 1. Context

Logistics operations are prone to real-world disruptions: vessel delays, port congestion, customs physical inspections (Red Channel), truck breakdowns, driver refusals, and carrier roll-overs. When an operational plan fails or requires rerouting, the operational plan must be adjusted without corrupting commercial contracts or erasing historical audit trails. We must ratify the strict boundary between Commercial Amendments, Versioned Fulfillment Replanning, and Operational Failure Isolation.

---

## 2. Decision

**Commercial Amendments and Operational Replanning are strictly separated; operational replanning increments Fulfillment revisions without mutating commercial commitments or executed operational history.**

1. **The Boundary Defined:**
   - **Commercial Amendment (Commercial Layer):** Occurs when the customer renegotiates commercial terms (e.g. order quantity increases from 100 to 150, price changes, delivery deadline extended by contract). This produces a Sales Order revision / amendment.
   - **Operational Replanning (Composition Layer):** Occurs when operations changes how the commitment is fulfilled (e.g. substituting carrier A with carrier B, rerouting from sea freight to air freight due to urgency, reallocating split shipment batches). This produces a **new Fulfillment revision (`revision_no = N + 1`, `version_no = N + 1`)**.
   - **Operational Failure / Compensation (Execution Layer):** Occurs when an operational resource fails (e.g. truck breakdown $\to$ dispatch assigns replacement truck; customs red channel $\to$ customs handles physical inspection). This is managed entirely within the operational domain and does NOT alter the Sales Order.

2. **Historical Immutability:**
   - When a Fulfillment is replanned, the previous revision (Revision $N$) is marked inactive / superseded.
   - Completed execution history (delivered goods, past milestones, CEISA filings, paid invoices) remains immutable and cannot be rewritten.

3. **Operational Failure Isolation:**
   - A logistics failure in one domain (e.g. a delayed vessel or customs hold) pauses or reroutes the relevant allocation.
   - It does NOT automatically cancel the Sales Order or invalidate independent peer capability allocations (e.g. warehouse staging remains intact while customs clears).

---

## 3. Invariants & Rules

1. **No Commercial Mutation on Replan:** Creating a new Fulfillment revision MUST NOT update, modify, or corrupt fields on `public.sales_orders`.
2. **Audit History Preservation:** Replanning MUST NOT delete previous `fulfillments` or `fulfillment_allocations` revisions; revisions increment monotonically (`revision_no \ge 1`).
3. **Failure Isolation:** Execution failures in operational domains MUST be resolved via domain-specific compensation mechanisms or Service Request retries without mutating parent commercial agreements.
4. **Tenant Isolation:** All replanning operations enforce tenant isolation via server `IdentityContext` and RLS `tenant_id = public.get_my_tenant_id()`.

---

## 4. Forbidden Patterns

- **FORBIDDEN:** Overwriting historical Fulfillment revisions in-place instead of creating versioned revisions.
- **FORBIDDEN:** Mutating the parent Sales Order price, customer, or agreed items to compensate for operational logistics failures or carrier changes.
- **FORBIDDEN:** Deleting completed `job_orders` or `shp_milestones` when a shipment leg is replanned.

---

## 5. Consequences & Implementation Scope

- **Consequences:** Commercial contracts and operational execution are decoupled; operational adjustments are auditable and fail-safe.
- **Scope Note:** **This ADR does NOT authorize implementation during U-16A.** Implementation of automated replanning workflows is deferred to the next authorized implementation phase (U-17).
