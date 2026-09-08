# SENTRALOGIS — DATA-4C
# ROLLBACK PLAN

**Date:** 2026-09-02  
**Phase:** DATA-4C  
**Nature:** Execution Design ONLY  

---

## 1. Track A Rollback

| Step | Reversible? | Method | Point of No Return |
|------|-------------|--------|-------------------|
| Create md_locations | YES | DELETE FROM md_locations WHERE external_code LIKE 'FW-%' | — |
| Add new FK columns | YES | ALTER TABLE ... DROP COLUMN | — |
| Populate new columns | YES | UPDATE ... SET new_col = NULL | — |
| Drop old FK constraints | YES | Re-add constraint | — |
| Drop legacy columns | YES | Re-add column + data | — |
| DROP fw_locations | **NO** | — **POINT OF NO RETURN** — |

### Rollback SQL Concept (before point of no return)

```sql
-- Restore fw_locations references
UPDATE fw_order_headers oh
SET origin_port_id = ml.external_code::UUID
FROM md_locations ml
WHERE oh.origin_location_id = ml.id;

-- Re-add old columns
ALTER TABLE fw_order_headers ADD COLUMN origin_port_id UUID REFERENCES fw_locations(id);
ALTER TABLE fw_order_headers DROP COLUMN origin_location_id;
```

---

## 2. Track B Rollback

| Step | Reversible? | Method |
|------|-------------|--------|
| Code changes | YES | Git revert |
| party_roles records | YES | DELETE FROM party_roles WHERE role_type = 'VENDOR' |
| is_vendor column | YES | Never removed until zero-consumer proof |

**Point of None Return:** is_vendor column removal (irreversible without backup)

---

## 3. Backup Requirements

| Item | Method |
|------|--------|
| fw_locations data | pg_dump before migration |
| Application code | Git commit before changes |
| party_roles data | Backup before any deletion |

---

**END OF ROLLBACK PLAN**
