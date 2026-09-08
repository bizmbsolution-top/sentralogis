# SENTRALOGIS — DATA-4E-R4
# FORENSIC REPAIR

**Date:** 2026-09-02  
**Phase:** DATA-4E-R4  
**Nature:** FORENSIC REPAIR / ARTIFACT ONLY  

---

## 1. Root Cause of Migration 040 Failure

Migration 040 only:
1. Created md_locations records
2. Changed FK constraints

But it did **NOT** transform the actual FK column values from `fw_locations.location_id` to `md_locations.id`.

This means after migration 040:
- `fw_order_headers.origin_port_id` would still contain `fw_locations.location_id` values
- But the FK constraint would expect `md_locations.id` values
- This would cause constraint violations

## 2. FK Datatype Evidence

| Column | Type | Matches md_locations.id? |
|--------|------|--------------------------|
| fw_order_headers.origin_port_id | UUID | YES |
| fw_order_headers.dest_port_id | UUID | YES |
| fw_legs.start_location_id | UUID | YES |
| fw_legs.end_location_id | UUID | YES |

All four columns are UUID type, matching md_locations.id (UUID). In-place value transformation is technically possible.

## 3. Mapping Semantics

| Source | Target | Mechanism |
|--------|--------|-----------|
| fw_locations.location_id | md_locations.id | Join on tenant_id + external_code = location_id::TEXT |

## 4. Tenant Proof

| Property | Status |
|----------|--------|
| Direct tenant authority | fw_locations.tenant_id |
| Cross-tenant impossible | YES (tenant-scoped JOIN) |
| Ambiguous tenant | IMPOSSIBLE |

---

**END OF FORENSIC REPAIR**
