# SENTRALOGIS — DATA-4E-R11
# EXECUTION READINESS AUDIT

**Date:** 2026-09-02  
**Phase:** DATA-4E-R11  

---

## Executive Gate: YELLOW — REPAIR REQUIRED

### Reason

R10 has critical defects that prevent authorization:
1. FK constraint names assumed wrong
2. Second-run NOT a true NO-OP
3. FK value state machine not enforced

---

## 1. Schema Truth

### fw_locations (from migrations 174, 024)

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| location_id | UUID | NO | PK |
| tenant_id | UUID | NO | Added by migration 024 |
| name | TEXT | NO | |
| type | location_type | NO | ENUM: PORT, WAREHOUSE, DELIVERY_POINT |
| created_at | TIMESTAMPTZ | NO | |
| updated_at | TIMESTAMPTZ | NO | |

### md_locations (from migrations 030, 036)

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| id | UUID | NO | PK |
| tenant_id | UUID | YES | FK → tenants |
| location_code | TEXT | NO | |
| name | TEXT | NO | |
| address | TEXT | NO | |
| location_type | TEXT | YES | Added by migration 036 |
| external_code | TEXT | YES | Added by migration 036 |
| parent_id | UUID | YES | Added by migration 036 |
| is_active | BOOLEAN | YES | |

**CRITICAL:** No unique constraint on (tenant_id, external_code).

### fw_order_headers (from migration 024)

| Column | FK Target | ON DELETE |
|--------|-----------|-----------|
| origin_port_id | fw_locations.location_id | RESTRICT |
| dest_port_id | fw_locations.location_id | RESTRICT |

### fw_legs (from migration 024)

| Column | FK Target | ON DELETE |
|--------|-----------|-----------|
| start_location_id | fw_locations.location_id | RESTRICT |
| end_location_id | fw_locations.location_id | RESTRICT |

---

## 2. FK Catalog Proof

### Actual FK Constraint Names

Migrations 024/175/176 do NOT explicitly name FK constraints. PostgreSQL auto-generates names:

| Assumed by R10 | Actual (auto-generated) |
|----------------|-------------------------|
| fk_fw_order_headers_origin_port | fw_order_headers_origin_port_id_fkey |
| fk_fw_order_headers_dest_port | fw_order_headers_dest_port_id_fkey |
| fk_fw_legs_start_location | fw_legs_start_location_id_fkey |
| fk_fw_legs_end_location | fw_legs_end_location_id_fkey |

**DEFECT:** R10's `DROP CONSTRAINT IF EXISTS fk_fw_order_headers_origin_port` silently does nothing because the actual constraint has a different name.

---

## 3. Value State Machine

| State | Detection | R10 Behavior | Correct Behavior |
|-------|-----------|--------------|------------------|
| LEGACY ONLY | Matches fw_locations | Transform | Transform |
| CANONICAL ONLY | Matches md_locations | No-op | No-op |
| BOTH + EQUIVALENT | Matches both, same entity | Transform | Transform |
| BOTH + CONFLICT | Matches both, different | Transform | **FAIL** |
| NEITHER | Matches neither | No-op | **FAIL** |

**DEFECT:** R10 does not detect BOTH+CONFLICT or NEITHER states.

---

## 4. Constraint State Machine

| State | R10 Behavior | Correct Behavior |
|-------|--------------|------------------|
| LEGACY FK ONLY | Drop + transform | Drop + transform |
| CANONICAL FK ONLY | Drop + re-add | **NO-OP** |
| BOTH | Drop both + add new | **FAIL** |
| NEITHER | Add new | **FAIL** |

**DEFECT:** R10 drops and re-adds canonical constraints on every run.

---

## 5. Collision Analysis

### UUID Collision

If `fw_locations.location_id = md_locations.id` for different entities:
- R10 uses `WHERE oh.origin_port_id = fl.location_id AND oh.tenant_id = fl.tenant_id`
- This is tenant-safe but does NOT detect semantic conflict

### Cross-Tenant Safety

All R10 transformations include `AND oh.tenant_id = fl.tenant_id`. **PASS**.

---

## 6. Tenant Safety

| Transformation | Tenant-Scoped? |
|----------------|----------------|
| origin_port_id | YES |
| dest_port_id | YES |
| start_location_id | YES |
| end_location_id | YES |

---

## 7. Idempotency Proof

| Run | Canonical Records | FK Values | FK Constraints |
|-----|-------------------|-----------|----------------|
| 1 | Created | Transformed | Added |
| 2 | No-op (ON CONFLICT) | No-op (0 rows) | **DROP + ADD** |

**DEFECT:** Second run drops and re-adds constraints. NOT a true NO-OP.

---

## 8. Transaction/Rollback Proof

PostgreSQL DDL is transactional. The migration is atomic before COMMIT.
After COMMIT, no automatic rollback.

---

## 9. Application Dependency Audit

| Finding | Details |
|---------|---------|
| Production code references to fw_locations | **0** |
| Test code references | 13 (all in __tests__/) |
| Verdict | **SAFE** — no production dependency |

---

## 10. Adversarial Matrix

| Scenario | R10 Result | Expected |
|----------|------------|----------|
| Clean legacy | PASS | PASS |
| Already canonical | DROP+ADD constraints | NO-OP |
| Mixed legacy/canonical | Partial | Per-column |
| BOTH + conflict | Transform | **FAIL** |
| Neither | No-op | **FAIL** |
| Duplicate canonical | No-op | **FAIL** |
| Second run | DROP+ADD | **NO-OP** |

---

## 11. Remaining Risks

| Risk | Severity |
|------|----------|
| No unique constraint on (tenant_id, external_code) | MEDIUM |
| Canonical collision not detected | MEDIUM |
| BOTH+CONFLICT not detected | HIGH |

---

## 12. Final Authorization Recommendation

**R10 MUST NOT BE AUTHORIZED.**

R11 repair required to fix:
1. FK constraint names (drop both naming conventions)
2. True second-run NO-OP (conditional constraint addition)
3. FK value state machine (explicit classification)

---

**END OF EXECUTION READINESS AUDIT**
