# ADR-049 — Partial Fulfillment Accounting & Split Shipment Allocation Model

**Status:** RATIFIED (U-16A architectural ratification, 2026-08-28)  
**Date:** 2026-08-28  
**Depends on:** ADR-038 (Shipment $\to$ SO Reference), ADR-039 (Fulfillment Composition-not-Engine), ADR-040 (Shipment $\neq$ Fulfillment Aggregate), ADR-042 (Fulfillment Lineage), ADR-045 (Handoff Boundary)  

---

## 1. Context

Logistics orders frequently execute in multiple physical shipments or partial deliveries due to vessel capacity, container availability, customer phased production schedules (e.g. 500 CKD kits delivered in 5 batches of 100), or supply chain constraints. We must ratify how Fulfillment accurately accounts for partial deliveries and split shipments without mutating the commercial Sales Order or duplicating commitments.

---

## 2. Decision

**Partial fulfillment and split shipments are natively modeled via allocation-level quantity progress accounting and 1:N shipment allocations under a single Fulfillment plan.**

1. **Split Shipment Cardinality:**
   - One commercial Sales Order $\to$ One Fulfillment $\to$ Multiple Allocations referencing distinct `shp_shipments.id` records.
   - Per ADR-038, `shp_shipments.sales_order_id` references `sales_orders.id` directly in a $1:N$ relationship (`ON DELETE SET NULL`), permitting multiple shipments per SO.
   - `fulfillment_allocations.shipment_id` is an optional foreign key with **NO unique constraint**, allowing multiple split allocations or shipments.

2. **Partial Fulfillment Accounting:**
   - Each `fulfillment_allocations` record maintains:
     - `allocated_quantity NUMERIC(18,3) NOT NULL DEFAULT 0`: The quantity planned/assigned to this specific allocation.
     - `delivered_quantity NUMERIC(18,3) NOT NULL DEFAULT 0`: The quantity physically delivered and confirmed by operational milestones or POD.
   - Mathematical Invariants:
     $$0 \le \text{delivered\_quantity} \le \text{allocated\_quantity}$$
     $$\sum \text{allocated\_quantity} \le \text{Commercial Quantity on Sales Order}$$
   - When $\sum \text{delivered\_quantity} < \text{Total Quantity}$, the Fulfillment status is `PARTIALLY_FULFILLED`.
   - When all allocations have $\text{delivered\_quantity} = \text{allocated\_quantity}$, the Fulfillment transitions to `FULFILLED` $\to$ `CLOSED`.

3. **Commercial Immutability:**
   - Executing physical partial shipments or split batches MUST NOT mutate the parent Sales Order's agreed commercial quantity, price, or currency.

---

## 3. Invariants & Rules

1. **Deterministic Quantity Rollup:** Fulfillment progress is the mathematical rollup of allocation delivered quantities vs allocated quantities.
2. **Commercial Protection:** Operational split shipments MUST NOT alter the commercial customer commitment recorded on `public.sales_orders`.
3. **No Unplanned Over-Delivery:** The sum of `allocated_quantity` across active allocations cannot exceed the authorized Sales Order commitment without an explicit commercial amendment (ADR-044, ADR-050).
4. **Tenant Isolation:** All partial fulfillment and split shipment operations enforce tenant isolation via server `IdentityContext` and RLS `tenant_id = public.get_my_tenant_id()`.

---

## 4. Forbidden Patterns

- **FORBIDDEN:** Creating new Sales Orders for subsequent batches of a split shipment under the same customer order.
- **FORBIDDEN:** Mutating the `public.sales_orders` record to reflect partial operational progress (e.g. reducing SO quantity from 500 to 300 when batch 1 delivers).
- **FORBIDDEN:** Enforcing a false $1:1$ constraint between Sales Order and Shipment that prevents split shipments.

---

## 5. Consequences & Implementation Scope

- **Consequences:** Provides exact, real-time visibility into multi-batch deliveries, backorders, and in-transit inventory without commercial data corruption.
- **Scope Note:** **This ADR does NOT authorize implementation during U-16A.** Implementation of automated quantity rollup triggers is deferred to the next authorized implementation phase (U-17).
