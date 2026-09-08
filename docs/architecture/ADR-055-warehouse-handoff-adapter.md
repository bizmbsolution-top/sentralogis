# ADR-055 — Warehouse SBU Handoff Adapter Semantics

**Status:** RATIFIED (U-17A architectural ratification, 2026-08-28)  
**Date:** 2026-08-28  
**Depends on:** ADR-033 (Service Request Command), ADR-048 (Multi-SBU Composition), ADR-051 (Operational Handoff Contract)  

---

## 1. Context

Warehouse execution involves physical goods receiving, pallet staging, bin putaway, inventory stock management, and order picking managed via WMS aggregates (`wh_receipt_orders`, `wh_picking_lists`, `wh_inventory`).

## 2. Decision

**`WarehouseHandoffAdapter` is the translation boundary into WMS execution.**

$$\text{Warehouse Allocation} \xrightarrow{\quad\text{Operational Handoff}\quad} \text{WarehouseHandoffAdapter} \longrightarrow \text{svc\_service\_requests(target\_domain='WAREHOUSE')} \longrightarrow \text{WMS Orders}$$

### 2.1 Warehouse Sovereignty
Warehouse domain remains sovereign over:
1. `wh_receipt_orders` / `wh_inbound_receipts` (Inbound receiving operations).
2. `wh_picking_lists` / `wh_outbound_shipments` (Outbound pick-pack operations).
3. `wh_inventory` / `wh_inventory_movements` (Stock balance, bin locations, lot/batch tracking).
4. Physical warehouse resources: Forklifts, staging docks, storage racks, and warehouse staff.

### 2.2 Adapter Responsibilities:
1. **Validation:** Verifies warehouse facility ID, SKU details, packaging units, and temperature controls.
2. **Command Dispatch:** Emits `svc_service_requests(target_domain='WAREHOUSE')` carrying receipt or picking payloads.
3. **Reference Binding:** Binds `assigned_domain_reference` (`reference_type = 'SERVICE_REQUEST'`, `reference_id = svc_service_requests.id`).
4. **Lifecycle Feedback:** Translates warehouse putaway / picking confirmations into allocation quantity updates (`delivered_quantity`).

### 2.3 Boundary Constraints:
- **No Inventory Clutter:** Fulfillment and OperationalHandoff must not contain bin, rack, or pallet location fields.
- **Physical Ownership:** Inventory ownership begins only upon confirmed putaway in `wh_inventory`.
