# ADR-051 — Generic Operational Handoff Contract Interface & Lifecycle

**Status:** RATIFIED (U-17A architectural ratification, 2026-08-28)  
**Date:** 2026-08-28  
**Depends on:** ADR-018 (Engagement), ADR-020 (Capability Binding), ADR-033 (SR Command), ADR-036 (Fulfillment Boundary), ADR-037 (SO $\to$ WO Cardinality), ADR-039 (Fulfillment Composition-not-Engine), ADR-042 (Lineage), ADR-045 (Handoff Boundary), ADR-048 (Multi-SBU)  

---

## 1. Context

U-15 through U-17 established that `fulfillments` and `fulfillment_allocations` compose commercial customer commitments (`sales_orders`) into capability-specific scopes across Forwarding, Customs, Trucking, and Warehouse.

To bridge the boundary between composition intent and physical SBU execution without turning Fulfillment into a second operational engine, a formal, deterministic, and idempotent handoff mechanism is required.

## 2. Decision

**OperationalHandoff is the formal composition-to-execution handoff seam.**

Canonical Lineage:
$$\text{Sales Order} \longrightarrow \text{Fulfillment} \longrightarrow \text{Fulfillment Allocation} \longrightarrow \text{Operational Handoff} \longrightarrow \text{Domain Adapter} \longrightarrow \text{Operational Domain Aggregate}$$

### 2.1 OperationalHandoff OWNS:
1. **Formal Handoff Lifecycle:** `ISSUED` $\to$ `ACKNOWLEDGED` $\to$ `ACCEPTED` $\to$ `EXECUTING` $\to$ `FULFILLED` (Terminal failure states: `FAILED`, `REJECTED`, `CANCELLED`).
2. **Handoff Identity Authority:** `handoff_id` (UUID PK) and `handoff_number` (`OH-YYYY-MM-NNNN` server-generated DB sequence).
3. **Allocation Association:** `fulfillment_allocation_id` NOT NULL foreign key.
4. **Tenant Scoping & Security:** Server-derived `IdentityContext.tenantId` + PostgreSQL RLS.
5. **Idempotency Boundary:** `UNIQUE(tenant_id, idempotency_key)` preventing duplicate operational handoffs.
6. **Domain Reference Binding:** Polymorphic loose pointer (`assigned_domain_reference`: `reference_type` + `reference_id` + `reference_number`).
7. **Handoff-Level Failure & Rejection Semantics:** Capturing domain rejection reason without mutating the parent commercial Sales Order.

### 2.2 OperationalHandoff DOES NOT OWN:
1. **Physical Resource Management:** Drivers, armadas, vehicles, GPS telemetry, or vessel bookings.
2. **Domain-Specific Lifecycle:** Declaration clearance, WMS putaway/picking, or shipment sailing.
3. **Direct Job Order Execution:** Direct `OperationalHandoff` $\to$ `job_orders` writes are **STRICTLY FORBIDDEN**.
4. **Commercial Pricing / Mutations:** Sales Order terms, prices, or amendments.

### 2.3 Cardinality Rules:
- Allocation $\to$ Handoff: $1 : N$ (versioned attempts / revisions).
- Handoff $\to$ Domain Aggregate: $1 : 1$ (polymorphic pointer).
- Sales Order $\to$ Work Order: $1 : N$ (ADR-037).
- **Many Sales Orders $\to$ One Work Order is STRICTLY FORBIDDEN** (ADR-037).
- Direct `Sales Order` $\to$ `Job Order` and `Fulfillment` $\to$ `Job Order` are **STRICTLY FORBIDDEN**.

---

## 3. Invariants & Implementation Boundaries

1. **Contract Seam, Not Engine:** OperationalHandoff acts solely as the formal contract boundary.
2. **Domain Sovereignty:** SBU execution remains 100% sovereign within respective domains.
3. **Implementation Status:** Authorized by this ADR; implementation is DEFERRED to a dedicated implementation phase.
