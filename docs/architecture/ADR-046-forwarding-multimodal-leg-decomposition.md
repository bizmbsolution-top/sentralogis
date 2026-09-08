# ADR-046 — Forwarding Multimodal Leg Decomposition & Cross-Domain Dispatch

**Status:** RATIFIED (U-16A architectural ratification, 2026-08-28)  
**Date:** 2026-08-28  
**Depends on:** ADR-033 (SR Command), ADR-038 (Shipment $\to$ SO Reference), ADR-040 (Shipment $\neq$ Fulfillment Aggregate), ADR-045 (Handoff Boundary)  

---

## 1. Context

In multimodal logistics (e.g. Domestic Antar Pulau, International Import/Export, BYD CKD Automotive), a single logistics journey spans multiple transport modes (Road Trucking, Ocean Freight, Barge, Air Freight, Port Terminal Handling, Warehouse Staging). The repository establishes `shp_shipments` as the canonical physical logistics movement aggregate. We must ratify how Forwarding decomposes journeys into multimodal execution legs and dispatches operational sub-tasks.

---

## 2. Decision

**Forwarding is sovereign over physical logistics movement, container units, and multimodal execution legs.**

1. **Forwarding Aggregates:**
   - `shp_shipments` is the root aggregate for physical cargo movements. It encapsulates POL (Port of Loading), POD (Port of Discharge), MBL (Master B/L), HBL (House B/L), booking references, carrier entities, vessels, and voyages.
   - `shp_units` (and subtype tables `shp_unit_containers`, `shp_unit_bulk`, `shp_unit_packages`, `shp_unit_vehicles`) owns handling units, ISO container types, seal numbers, tare weights, payloads, and nested packages.
   - `shp_execution_plans` and `shp_execution_legs` decompose the route into sequenced legs with transport modes (`ROAD_TRUCK`, `OCEAN_VESSEL`, `BARGE`, `AIR_FREIGHT`, `RAIL_FREIGHT`, `PORT_TERMINAL_HANDLING`, `WAREHOUSE_STAGING`, `CUSTOMS_CLEARANCE`).

2. **Cross-Domain Dispatch Semantics:**
   - When an execution leg requires Trucking haulage, Customs clearance, or Warehouse staging, Forwarding emits an asynchronous cross-domain command message: `svc_service_requests` (ADR-033).
   - Forwarding sets `source_domain = 'FORWARDING'`, `target_domain = 'TRUCKING' | 'CUSTOMS' | 'WAREHOUSE'`, and links `shipment_id` + `execution_leg_id`.
   - Executing SBUs receive the command and manage their own domain lifecycles independently.

3. **Fulfillment Separation:**
   - `fulfillments` and `fulfillment_allocations` MUST NOT duplicate POL, POD, MBL, HBL, container numbers, seal numbers, or leg sequencing.
   - Fulfillment references Forwarding via optional `shipment_id` on Forwarding allocations.

---

## 3. Invariants & Rules

1. **Forwarding Sovereignty:** Forwarding movement mechanics reside strictly within `shp_shipments` and its child tables (`shp_units`, `shp_execution_legs`, `shp_manifest_items`, `shp_milestones`).
2. **No Second Forwarding Engine:** Fulfillment MUST NOT create parallel shipment, container, or execution leg tables.
3. **Leg Dispatch via Service Requests:** Multi-modal leg execution by peer SBUs MUST be commanded via `svc_service_requests`, never via direct DB writes into peer SBU tables.
4. **Tenant Isolation:** All shipment and execution leg operations MUST enforce tenant isolation via server `IdentityContext` and RLS `tenant_id = public.get_my_tenant_id()`.

---

## 4. Forbidden Patterns

- **FORBIDDEN:** Adding POL, POD, MBL, HBL, vessel, voyage, container, or leg sequence columns to `public.fulfillments` or `public.fulfillment_allocations`.
- **FORBIDDEN:** Forwarding execution legs directly mutating `job_orders` or `wh_inventory` without routing through `svc_service_requests`.
- **FORBIDDEN:** Fulfillment directly managing container stuffing or multimodal leg resequencing.

---

## 5. Consequences & Implementation Scope

- **Consequences:** Forwarding maintains complete domain sovereignty for complex multimodal and containerized transport, while Fulfillment remains clean and focused on commercial progress accounting.
- **Scope Note:** **This ADR does NOT authorize implementation during U-16A.** Implementation of leg dispatch adapters is deferred to the next authorized implementation phase (U-17).
