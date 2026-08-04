# WAREHOUSE DOMAIN — CURRENT STATE DISCOVERY

This document maps the exact existing implementation of the Warehouse (CFS) domain found in the repository as of Phase 3A. 

## 1. Inventory & Receiving
**Current Implementation**:
- **Tables**: `wh_inventory`, `wh_inventory_movements`.
- **UI**: `app/(customer)/customer/warehouse/inbound/page.tsx`, `/inventory/page.tsx`.
- **Current Flow**: Goods arrive at the warehouse and are logged into `wh_inventory`. An audit log is automatically appended to `wh_inventory_movements`.
- **Tech Debt**: Inventory status is completely coupled to the presentation layer and Supabase triggers. There is no `ReceiveGoodsUseCase` validating bounds or permissions at the application level.

## 2. Put Away & Bin Allocation
**Current Implementation**:
- **Tables**: `wh_inventory.location_id` (Bin allocation).
- **Current Flow**: Inventory is assigned a spatial `location_id`. Space commitments (PALLET/CBM) are checked against `md_contract_warehouses`.

## 3. Picking, Packing, & Repacking (Bundling/Kitting)
**Current Implementation**:
- **Tables**: `wh_picking_details`, `repacking_bundling_kitting` tables (found in migrations 141-157).
- **Current Flow**: Items are picked (`wh_picking_details` linked to `inventory_id`). Stock opname and repacking use heavy database logic.
- **Tech Debt**: The repacking logic is notoriously brittle, relying entirely on raw Postgres RPCs (`repacking_rpc_ultimate_fix.sql`). This is a massive violation of Clean Architecture and places complex domain logic entirely in the Infrastructure layer.

## 4. Stock Movement
**Current Implementation**:
- **Flow**: Any mutation to `wh_inventory` creates a cascade into `wh_inventory_movements`.
- **Tech Debt**: Because the movement log is handled by a database trigger, the Application Layer has no visibility into the Domain Event (e.g., `InventoryMoved`).

## 5. Shipment & Outbound
**Current Implementation**:
- **UI**: `app/(customer)/customer/warehouse/outbound/page.tsx`.
- **Flow**: Goods are marked for outbound dispatch.
- **Tech Debt**: Again, handled purely via direct REST API patches rather than orchestrating a `Shipment.dispatch()` aggregate method.
