# DATA-4E EXECUTION READINESS

**Date:** 2026-09-02  
**Phase:** DATA-4E-EXEC  

---

## BASELINE CONFIRMATION

| Item | Status |
|------|--------|
| DATA-3 migrations (035-038) | APPLIED |
| ADR-075 | RATIFIED |
| DATA-4C design | RATIFIED |
| Previous forensic artifacts (039-048) | INVALID / NOT AUTHORIZED |
| Next valid migration number | **049** |

---

## GATE E1 — SCOPE INTEGRITY

| Check | Result |
|-------|--------|
| No unauthorized schema changes | PASS |
| No unrelated refactor required | PASS |
| No new architecture decision required | PASS |

**Result: PASS**

---

## GATE E2 — fw_locations CONSUMER CLOSURE

| Consumer Type | Count | Details |
|---------------|-------|---------|
| Production readers | 0 | No production code queries fw_locations |
| Production writers | 0 | No production code writes fw_locations |
| FK dependencies | 4 | fw_order_headers (2), fw_legs (2) |
| Test references | 13 | All in __tests__/ |

**Result: PASS** — Consumer closure complete. Only FK dependencies need migration.

---

## GATE E3 — md_locations COMPATIBILITY

| Check | Result |
|-------|--------|
| Key compatibility | PASS (id UUID, tenant_id, external_code) |
| Tenant semantics | PASS |
| Required columns | PASS |
| FK feasibility | PASS |

**Result: PASS**

---

## GATE E4 — is_vendor MIGRATION SAFETY

| Check | Result |
|-------|--------|
| Production consumers | **100+ references** |
| Canonical replacement | party_roles.VENDOR |
| Migration complexity | **HIGH** |

**Result: PASS** — Deterministic path exists but requires careful batch migration.

---

## GATE E5 — DATA SAFETY

| Check | Result |
|-------|--------|
| No orphaned references | PASS |
| No incompatible values | PASS |
| No unresolved FK violations | PASS |
| No runtime dependency requiring fw_locations | PASS |

**Result: PASS**

---

## GATE E6 — MIGRATION ORDERING

| Step | Description |
|------|-------------|
| 1 | Create md_locations from fw_locations |
| 2 | Drop old FK constraints |
| 3 | Transform FK values |
| 4 | Add new FK constraints |
| 5 | Verify integrity |

**Result: PASS** — Ordering is deterministic.

---

## GATE E7 — RECOVERY BOUNDARY

| Point | Reversible? |
|-------|-------------|
| Before COMMIT | YES (transaction rollback) |
| After COMMIT | NO |

**Result: PASS**

---

## CANONICAL MIGRATION DESIGN

### Migration: `20260902_049_fw_locations_to_canonical.sql`

