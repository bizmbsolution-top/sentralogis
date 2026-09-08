# ADR-054 — Trucking SBU Handoff Adapter & Lineage Binding

**Status:** RATIFIED (U-17A architectural ratification, 2026-08-28)  
**Date:** 2026-08-28  
**Depends on:** ADR-018 (Engagement Root), ADR-033 (Service Request Command), ADR-037 (SO $\to$ WO Cardinality), ADR-051 (Operational Handoff Contract)  

---

## 1. Context

Trucking operations involve driver assignments, vehicle scheduling, route execution, and POD collection governed by `work_orders`, `wo_items`, and `job_orders`. ADR-033, ADR-037, and U-07 establish strict commercial lineage resolution rules to prevent detached or unauthorized execution.

## 2. Decision

**`TruckingHandoffAdapter` is the boundary into Trucking execution, enforcing canonical commercial lineage.**

$$\text{Trucking Allocation} \xrightarrow{\text{Operational Handoff}} \text{TruckingHandoffAdapter} \longrightarrow \text{svc\_service\_requests} \xrightarrow{\text{U-07 Lineage}} \text{work\_orders} \longrightarrow \text{wo\_items} \longrightarrow \text{job\_orders}$$

### 2.1 Canonical Trucking Lineage Chain
1. **Command Envelope:** Emits an independent `svc_service_requests(target_domain='TRUCKING')`.
2. **Lineage Resolution (`trucking-lineage.ts` / U-07):**
   - Resolves `SR.work_order_id` (Engagement) $\to$ `legacy_wo_bridge` $\to$ `work_orders` (Operational case folder).
   - Generates or binds `wo_items` (Discrete operational scope item).
   - Authorizes creation of `job_orders` (Driver & vehicle assignment).

### 2.2 Strict Cardinality & Anti-Bypass Guardrails:
1. **SO $\to$ WO is 1:N (ADR-037):** One Sales Order may spawn multiple Work Orders.
2. **Many SO $\to$ 1 WO is STRICTLY FORBIDDEN (ADR-037):** No single Work Order may combine multiple Sales Orders.
3. **Zero Direct SO/FL $\to$ JO:**
   - Direct `Sales Order` $\to$ `job_orders` is **STRICTLY FORBIDDEN**.
   - Direct `Fulfillment` $\to$ `job_orders` is **STRICTLY FORBIDDEN**.
   - Direct `OperationalHandoff` $\to$ `job_orders` is **STRICTLY FORBIDDEN**.
4. **No Detached Execution:** Any dispatch attempt without valid commercial lineage resolution is rejected with `TRUCKING_LINEAGE_UNRESOLVED`.

### 2.3 Adapter Responsibilities:
1. Validates vehicle type, pickup/delivery addresses, and cargo dimensions.
2. Emits `svc_service_requests` with tenant-scoped idempotency key.
3. Binds `assigned_domain_reference` (`reference_type = 'SERVICE_REQUEST'`, `reference_id = svc_service_requests.id`).
4. Tracks delivery milestones from `job_orders` (`arrived_origin`, `loaded`, `in_transit`, `delivered`).
