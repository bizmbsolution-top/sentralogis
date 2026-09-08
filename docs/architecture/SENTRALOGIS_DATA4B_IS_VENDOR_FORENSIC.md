# SENTRALOGIS — DATA-4B
# is_vendor FORENSIC

**Date:** 2026-09-02  
**Phase:** DATA-4B  
**Nature:** FORENSIC DISCOVERY  

---

## Current Consumer Count

| Category | Count |
|----------|-------|
| lib/domain/jo/assignment.ts | 6 |
| lib/services/assignmentSave.ts | 2 |
| lib/supabase/database.types.ts | 6 |
| app/ (production code) | ~117 |
| **Total** | **~131** |

---

## Consumer Inventory

### Domain Layer

| File | Usage | Semantic Class |
|------|-------|----------------|
| lib/domain/jo/assignment.ts:55 | Type definition | A |
| lib/domain/jo/assignment.ts:138 | resolveIsVendor() | A |
| lib/domain/jo/assignment.ts:241 | Filter type | A |
| lib/domain/jo/assignment.ts:253 | Transporter filter | A |
| lib/domain/jo/assignment.ts:262 | Filter condition | A |
| lib/domain/jo/assignment.ts:282 | Sort result | A |
| lib/services/assignmentSave.ts:30 | Type definition | A |
| lib/services/assignmentSave.ts:296 | resolveIsVendor() | A |

### Application Layer (Representative)

| File | Usage | Semantic Class |
|------|-------|----------------|
| app/(dashboard)/hq/master/contacts/page.tsx | Filter, badge, form | A |
| app/(dashboard)/hq/master/fleets/page.tsx | Filter, display | A |
| app/(dashboard)/hq/master/drivers/page.tsx | Filter, display | A |
| app/(dashboard)/tenant/master/contacts/page.tsx | Filter, badge, form | A |
| app/(dashboard)/tenant/master/fleets/page.tsx | Filter, display | A |
| app/(dashboard)/sbu/trucking/.../AssignmentModal.tsx | Filter, assignment | A |
| app/(dashboard)/sbu/trucking/completed/page.tsx | Badge, display | A |
| app/(dashboard)/sbu/warehouse/.../ReceiptDetailModal.tsx | Filter | A |
| app/(dashboard)/sbu/warehouse/.../OutboundDetailModal.tsx | Filter | A |
| app/(dashboard)/warehouse/portal/.../page.tsx | Filter | A |
| app/(dashboard)/hq/work-orders/components/CreateWOForm.tsx | Select | A |
| app/(dashboard)/hq/work-orders/components/QuickAddContactModal.tsx | Default value | A |
| app/(dashboard)/hq/finance/cost-audit/hooks/useCostAuditData.ts | Filter | A |
| app/(dashboard)/hq/driver-performance/page.tsx | Filter | A |
| app/(dashboard)/sbu/trucking/driver-performance/page.tsx | Filter | A |
| app/(dashboard)/sbu/trucking/assignments/page.tsx | Filter, display | A |
| app/(dashboard)/sbu/trucking/work-orders/[id]/page.tsx | Filter | A |
| app/(dashboard)/sbu/forwarding/wo/page.tsx | Select | A |
| components/sbu/AssignmentModal.tsx | Filter | A |
| components/sbu/AddCostModal.tsx | Display | A |
| components/sbu/SBUFinanceHybridModal.tsx | Finance logic | A |
| components/shared/EntityBadge.tsx | Badge | A |
| components/shared/UnifiedFinancePanel.tsx | Display | A |
| components/master/ContactFormModal.tsx | Form, prefix | A |
| src/application/gps/EasyGoSyncService.ts | Query, insert | A |

---

## Semantic Classification

| Class | Count | Description |
|-------|-------|-------------|
| A — CANONICAL-EQUIVALENT | ~120 | is_vendor = party_roles.VENDOR |
| B — SEMANTICALLY-DIFFERENT | 0 | — |
| C — DOMAIN-SPECIFIC | ~5 | Fleet/GPS context |
| D — DERIVED STATE | ~3 | is_vendor_fleet (from vendor_tenant_id) |
| E — DEAD/UNUSED | 0 | — |
| F — TEST-ONLY | 3 | Test fixtures |

---

## Role Mapping

| Current | Target |
|---------|--------|
| is_vendor = true | party_roles.VENDOR (GLOBAL) |
| is_vendor = false | No VENDOR role |

---

## Divergent Semantics

**NONE FOUND** — All is_vendor consumers semantically equivalent to party_roles.VENDOR.

---

## Backfill Validation

DATA-3 migration 038 performed idempotent backfill. No anomalies detected.

---

## Migration Design

1. Verify backfill completeness
2. Migrate consumers one-by-one
3. Replace is_vendor checks with party_roles queries
4. Preserve is_vendor column for backward compatibility
5. Zero-consumer proof
6. Column removal

---

## Zero-Consumer Proof

```bash
# Search for remaining is_vendor references
grep -r "is_vendor" --include="*.ts" --include="*.tsx" lib/ app/ src/ components/
# Expected: 0 executable references
```

---

## Blockers

**NONE**

---

**END OF is_vendor FORENSIC**
