# SENTRALOGIS — DATA-4B
# MIGRATION DEPENDENCY GRAPH

**Date:** 2026-09-02  
**Phase:** DATA-4B  
**Nature:** FORENSIC DISCOVERY  

---

## Dependency Graph

```
md_entities (canonical)
     │
     ├── party_roles
     │       │
     │       ├── VENDOR ← is_vendor (legacy)
     │       ├── CUSTOMER ← is_customer (legacy)
     │       ├── SUPPLIER ← is_supplier (legacy)
     │       ├── BROKER ← is_broker (legacy)
     │       └── CARRIER
     │
     ├── external_references
     │
     └── md_fleets (domain-specific)

md_locations (canonical)
     │
     ├── location hierarchy (parent_id)
     │
     ├── pol_location_id (shp_shipments)
     ├── pod_location_id (shp_shipments)
     │
     └── fw_locations (legacy) ← MIGRATION TARGET
             │
             ├── fw_order_headers.origin_port_id
             ├── fw_order_headers.dest_port_id
             ├── fw_legs.start_location_id
             └── fw_legs.end_location_id

is_vendor (legacy) ← MIGRATION TARGET
     │
     ├── assignment.ts (6 refs)
     ├── assignmentSave.ts (2 refs)
     ├── UI filters (~50 refs)
     ├── UI badges (~30 refs)
     ├── UI forms (~20 refs)
     ├── EasyGoSyncService (2 refs)
     └── Other (~21 refs)
```

---

## Critical Path

```
Track A: fw_locations
─────────────────────
1. Create md_locations from fw_locations
2. Migrate FK references (fw_order_headers, fw_legs)
3. Zero-consumer proof
4. Drop fw_locations

Track B: is_vendor
──────────────────
1. Verify backfill
2. Migrate consumers one-by-one
3. Zero-consumer proof
4. Remove column
```

---

## Independence

| Track A depends on Track B? | NO |
|-----------------------------|-----|
| Track B depends on Track A? | NO |
| Can run in parallel? | YES |

---

**END OF MIGRATION DEPENDENCY GRAPH**
