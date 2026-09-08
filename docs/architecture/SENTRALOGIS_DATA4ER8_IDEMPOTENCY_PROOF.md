# SENTRALOGIS — DATA-4E-R8
# IDEMPOTENCY PROOF

**Date:** 2026-09-02  
**Phase:** DATA-4E-R8  

---

## First Execution

| Step | Behavior |
|------|----------|
| Create md_locations | INSERT new records |
| Drop old FK | DROP constraints |
| Transform values | UPDATE to md_locations.id |
| Add new FK | ADD constraints |

## Second Execution

| Step | Behavior |
|------|----------|
| Create md_locations | ON CONFLICT DO NOTHING (records exist) |
| Drop old FK | DROP CONSTRAINT IF EXISTS (already gone) |
| Transform values | UPDATE matches 0 rows (values already canonical) |
| Add new FK | FAIL if constraint already exists |

**Issue:** Second execution fails at `ADD CONSTRAINT` because constraint already exists.

**Solution:** Use `DROP CONSTRAINT IF EXISTS` before `ADD CONSTRAINT`, or use a conditional approach.

---

**END OF IDEMPOTENCY PROOF**
