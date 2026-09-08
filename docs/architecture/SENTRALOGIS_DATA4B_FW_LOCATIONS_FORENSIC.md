# SENTRALOGIS — DATA-4B
# fw_locations FORENSIC

**Date:** 2026-09-02  
**Phase:** DATA-4B  
**Nature:** FORENSIC DISCOVERY  

---

## Schema

```sql
CREATE TABLE fw_locations (
  location_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type location_type NOT NULL,  -- ENUM: PORT, WAREHOUSE, DELIVERY_POINT
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Readers

| Reader | File | Runtime |
|--------|------|---------|
| fw_order_headers.origin_port_id | FK reference | YES (via fw_order_headers) |
| fw_order_headers.dest_port_id | FK reference | YES (via fw_order_headers) |
| fw_legs.start_location_id | FK reference | YES (via fw_legs) |
| fw_legs.end_location_id | FK reference | YES (via fw_legs) |

**Direct runtime readers: 0** (all access through fw_order_headers/fw_legs)

---

## Writers

**Direct runtime writers: 0**

---

## Foreign Keys

| Table | Column | References |
|-------|--------|------------|
| fw_order_headers | origin_port_id | fw_locations.location_id |
| fw_order_headers | dest_port_id | fw_locations.location_id |
| fw_legs | start_location_id | fw_locations.location_id |
| fw_legs | end_location_id | fw_locations.location_id |

---

## Data Mapping

| fw_locations.type | md_locations.location_type | Confidence |
|-------------------|---------------------------|------------|
| PORT | PORT | HIGH |
| WAREHOUSE | WAREHOUSE | HIGH |
| DELIVERY_POINT | DELIVERY_POINT | HIGH |

---

## Deduplication Strategy

| Candidate | Approach |
|-----------|----------|
| tenant_id + external_code | Primary identity |
| tenant_id + normalized name | Fallback |

---

## Historical Data

Legacy location IDs appear in:
- fw_order_headers (origin/dest)
- fw_legs (start/end)

**Recommendation:** Preserve historical references via immutable snapshots or dual-column approach during migration.

---

## Migration Design

1. Create md_locations records for each fw_locations record
2. Update fw_order_headers.origin_port_id/dest_port_id to reference md_locations
3. Update fw_legs.start_location_id/end_location_id to reference md_locations
4. Verify zero consumers
5. Drop fw_locations

---

## Zero-Consumer Proof

```sql
-- Verify no FK references remain
SELECT COUNT(*) FROM fw_order_headers WHERE origin_port_id IN (SELECT location_id FROM fw_locations);
SELECT COUNT(*) FROM fw_legs WHERE start_location_id IN (SELECT location_id FROM fw_locations);
-- Expected: 0
```

---

## Blockers

**NONE**

---

**END OF fw_locations FORENSIC**
