# Warehouse Domain Audit

## 1. Overview
The Warehouse (CFS) Domain manages stock opname, inventory tracking, kitting/bundling (repacking), bin locations, and inbound/outbound logistics.

## 2. Existing Implementations & UI Pages
- **Commercial Dashboard**: `app/(dashboard)/commercial/quotations/...` (Warehouse selection and operation type INBOUND/OUTBOUND).
- **HQ Contracts**: `app/(dashboard)/hq/business/contracts/...` (Committed space, UOM space configurations like PALLET or CBM).
- **Customer Portal**: `app/(customer)/customer/warehouse/...` (Live Inventory, Inbound Receipts, Outbound Shipments).

## 3. Existing Database Tables
- `md_warehouses`: Master data mapping warehouses to organizations/tenants.
- `md_contract_warehouses`: Billing and commercial limits per customer.
- `wo_organization_users`: Assignment of staff to specific warehouses.
- Legacy Repacking tables: Triggers, RPCs, and migrations related to `repacking_bundling_kitting`, `stock_opname`, `parcel_consolidation`, and `inventory_selectors`.

## 4. Existing Business Logic (Tech Debt)
- **Database Trigger Overload**: The warehouse domain leans heavily on Supabase RPCs (e.g., `repacking_rpc_ultimate_fix.sql`) to execute business rules inside the database. This violates the Application Layer boundaries.
- **UI Coupled Routing**: The Customer Portal UI contains raw logic to route and query inbound vs outbound operations based on database enum values rather than interacting with a domain service.
- **Missing Bounded Contexts**: Inventory adjustments and stock opname logic are intermingled with Commercial Quotations and SBU metadata, leading to high coupling.

## 5. Required Domain Services
- `InventoryManager`: To orchestrate Receiving, Picking, and PutAway aggregates.
- `BinAllocator`: To handle the spatial algorithms for matching pallets to UOM-committed spaces.
- `MovementFSM`: To trace the lifecycle of a SKU from Inbound Receipt to Outbound Shipment.
