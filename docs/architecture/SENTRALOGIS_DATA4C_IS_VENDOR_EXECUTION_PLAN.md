# SENTRALOGIS — DATA-4C
# is_vendor EXECUTION PLAN

**Date:** 2026-09-02  
**Phase:** DATA-4C  
**Nature:** Execution Design ONLY  

---

## 1. Consumer Migration Batches

### BATCH-V01 — Assignment

| File | Change |
|------|--------|
| lib/domain/jo/assignment.ts | Replace is_vendor checks with party_roles queries |
| lib/services/assignmentSave.ts | Replace is_vendor resolution with party_roles lookup |

### BATCH-V02 — Integration

| File | Change |
|------|--------|
| src/application/gps/EasyGoSyncService.ts | Replace .eq('is_vendor', true) with party_roles join |

### BATCH-V03 — Finance

| File | Change |
|------|--------|
| app/(dashboard)/hq/finance/cost-audit/hooks/useCostAuditData.ts | Replace is_vendor filter |
| components/sbu/SBUFinanceHybridModal.tsx | Replace is_vendor checks |

### BATCH-V04 — Fleet

| File | Change |
|------|--------|
| app/(dashboard)/hq/master/fleets/page.tsx | Replace is_vendor filter |
| app/(dashboard)/sbu/trucking/completed/page.tsx | Replace is_vendor display |

### BATCH-V05 — UI Filters

| Files | Change |
|-------|--------|
| Multiple master pages | Replace .eq('is_vendor', true/false) with party_roles subquery |

### BATCH-V06 — UI Badges

| Files | Change |
|-------|--------|
| Multiple pages | Replace is_vendor badge with party_roles.VENDOR check |

### BATCH-V07 — UI Forms

| Files | Change |
|-------|--------|
| ContactFormModal.tsx | Replace is_vendor state with party_roles management |
| QuickAddContactModal.tsx | Replace is_vendor default |

### BATCH-V08 — Final Reconciliation

| Task | Description |
|------|-------------|
| Search remaining | grep -r "is_vendor" lib/ app/ src/ components/ |
| Verify 0 executable | Confirm only type definitions remain |

---

## 2. Replacement Pattern

### Before

```typescript
.eq('is_vendor', true)
```

### After

```typescript
.in('id', (await partyRoleService.getVendors(tenantId)))
```

### Before

```typescript
.is_vendor === true
```

### After

```typescript
await partyRoleService.hasRole(tenantId, partyId, 'VENDOR')
```

---

## 3. Validation Per Batch

| Batch | Test |
|-------|------|
| V01 | Assignment flow regression |
| V02 | EasyGo sync verification |
| V03 | Cost audit report accuracy |
| V04 | Fleet display correctness |
| V05 | UI filter functionality |
| V06 | Badge display correctness |
| V07 | Form submission + role creation |
| V08 | Zero-consumer proof |

---

**END OF is_vendor EXECUTION PLAN**
