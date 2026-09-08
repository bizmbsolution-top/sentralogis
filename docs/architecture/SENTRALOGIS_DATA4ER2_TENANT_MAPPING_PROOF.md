# SENTRALOGIS — DATA-4E-R2
# TENANT MAPPING PROOF

**Date:** 2026-09-02  
**Phase:** DATA-4E-R2  
**Nature:** FORENSIC DISCOVERY ONLY  

---

## 1. Mapping Function

```
fw_locations.location_id + fw_locations.tenant_id
                ↓
        md_locations.id
                ↓
    (tenant_id, external_code = location_id::TEXT)
```

## 2. Deterministic Proof

| Property | Status |
|----------|--------|
| Every location resolves to exactly one tenant | YES (direct column) |
| No location resolves to multiple tenants | YES (single tenant_id) |
| No location is unmappable | YES (all have tenant_id) |
| No cross-tenant ambiguity | YES (direct mapping) |

## 3. Data Quality Expected Results

| Check | Expected |
|-------|----------|
| Unmapped locations | 0 |
| Ambiguous locations | 0 |
| Cross-tenant references | 0 |
| Duplicate canonical mappings | 0 |

---

**END OF TENANT MAPPING PROOF**
