# SENTRALOGIS — DATA-4E
# EXECUTION BASELINE

**Date:** 2026-09-02  
**Phase:** DATA-4E  
**Nature:** Pre-Execution Snapshot  

---

## 1. Repository State

| Item | Value |
|------|-------|
| Branch | master |
| Ahead of origin | 5 commits |
| Recent commit | 260127d — Fix invisible text on buttons in HQ Work Orders Rejected card |

## 2. Migration State

| Latest Migration | Date |
|------------------|------|
| 20260902_038_party_role_backfill.sql | 2026-09-02 |

## 3. Test Baseline

| Metric | Value |
|--------|-------|
| TypeScript | 0 errors |
| Full regression | 1273/1273 PASS |

## 4. Schema State

| Table | Status |
|-------|--------|
| fw_locations | Exists (legacy) |
| md_locations | Exists (canonical) |
| party_roles | Exists (DATA-3) |
| fw_order_headers | Exists (DEFERRED) |
| fw_legs | Exists |

## 5. FK State

| FK | References |
|----|------------|
| fw_order_headers.origin_port_id | fw_locations.location_id |
| fw_order_headers.dest_port_id | fw_locations.location_id |
| fw_legs.start_location_id | fw_locations.location_id |
| fw_legs.end_location_id | fw_locations.location_id |

## 6. Consumer State

| Legacy | Direct Readers | Direct Writers |
|--------|----------------|----------------|
| fw_locations | 0 | 0 |
| is_vendor | ~131 | 0 (column default only) |

---

**END OF EXECUTION BASELINE**
