# SENTRALOGIS — DATA-4E-R
# ROLLBACK SPECIFICATION

**Date:** 2026-09-02  
**Phase:** DATA-4E-R  

---

## Rollback Operations

| Operation | Reversible? | Method |
|-----------|-------------|--------|
| Create md_locations records | YES | DELETE FROM md_locations WHERE external_code LIKE 'FW-%' |
| Add new FK columns | YES | ALTER TABLE ... DROP COLUMN |
| Populate new columns | YES | UPDATE ... SET new_col = NULL |
| Drop old FK constraints | YES | Re-add constraint |
| DROP fw_locations | **NO** | Point of no return |

## Point of No Return

| Track | Operation |
|-------|-----------|
| Track A | DROP fw_locations |

## Current Status

**No rollback needed** — no database mutation occurred.

---

**END OF ROLLBACK SPECIFICATION**