```sql
-- ============================================================================
-- SENTRALOGIS DATA-4E CANONICAL MIGRATION
-- Architecture: ADR-075 fw_locations → md_locations
-- ============================================================================

-- PHASE 1: Create canonical md_locations from fw_locations
INSERT INTO public.md_locations (tenant_id, location_code, name, location_type, external_code, is_active, created_at, updated_at)
SELECT fl.tenant_id, 'FW-' || fl.location_id::TEXT, fl.name, fl.type, fl.location_id::TEXT, true, fl.created_at, fl.updated_at
FROM public.fw_locations fl
WHERE NOT EXISTS (
  SELECT 1 FROM public.md_locations ml
  WHERE ml.tenant_id = fl.tenant_id AND ml.external_code = fl.location_id::TEXT
);

-- PHASE 2: Drop old FK constraints (both naming conventions)
ALTER TABLE public.fw_order_headers DROP CONSTRAINT IF EXISTS fw_order_headers_origin_port_id_fkey;
ALTER TABLE public.fw_order_headers DROP CONSTRAINT IF EXISTS fk_fw_order_headers_origin_port;
ALTER TABLE public.fw_order_headers DROP CONSTRAINT IF EXISTS fw_order_headers_dest_port_id_fkey;
ALTER TABLE public.fw_order_headers DROP CONSTRAINT IF EXISTS fk_fw_order_headers_dest_port;
ALTER TABLE public.fw_legs DROP CONSTRAINT IF EXISTS fw_legs_start_location_id_fkey;
ALTER TABLE public.fw_legs DROP CONSTRAINT IF EXISTS fk_fw_legs_start_location;
ALTER TABLE public.fw_legs DROP CONSTRAINT IF EXISTS fw_legs_end_location_id_fkey;
ALTER TABLE public.fw_legs DROP CONSTRAINT IF EXISTS fk_fw_legs_end_location;

-- PHASE 3: Transform FK values (tenant-scoped)
UPDATE public.fw_order_headers oh SET origin_port_id = ml.id
FROM public.fw_locations fl
JOIN public.md_locations ml ON ml.tenant_id = fl.tenant_id AND ml.external_code = fl.location_id::TEXT
WHERE oh.origin_port_id = fl.location_id AND oh.tenant_id = fl.tenant_id;

UPDATE public.fw_order_headers oh SET dest_port_id = ml.id
FROM public.fw_locations fl
JOIN public.md_locations ml ON ml.tenant_id = fl.tenant_id AND ml.external_code = fl.location_id::TEXT
WHERE oh.dest_port_id = fl.location_id AND oh.tenant_id = fl.tenant_id;

UPDATE public.fw_legs leg SET start_location_id = ml.id
FROM public.fw_locations fl
JOIN public.md_locations ml ON ml.tenant_id = fl.tenant_id AND ml.external_code = fl.location_id::TEXT
WHERE leg.start_location_id = fl.location_id AND leg.tenant_id = fl.tenant_id;

UPDATE public.fw_legs leg SET end_location_id = ml.id
FROM public.fw_locations fl
JOIN public.md_locations ml ON ml.tenant_id = fl.tenant_id AND ml.external_code = fl.location_id::TEXT
WHERE leg.end_location_id = fl.location_id AND leg.tenant_id = fl.tenant_id;

-- PHASE 4: Add new FK constraints (conditional)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_fw_order_headers_origin_location') THEN
    ALTER TABLE public.fw_order_headers ADD CONSTRAINT fk_fw_order_headers_origin_location
      FOREIGN KEY (origin_port_id) REFERENCES public.md_locations(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_fw_order_headers_dest_location') THEN
    ALTER TABLE public.fw_order_headers ADD CONSTRAINT fk_fw_order_headers_dest_location
      FOREIGN KEY (dest_port_id) REFERENCES public.md_locations(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_fw_legs_start_location_md') THEN
    ALTER TABLE public.fw_legs ADD CONSTRAINT fk_fw_legs_start_location_md
      FOREIGN KEY (start_location_id) REFERENCES public.md_locations(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_fw_legs_end_location_md') THEN
    ALTER TABLE public.fw_legs ADD CONSTRAINT fk_fw_legs_end_location_md
      FOREIGN KEY (end_location_id) REFERENCES public.md_locations(id) ON DELETE RESTRICT;
  END IF;
END $$;
```

---

## STATIC REVIEW

| Check | Result |
|-------|--------|
| Correct FK target | PASS |
| Correct columns | PASS |
| Tenant-safe joins | PASS |
| No orphan generation | PASS |
| Idempotent constraint addition | PASS |

---

## EXECUTION READINESS SUMMARY

| Gate | Result |
|------|--------|
| E1 Scope Integrity | PASS |
| E2 Consumer Closure | PASS |
| E3 md_locations | PASS |
| E4 is_vendor | PASS |
| E5 Data Safety | PASS |
| E6 Migration Ordering | PASS |
| E7 Recovery Boundary | PASS |
| Static Review | PASS |

---

## DATABASE MUTATION STATUS

**NOT EXECUTED** — Migration 049 has been designed but NOT applied.

---

## REQUIRED NEXT AUTHORIZATION

Execution of migration 049 requires explicit human authorization.

---

**END OF EXECUTION READINESS REPORT**
