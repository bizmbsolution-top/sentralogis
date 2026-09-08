# SENTRALOGIS — LEGACY MIGRATION MATRIX v1.0
## Detailed Migration, Transformation & Deprecation Strategy
**Document Version:** 1.0.0-MIGRATION-MATRIX  
**Status:** APPROVED ARCHITECTURAL STANDARD  
**Classification:** Internal Technical Standard  

---

# 1. COMPREHENSIVE TABLE DISPOSITION MATRIX

```
+------------------------------------------------------------------------------------------------------------------------+
|                                              LEGACY OBJECT MIGRATION MATRIX                                            |
+------------------------------------------------------------------------------------------------------------------------+
| Legacy Table / Object        | Action       | Target Table(s)                  | Migration Order | Production Risk     |
+------------------------------+--------------+----------------------------------+-----------------+---------------------+
| `work_orders`                | ADAPT        | `commercial_work_orders`         | Phase 1         | Low (Zero downtime) |
| `wo_items`                   | DECOMPOSE    | `commercial_line_items`, `shp_*` | Phase 2         | Medium              |
| `job_orders` (Trucking)      | KEEP&ISOLATE | `trk_job_orders`                 | Phase 1         | Low (No code change)|
| `job_routes`                 | KEEP         | `trk_job_routes`                 | Phase 1         | Low                 |
| `job_tracking`               | KEEP         | `trk_job_tracking`               | Phase 1         | Low                 |
| `fw_consolidations`          | MIGRATE      | `shp_shipments` + `shp_legs`     | Phase 4         | Medium              |
| `fw_container_assignments`   | REPLACE      | `shp_units` (Type: CONTAINER)    | Phase 4         | Medium              |
| `fw_box_assignments`         | REPLACE      | `shp_units` (Type: PACKAGE)      | Phase 4         | Low                 |
| `fw_box_items`               | REPLACE      | `shp_manifest_items`             | Phase 4         | Low                 |
| `fw_container_items`         | REPLACE      | `shp_manifest_items` + `shp_legs`| Phase 4         | High (Active tracking)|
| `fw_order_headers`           | REPLACE      | `shp_shipments`                  | Phase 4         | Low                 |
| `fw_legs` (Corrupt File 176) | DELETE LATER | `shp_execution_legs`             | Phase 0         | Low                 |
| `fw_price_master`            | ADAPT        | `commercial_pricing_tariffs`     | Phase 3         | Medium              |
| `fw_locations`               | DELETE LATER | `md_locations`                   | Phase 0         | Low                 |
| `wo_work_orders` (Migr 032)  | ARCHIVE      | None (Orphaned)                  | Phase 6         | Zero                |
| `wo_job_orders` (Migr 032)   | ARCHIVE      | None (Orphaned)                  | Phase 6         | Zero                |
+------------------------------------------------------------------------------------------------------------------------+
```

---

# 2. DETAILED TRANSFORMATION SPECIFICATIONS

### A. `work_orders` $\rightarrow$ `commercial_work_orders`
- **Current Purpose:** Hybrid commercial order and execution trigger.
- **Target Purpose:** Pure commercial agreement between Customer and Sentralogis.
- **Data Transformation:**
  ```sql
  INSERT INTO commercial_work_orders (
    id, tenant_id, wo_number, customer_id, service_scope_id, order_date, status, created_at, updated_at
  )
  SELECT 
    w.id, w.tenant_id, w.wo_number, w.customer_id, 
    COALESCE((SELECT id FROM commercial_service_scopes WHERE scope_code = 'DEFAULT_DAP' LIMIT 1), '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(w.order_date, CURRENT_DATE), 'CONFIRMED', w.created_at, w.updated_at
  FROM work_orders w;
  ```
- **Deprecation Condition:** When all commercial endpoints read/write to `commercial_work_orders`.

### B. `fw_consolidations` $\rightarrow$ `shp_shipments` & `shp_execution_legs`
- **Current Purpose:** Manages domestic sea consolidations.
- **Target Purpose:** Canonical `Shipment` aggregate root with an Ocean `ExecutionLeg`.
- **Data Transformation:**
  ```sql
  INSERT INTO shp_shipments (
    id, tenant_id, shipment_number, work_order_id, service_scope_id, customer_id, 
    origin_location_id, destination_location_id, global_status, master_bl_number, etd, eta, created_at
  )
  SELECT 
    c.id, c.tenant_id, c.consol_number, 
    (SELECT id FROM commercial_work_orders WHERE tenant_id = c.tenant_id LIMIT 1),
    (SELECT id FROM commercial_service_scopes WHERE tenant_id = c.tenant_id LIMIT 1),
    COALESCE(c.shipping_line_id, (SELECT id FROM md_entities WHERE tenant_id = c.tenant_id LIMIT 1)),
    COALESCE((SELECT id FROM md_locations WHERE name = c.origin_port LIMIT 1), '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE((SELECT id FROM md_locations WHERE name = c.destination_port LIMIT 1), '00000000-0000-0000-0000-000000000000'::uuid),
    'IN_TRANSIT', c.voyage_number, c.etd, c.eta, c.created_at
  FROM fw_consolidations c;
  ```

### C. `fw_container_items` $\rightarrow$ `shp_manifest_items` & `shp_units`
- **Current Purpose:** Tracks cargo items per container with tracking tokens and ghost WO links.
- **Target Purpose:** Split into physical units (`shp_units` + `shp_unit_containers`) and commodity lines (`shp_manifest_items`).
- **Data Transformation:** Preserves `tracking_token` so active customer tracking URLs (`/track/fwd/[token]`) continue functioning without breaking customer links.

---

# 3. BACKWARD-COMPATIBILITY ADAPTER VIEWS

To allow existing dashboards to function during migration, PostgreSQL Views are established:

```sql
-- Compatibility View for Legacy Forwarding Consolidation Queries
CREATE OR REPLACE VIEW v_legacy_fw_consolidations AS
SELECT 
  s.id,
  s.tenant_id,
  s.shipment_number AS consol_number,
  s.shipper_id AS shipping_line_id,
  e.name AS shipping_line_name,
  s.booking_reference AS vessel_name,
  s.master_bl_number AS voyage_number,
  loc_orig.name AS origin_port,
  loc_dest.name AS destination_port,
  s.etd::DATE AS etd,
  s.eta::DATE AS eta,
  s.actual_departure_at AS actual_etd,
  s.actual_delivery_at AS actual_eta,
  s.global_status::TEXT AS status,
  s.created_at,
  s.updated_at
FROM shp_shipments s
LEFT JOIN md_entities e ON s.shipper_id = e.id
LEFT JOIN md_locations loc_orig ON s.origin_location_id = loc_orig.id
LEFT JOIN md_locations loc_dest ON s.destination_location_id = loc_dest.id;
```

---
*Approved by Database Architecture & Legacy Migration Group*
