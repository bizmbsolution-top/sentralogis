# SENTRALOGIS — DATA-4E-R8
# ROLLBACK BOUNDARY

**Date:** 2026-09-02  
**Phase:** DATA-4E-R8  

---

## Rollback Mechanisms

| Mechanism | Description |
|-----------|-------------|
| A. Transaction rollback | If migration fails before COMMIT, all mutations rollback |
| B. Post-commit reversal | Requires separate compensating migration |

## Irreversibility Boundary

| Operation | Reversible? |
|-----------|-------------|
| Create md_locations | YES (with exact provenance tracking) |
| Transform FK values | YES (reverse JOIN) |
| Drop old FK constraints | YES (re-add) |
| Add new FK constraints | YES (drop) |
| COMMIT | IRREVERSIBLE |

## Canonical Provenance

**Option A (preferred):** Transaction-only rollback. If migration fails, all changes rollback automatically.

**Option B:** If post-commit rollback needed, use exact reverse mapping:
```sql
UPDATE fw_order_headers oh SET origin_port_id = fl.location_id
FROM md_locations ml JOIN fw_locations fl ON fl.location_id::TEXT = ml.external_code AND fl.tenant_id = ml.tenant_id
WHERE oh.origin_port_id = ml.id AND oh.tenant_id = ml.tenant_id;
```

---

**END OF ROLLBACK BOUNDARY**
