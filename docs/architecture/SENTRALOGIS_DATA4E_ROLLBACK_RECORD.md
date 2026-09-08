# SENTRALOGIS — DATA-4E
# ROLLBACK RECORD

**Date:** 2026-09-02  
**Phase:** DATA-4E  
**Nature:** Rollback Readiness and Execution Record  

---

## 1. Track A Rollback

| Step | Reversible? | Method |
|------|-------------|--------|
| Create md_locations | YES | DELETE FROM md_locations WHERE external_code LIKE 'FW-%' |
| Add new FK columns | YES | ALTER TABLE ... DROP COLUMN |
| Populate new columns | YES | UPDATE ... SET new_col = NULL |
| DROP fw_locations | NO | Point of no return |

## 2. Track B Rollback

| Step | Reversible? | Method |
|------|-------------|--------|
| Code changes | YES | Git revert |
| party_roles records | YES | DELETE FROM party_roles WHERE role_type = 'VENDOR' |
| is_vendor column | YES | Never removed |

## 3. Point of No Return

| Track | Operation |
|-------|-----------|
| Track A | DROP fw_locations |
| Track B | is_vendor column removal |

---

**END OF ROLLBACK RECORD**
