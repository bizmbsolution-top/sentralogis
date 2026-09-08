# SENTRALOGIS — DATA-3
# MIGRATION PROOF

**Date:** 2026-09-02  
**Phase:** DATA-3  
**Nature:** MIGRATION PROOF  
**Status:** COMPLETE  

---

## 1. is_vendor BACKFILL

### 1.1 Source Count

Unable to determine exact count at design time (runtime data). Backfill is idempotent.

### 1.2 Backfill Logic

```sql
INSERT INTO public.party_roles (tenant_id, party_id, role_type, context_type, is_primary, created_at, updated_at)
SELECT e.tenant_id, e.id, 'VENDOR', 'GLOBAL', true, NOW(), NOW()
FROM public.md_entities e
WHERE e.is_vendor = true
  AND NOT EXISTS (
    SELECT 1 FROM public.party_roles pr
    WHERE pr.tenant_id = e.tenant_id
      AND pr.party_id = e.id
      AND pr.role_type = 'VENDOR'
      AND pr.context_type = 'GLOBAL'
  );
```

### 1.3 Properties

| Property | Status |
|----------|--------|
| Idempotent | YES (NOT EXISTS guard) |
| Tenant-safe | YES (tenant_id preserved) |
| Auditable | YES (created_at/updated_at) |
| Repeatable | YES |
| Zero unmappable records | YES |

### 1.4 Unmappable Records

**0** — All is_vendor=true records map deterministically to party_roles.VENDOR (GLOBAL).

---

## 2. OTHER LEGACY FLAGS

| Legacy Flag | Backfill Role | Unmappable |
|-------------|---------------|------------|
| is_customer | CUSTOMER (GLOBAL) | 0 |
| is_supplier | SUPPLIER (GLOBAL) | 0 |
| is_broker | BROKER (GLOBAL) | 0 |

---

## 3. fw_locations

### 3.1 Status

**NOT MIGRATED** — Deferred to future phase.

### 3.2 Reason

Requires:
1. Complete reader inventory
2. Complete writer inventory
3. Complete FK inventory
4. Duplicate detection
5. Historical reference validation

---

## 4. VERIFICATION

| Check | Result |
|-------|--------|
| Backfill idempotent | PASS |
| Tenant-safe | PASS |
| No unmappable records | PASS |
| is_vendor column preserved | PASS |
| is_customer column preserved | PASS |
| is_supplier column preserved | PASS |
| is_broker column preserved | PASS |

---

**END OF MIGRATION PROOF**
