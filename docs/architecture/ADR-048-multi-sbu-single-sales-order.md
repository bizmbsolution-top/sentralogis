# ADR-048 — Multi-SBU Single Sales Order Fulfillment Representation

**Status:** RATIFIED (U-16A architectural ratification, 2026-08-28)  
**Date:** 2026-08-28  
**Depends on:** ADR-018 (Engagement), ADR-020 (Capability Binding), ADR-034 (Engagement $\to$ SO 1:N), ADR-039 (Fulfillment Composition-not-Engine), ADR-042 (Fulfillment Lineage), ADR-045 (Handoff Boundary)  

---

## 1. Context

A major enterprise client (e.g. BYD, Unilever, Indofood) frequently signs an integrated logistics contract that requires Forwarding (freight movement), Customs (import clearance), Trucking (first/last-mile haulage), and Warehouse (bonded storage / CFS cross-docking). If each SBU forced the customer to execute 4 separate commercial Sales Orders, commercial commitment would be fragmented and billing reconciliation would be severely compromised. We must ratify that a single commercial Sales Order natively represents multi-SBU execution under one unified Fulfillment composition.

---

## 2. Decision

**A single commercial Sales Order natively supports multi-SBU operational composition across FORWARDING, CUSTOMS, TRUCKING, and WAREHOUSE under one Fulfillment aggregate.**

1. **Unified Commercial Commitment:**
   - One `sales_orders` header represents the unified commercial contract between the tenant and the customer.
   - The Sales Order is NOT duplicated per SBU (i.e. `SO-Forwarding`, `SO-Customs`, `SO-Trucking`, `SO-Warehouse` are strictly forbidden for the same customer contract).

2. **Decomposition via Allocations:**
   - The Sales Order produces one active `fulfillments` container.
   - The fulfillment container decomposes the commercial requirement into $N$ peer capability allocations (`fulfillment_allocations`):
     ```text
     Sales Order (SO-2026-08-0001)
          │
          ▼
     Fulfillment (FL-2026-08-0001, revision_no=1)
          ├── Allocation 1: capability_type = 'FORWARDING'  (Shipment / Multimodal freight)
          ├── Allocation 2: capability_type = 'CUSTOMS'     (PIB Bea Cukai clearance)
          ├── Allocation 3: capability_type = 'TRUCKING'    (Container haulage to plant)
          └── Allocation 4: capability_type = 'WAREHOUSE'   (Bonded staging / cross-docking)
     ```

3. **Domain Sovereignty Preserved:**
   - Although unified under one Sales Order, each capability allocation delegates to its respective sovereign domain aggregate (`shp_shipments`, `cus_declarations`, `work_orders`/`job_orders`, `wh_receipt_orders`).
   - No SBU is subordinated to another at the commercial layer.

---

## 3. Invariants & Rules

1. **Single Commercial Truth:** A commercial agreement with a customer MUST NOT be split into multiple duplicate Sales Orders solely to accommodate multiple executing SBUs.
2. **Standard Capability Vocabulary:** All allocations MUST use canonical capability codes (`FORWARDING`, `CUSTOMS`, `TRUCKING`, `WAREHOUSE`) defined in `commercial_capability_registry` (ADR-020).
3. **Independent Operational Progress:** Each allocation tracks its own `allocated_quantity` and `delivered_quantity` independently.
4. **Tenant Isolation:** All allocations and downstream operations enforce tenant isolation via server `IdentityContext` and RLS `tenant_id = public.get_my_tenant_id()`.

---

## 4. Forbidden Patterns

- **FORBIDDEN:** Creating duplicate, SBU-specific Sales Orders for the same customer commercial contract.
- **FORBIDDEN:** Hardcoding SBU-specific fields (e.g. vessel name, customs channel, truck license, warehouse bin) directly onto `public.sales_orders`.
- **FORBIDDEN:** Forcing one SBU (e.g. Forwarding) to act as a monolithic parent over independent Customs or Warehouse work.

---

## 5. Consequences & Implementation Scope

- **Consequences:** Enables enterprise multi-modal and multi-capability contracts to be billed, tracked, and fulfilled seamlessly without commercial data duplication.
- **Scope Note:** **This ADR does NOT authorize implementation during U-16A.** Implementation of multi-SBU composition orchestration is deferred to the next authorized implementation phase (U-17).
