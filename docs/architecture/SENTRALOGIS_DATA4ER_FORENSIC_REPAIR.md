# SENTRALOGIS — DATA-4E-R
# FORENSIC REPAIR

**Date:** 2026-09-02  
**Phase:** DATA-4E-R  
**Nature:** FORENSIC DISCOVERY + CORRECTION DESIGN ONLY  
**Status:** NOT AUTHORIZED FOR IMPLEMENTATION  

---

## 1. DATA-4E RECLASSIFICATION

| Item | Previous Claim | Correct Status |
|------|----------------|----------------|
| Track A migration | "COMPLETE" | **NOT EXECUTED** — only SQL file created |
| Database mutation | IMPLIED | **NOT EXECUTED** |
| Schema change | IMPLIED | **NOT EXECUTED** |
| Zero-consumer proof | PENDING | **NOT ESTABLISHED** |

**Corrected Status:** Track A database execution = NOT EXECUTED

---

## 2. ACTUAL FOUR FK AUTHORITIES

| # | Source Table | Source Column | Target Table | Target Column | ON DELETE | Runtime |
|---|--------------|---------------|--------------|---------------|-----------|---------|
| 1 | fw_order_headers | origin_port_id | fw_locations | location_id | RESTRICT | YES |
| 2 | fw_order_headers | dest_port_id | fw_locations | location_id | RESTRICT | YES |
| 3 | fw_legs | start_location_id | fw_locations | location_id | RESTRICT | YES |
| 4 | fw_legs | end_location_id | fw_locations | location_id | RESTRICT | YES |

**Source:** Migrations 175_fw_order_headers.sql, 176_fw_legs.sql

---

## 3. CRITICAL CONTRADICTION: fw_order_headers

### 3.1 The Problem

**DATA-4A Human Ratification** explicitly states:
> `fw_order_headers` remains DEFERRED. DATA-4C Human Authorization grants no authority to: migrate it, delete it, rename it, rewire it.

**But** fw_order_headers has 2 FK dependencies on fw_locations:
- `origin_port_id` → fw_locations.location_id
- `dest_port_id` → fw_locations.location_id

### 3.2 Impact

This creates a **BLOCKING CONTRADICTION**:
- We cannot complete fw_locations migration without touching fw_order_headers
- We are not authorized to touch fw_order_headers
- Therefore, fw_locations migration **CANNOT PROCEED** under current authorization

### 3.3 Classification

**RED — ARCHITECTURAL CONTRADICTION**

---

## 4. TENANT MAPPING ANALYSIS

### 4.1 fw_locations Schema

```sql
CREATE TABLE fw_locations (
  location_id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  type location_type NOT NULL,  -- PORT, WAREHOUSE, DELIVERY_POINT
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**Critical Finding:** fw_locations has **NO tenant_id column**.

### 4.2 Implications

Without tenant_id on fw_locations, we cannot:
- Determine which tenant owns each location
- Create tenant-scoped md_locations records
- Ensure tenant isolation during migration

### 4.3 Previous Migration Error

The previous migration (039) attempted:
```sql
JOIN public.md_entities e ON e.id = (
  SELECT entity_id FROM public.md_fleets WHERE tenant_id = fl.tenant_id LIMIT 1
)
```

This is **PROHIBITED** because:
1. fw_locations has no tenant_id column
2. LIMIT 1 creates nondeterministic selection
3. md_fleets is not the canonical tenant authority

---

## 5. LOCATION TYPE MAPPING

| fw_locations.type | md_locations.location_type | Deterministic? |
|-------------------|---------------------------|----------------|
| PORT | PORT | YES |
| WAREHOUSE | WAREHOUSE | YES |
| DELIVERY_POINT | DELIVERY_POINT | YES |

All 3 types map 1:1. No unmappable values.

---

## 6. REPOSITORY CONSUMER INVENTORY

### 6.1 Direct SQL Access

| File | Usage | Runtime? |
|------|-------|----------|
| (none found) | — | — |

**Direct SQL readers: 0** (no `.from('fw_locations')` in production code)

### 6.2 FK-Based Access

| Table | Access Type |
|-------|-------------|
| fw_order_headers | Read via origin_port_id, dest_port_id |
| fw_legs | Read via start_location_id, end_location_id |

### 6.3 Test Files

| File | Usage |
|------|-------|
| phase5a2-forwarding-schema-repair.test.ts | Schema verification |
| phase5a2r-forwarding-repository-boundary.test.ts | Schema verification |
| u16-forwarding-forensic.test.ts | Forensic reference |

---

## 7. ZERO-CONSUMER DEFINITION

| Category | Definition |
|----------|------------|
| A. Executable runtime consumers | Must reach zero before legacy retirement |
| B. Schema references (FKs) | Must be eliminated/reconciled before DROP |
| C. Historical/audit references | May remain if explicitly classified and safe |
| D. Documentation references | May remain |

**Zero consumer ≠ zero textual occurrence.**

---

## 8. ROLLBACK DESIGN

| Operation | Reversible? | Method |
|-----------|-------------|--------|
| Create md_locations | YES | DELETE created records |
| Add new FK columns | YES | DROP columns |
| Populate new columns | UPDATE | Set to NULL |
| DROP fw_locations | **NO** | Point of no return |

---

## 9. REQUIRED HUMAN DECISION

### 9.1 fw_order_headers Contradiction

The frozen DATA-4A prohibits touching fw_order_headers, but fw_locations migration requires modifying its FKs.

**Options:**
1. **Amend DATA-4A** to allow fw_order_headers FK migration
2. **Defer fw_locations migration** until fw_order_headers is addressed
3. **Alternative approach** that doesn't touch fw_order_headers (not technically possible)

### 9.2 Tenant Mapping

fw_locations has no tenant_id. A canonical tenant source must be identified before migration can proceed.

---

## 10. FINAL GATE

| Gate | Result |
|------|--------|
| DATA-4C baseline | VERIFIED |
| Existing 4 FK proof | **4 FKs CONFIRMED** |
| fw_order_headers untouched | **CONTRADICTION — 2 FKs ON fw_order_headers** |
| Tenant mapping | **BLOCKED — no tenant_id on fw_locations** |
| Location mapping | PASS (3 types map 1:1) |
| Duplicate analysis | PASS |
| Idempotency | PASS |
| FK convergence design | **BLOCKED by fw_order_headers** |
| Historical references | NONE FOUND |
| Runtime consumer inventory | 0 direct, 2 via FK |
| Zero-consumer definition | DEFINED |
| Rollback | DOCUMENTED |
| RLS / tenant isolation | **BLOCKED — no tenant source** |
| Migration artifact | PREVIOUS ARTIFACT INVALID |
| Migration executed | **NO** |
| Track B | DEFERRED |
| Overall Gate | **RED — ARCHITECTURAL CONTRADICTION** |

---

**END OF FORENSIC REPAIR**
