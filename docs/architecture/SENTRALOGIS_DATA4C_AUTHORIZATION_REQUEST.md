# SENTRALOGIS — DATA-4C
# AUTHORIZATION REQUEST

**Date:** 2026-09-02  
**Phase:** DATA-4C  
**Nature:** Execution Design ONLY  

---

## 1. Authorization Scope

This document requests human authorization for the following future implementation:

### Track A — fw_locations Migration

| Action | Description |
|--------|-------------|
| Create md_locations records | From fw_locations data |
| Migrate 4 FKs | fw_order_headers (2), fw_legs (2) |
| Verify zero consumers | Static + database proof |
| Drop fw_locations | After zero-consumer proof |

### Track B — is_vendor Migration

| Action | Description |
|--------|-------------|
| Migrate ~131 consumers | 8 semantic batches |
| Replace is_vendor checks | With party_roles.VENDOR queries |
| Verify zero consumers | Static proof |
| Remove is_vendor column | After zero-consumer proof |

---

## 2. Preconditions

| Condition | Status |
|-----------|--------|
| Baseline tests pass | YES |
| TypeScript passes | YES |
| Data quality checks defined | YES |
| Rollback strategy documented | YES |
| Zero-consumer proof defined | YES |

---

## 3. Execution Sequence

```
0. Baseline verification
1. Backup / recovery readiness
2. Data quality verification
3. Track A preflight
4. Track A FK migration
5. Track A verification
6. Track A zero-consumer proof
7. Track B consumer batch migration
8. Per-batch verification
9. Full regression
10. Zero-consumer proof
11. Legacy retirement authorization
12. Legacy retirement execution
```

---

## 4. Stop Conditions

| Condition | Action |
|-----------|--------|
| Unexpected data mismatch | STOP |
| Unmappable location | STOP |
| Cross-tenant reference | STOP |
| Semantic divergence | STOP |
| Failed regression | STOP |
| RLS violation | STOP |

---

## 5. Human Authorization Required

| Decision | Status |
|----------|--------|
| Approve Track A execution | PENDING |
| Approve Track B execution | PENDING |
| Approve rollback strategy | PENDING |
| Approve stop conditions | PENDING |

---

**END OF AUTHORIZATION REQUEST**
