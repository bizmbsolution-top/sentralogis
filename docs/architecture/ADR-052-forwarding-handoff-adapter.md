# ADR-052 — Forwarding SBU Handoff Adapter Semantics

**Status:** RATIFIED (U-17A architectural ratification, 2026-08-28)  
**Date:** 2026-08-28  
**Depends on:** ADR-038 (Shipment $\to$ SO Reference), ADR-040 (Shipment $\ne$ Fulfillment), ADR-046 (Forwarding Multimodal Decomposition), ADR-051 (Operational Handoff Contract)  

---

## 1. Context

In Forwarding, physical logistics movements, container assignments, and multimodal execution routes are governed by `shp_shipments`, `shp_units`, and `shp_execution_legs`. The Forwarding Handoff Adapter converts a Forwarding allocation into an operational movement aggregate.

## 2. Decision

**`ForwardingHandoffAdapter` is the translation boundary into the Forwarding domain.**

$$\text{Forwarding Allocation} \xrightarrow{\quad\text{Operational Handoff}\quad} \text{ForwardingHandoffAdapter} \longrightarrow \text{shp\_shipments} \longrightarrow \text{shp\_execution\_legs}$$

### 2.1 Forwarding Sovereignty
Forwarding remains sovereign over:
1. `shp_shipments` (Logistics Movement Root).
2. `shp_units` (Container tracking, seals, tare/gross weights).
3. `shp_execution_legs` (Multimodal leg routing: Pre-carriage, Main carriage, On-carriage).
4. Physical movement metadata: POL, POD, MBL, HBL, Carrier, Vessel, Voyage, Booking references.

### 2.2 Adapter Responsibilities:
1. **Validation:** Validates origin/destination ports, container requirements, and shipping mode.
2. **Materialization / Association:**
   - Creates or links to `shp_shipments` using canonical `public.next_shipment_number()`.
   - Links `shp_shipments.sales_order_id` to the parent Sales Order (ADR-038).
3. **Reference Binding:** Binds `assigned_domain_reference` on the `OperationalHandoff` record (`reference_type = 'SHIPMENT'`, `reference_id = shp_shipments.id`).
4. **Lifecycle Feedback:** Translates `shp_shipments` milestones (`BOOKED`, `IN_TRANSIT`, `DELIVERED`) into handoff and allocation progress updates.

### 2.3 Boundary Constraints:
- **Zero Pollution:** Fulfillment contains zero POL, POD, MBL, HBL, vessel, or voyage columns.
- **Translation Only:** The adapter contains zero vessel booking or dispatch execution engines.
- **Split Shipment Support:** Multiple allocations under one fulfillment may bind to distinct `shp_shipments` records.
