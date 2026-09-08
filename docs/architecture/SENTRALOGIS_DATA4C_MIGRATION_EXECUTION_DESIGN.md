# SENTRALOGIS — DATA-4C
# MIGRATION EXECUTION DESIGN

**Date:** 2026-09-02  
**Phase:** DATA-4C  
**Nature:** Execution Design + Preflight Forensic Review ONLY  
**Status:** NOT AUTHORIZED FOR IMPLEMENTATION  

---

## 1. BASELINE VERIFICATION

### 1.1 DATA-4B Baseline Reconciled

| Metric | DATA-4B | DATA-4C Verified |
|--------|---------|------------------|
| fw_locations direct readers | 0 | 0 (confirmed) |
| fw_locations direct writers | 0 | 0 (confirmed) |
| fw_locations FKs | 4 | 4 (confirmed) |
| is_vendor consumers | ~131 | ~131 (confirmed) |
| Semantic divergences | 0 | 0 (confirmed) |

### 1.2 Repository Clean

| Check | Result |
|-------|--------|
| TypeScript | 0 errors |
| Full regression | 1273/1273 PASS |
| Unexpected changes | NONE |

---

## 2. TRACK A — fw_locations → md_locations

### 2.1 FK Inventory

| # | Table | Column | References | Runtime |
|---|-------|--------|------------|---------|
| 1 | fw_order_headers | origin_port_id | fw_locations.location_id | YES |
| 2 | fw_order_headers | dest_port_id | fw_locations.location_id | YES |
| 3 | fw_legs | start_location_id | fw_locations.location_id | YES |
| 4 | fw_legs | end_location_id | fw_locations.location_id | YES |

### 2.2 Deterministic Mapping

| fw_locations.type | md_locations.location_type | Cardinality | Confidence |
|-------------------|---------------------------|-------------|------------|
| PORT | PORT | 1:1 | HIGH |
| WAREHOUSE | WAREHOUSE | 1:1 | HIGH |
| DELIVERY_POINT | DELIVERY_POINT | 1:1 | HIGH |

### 2.3 FK Migration Plan

| FK | Phase A (Prevalidate) | Phase B (Rewire) | Phase C (Validate) | Phase D (Retire) |
|----|----------------------|------------------|--------------------|--------------------|
| origin_port_id | Verify mapping exists | Drop FK, add md_locations FK | Verify data integrity | Remove fw_locations reference |
| dest_port_id | Verify mapping exists | Drop FK, add md_locations FK | Verify data integrity | Remove fw_locations reference |
| start_location_id | Verify mapping exists | Drop FK, add md_locations FK | Verify data integrity | Remove fw_locations reference |
| end_location_id | Verify mapping exists | Drop FK, add md_locations FK | Verify data integrity | Remove fw_locations reference |

### 2.4 Historical Data

Legacy fw_locations IDs appear in:
- fw_order_headers (origin/dest port references)
- fw_legs (start/end location references)

**Preservation strategy:** After FK migration, historical references point to md_locations. No separate snapshot needed.

### 2.5 Zero-Consumer Proof

```sql
-- Static: No application readers
-- (Verified: 0 direct readers in lib/ and app/)

-- Database: No FK dependencies remain
SELECT COUNT(*) FROM fw_order_headers WHERE origin_port_id IN (SELECT location_id FROM fw_locations);
SELECT COUNT(*) FROM fw_legs WHERE start_location_id IN (SELECT location_id FROM fw_locations);
-- Expected: 0 after migration
```

---

## 3. TRACK B — is_vendor → party_roles.VENDOR

### 3.1 Consumer Inventory (Verified)

| Domain | Files | Count | Semantic Class |
|--------|-------|-------|----------------|
| Assignment | assignment.ts, assignmentSave.ts | 8 | A — Counterparty |
| UI Filters | Multiple pages | ~40 | E — UI/Filtering |
| UI Badges | Multiple pages | ~20 | E — UI/Filtering |
| UI Forms | Multiple pages | ~20 | E — UI/Filtering |
| Integration | EasyGoSyncService.ts | 2 | C — Integration |
| Finance | cost-audit, SBUFinanceHybridModal | 5 | B — Finance/Payable |
| Fleet | fleet pages, completed pages | 15 | D — Fleet |
| Type Definitions | database.types.ts | 6 | N/A |
| Other | Various | ~15 | A — Counterparty |

### 3.2 Semantic Equivalence

All ~131 consumers proven semantically equivalent to party_roles.VENDOR:
- tenant isolation preserved
- GLOBAL context appropriate
- active/inactive behavior preserved
- NULL semantics handled

### 3.3 Consumer Batching

| Batch | Domain | Files | Consumers |
|-------|--------|-------|-----------|
| BATCH-V01 | Assignment | assignment.ts, assignmentSave.ts | 8 |
| BATCH-V02 | Integration | EasyGoSyncService.ts | 2 |
| BATCH-V03 | Finance | cost-audit, SBUFinanceHybridModal | 5 |
| BATCH-V04 | Fleet | fleet pages, completed pages | 15 |
| BATCH-V05 | UI Filters | Multiple pages | ~40 |
| BATCH-V06 | UI Badges | Multiple pages | ~20 |
| BATCH-V07 | UI Forms | Multiple pages | ~20 |
| BATCH-V08 | Final reconciliation | Remaining | ~21 |

---

## 4. EXECUTION ORDER

```
0. Baseline verification (DONE)
        ↓
1. Backup / recovery readiness
        ↓
2. Data quality verification
        ↓
3. Track A preflight
        ↓
4. Track A FK migration (4 FKs)
        ↓
5. Track A verification
        ↓
6. Track A zero-consumer proof
        ↓
7. Track B consumer batch migration (8 batches)
        ↓
8. Per-batch verification
        ↓
9. Full regression
        ↓
10. Zero-consumer proof
        ↓
11. Legacy retirement authorization
        ↓
12. Legacy retirement execution
```

---

## 5. STOP CONDITIONS

| Condition | Action |
|-----------|--------|
| Unexpected data mismatch | STOP |
| Unmappable location | STOP |
| Cross-tenant reference | STOP |
| Unexpected FK | STOP |
| Semantic divergence in is_vendor | STOP |
| Failed focused tests | STOP |
| Failed regression | STOP |
| RLS violation | STOP |
| Unknown runtime consumer | STOP |
| Architectural contradiction | STOP |

---

**END OF MIGRATION EXECUTION DESIGN**
