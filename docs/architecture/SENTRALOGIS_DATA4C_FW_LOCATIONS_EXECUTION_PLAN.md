# SENTRALOGIS — DATA-4C
# fw_locations EXECUTION PLAN

**Date:** 2026-09-02  
**Phase:** DATA-4C  
**Nature:** Execution Design ONLY  

---

## 1. FK Migration Sequence

### Step 1: Create canonical records

```sql
-- For each fw_locations record, create md_locations record
INSERT INTO md_locations (tenant_id, location_code, name, location_type, external_code)
SELECT 
  e.tenant_id,
  'FW-' || fl.location_id::TEXT,
  fl.name,
  CASE fl.type
    WHEN 'PORT' THEN 'PORT'
    WHEN 'WAREHOUSE' THEN 'WAREHOUSE'
    WHEN 'DELIVERY_POINT' THEN 'DELIVERY_POINT'
  END,
  fl.location_id::TEXT
FROM fw_locations fl
JOIN md_entities e ON e.tenant_id = fl.tenant_id
WHERE NOT EXISTS (
  SELECT 1 FROM md_locations ml WHERE ml.external_code = fl.location_id::TEXT
);
```

### Step 2: Migrate FK — origin_port_id

```sql
-- Add new column
ALTER TABLE fw_order_headers ADD COLUMN origin_location_id UUID REFERENCES md_locations(id);

-- Populate from mapping
UPDATE fw_order_headers oh
SET origin_location_id = ml.id
FROM fw_locations fl
JOIN md_locations ml ON ml.external_code = fl.location_id::TEXT
WHERE oh.origin_port_id = fl.location_id;

-- Drop old FK and column
ALTER TABLE fw_order_headers DROP CONSTRAINT fk_fw_order_headers_origin_port;
ALTER TABLE fw_order_headers RENAME COLUMN origin_port_id TO _legacy_origin_port_id;
-- After verification: ALTER TABLE fw_order_headers DROP COLUMN _legacy_origin_port_id;
```

### Step 3: Migrate FK — dest_port_id

Same pattern as Step 2.

### Step 4: Migrate FK — start_location_id

```sql
ALTER TABLE fw_legs ADD COLUMN start_location_id UUID REFERENCES md_locations(id);
UPDATE fw_legs leg
SET start_location_id = ml.id
FROM fw_locations fl
JOIN md_locations ml ON ml.external_code = fl.location_id::TEXT
WHERE leg.start_location_id = fl.location_id;
ALTER TABLE fw_legs DROP CONSTRAINT fk_fw_legs_start_location;
ALTER TABLE fw_legs RENAME COLUMN start_location_id TO _legacy_start_location_id;
```

### Step 5: Migrate FK — end_location_id

Same pattern as Step 4.

### Step 6: Zero-consumer proof

```sql
SELECT COUNT(*) FROM fw_location_id WHERE location_id IS NOT NULL;
-- Expected: 0 references remaining
```

### Step 7: Deprecation

```sql
-- After zero-consumer proof
DROP TABLE fw_locations;
```

---

## 2. Validation Queries

| Step | Query | Expected |
|------|-------|----------|
| 1 | COUNT(*) FROM md_locations WHERE external_code LIKE FW-% | = COUNT(*) FROM fw_locations |
| 2 | COUNT(*) FROM fw_order_headers WHERE origin_location_id IS NULL | 0 |
| 3 | COUNT(*) FROM fw_order_headers WHERE dest_location_id IS NULL | 0 |
| 4 | COUNT(*) FROM fw_legs WHERE start_location_id IS NULL | 0 |
| 5 | COUNT(*) FROM fw_legs WHERE end_location_id IS NULL | 0 |

---

## 3. Rollback

| Step | Reversible? | Method |
|------|-------------|--------|
| 1 | YES | DELETE FROM md_locations WHERE external_code LIKE 'FW-%' |
| 2 | YES | Restore from _legacy_origin_port_id |
| 3 | YES | Restore from _legacy_dest_port_id |
| 4 | YES | Restore from _legacy_start_location_id |
| 5 | YES | Restore from _legacy_end_location_id |
| 7 | NO | Point of no return |

---

**END OF fw_locations EXECUTION PLAN**
