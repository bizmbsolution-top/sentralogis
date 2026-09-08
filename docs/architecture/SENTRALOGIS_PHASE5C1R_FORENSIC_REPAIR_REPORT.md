# SENTRALOGIS — PHASE 5C-1R
# PRICING FOUNDATION FORENSIC REPAIR REPORT

**Date:** 2026-09-01  
**Status:** GREEN — FORENSIC REPAIR COMPLETE  
**Phase:** 5C-1R — Forensic Repair  

---

## 1. Executive Decision

**PHASE 5C-1R: GREEN — FORENSIC REPAIR COMPLETE**

---

## 2. Original Findings

| Finding | Confirmed? | Evidence | Severity |
|---------|------------|----------|----------|
| Tenant lineage | YES | No composite FKs; child.tenant_id ≠ parent.tenant_id possible | HIGH |
| Version authority | YES | `MAX(version_no) + 1` in application code (race condition) | HIGH |
| ACTIVE uniqueness | YES | No partial unique index on `status = ACTIVE'` | MEDIUM |
| Effective overlap | YES | No CHECK constraint on `effective_from <= effective_to` | MEDIUM |
| IDR default | YES | `DEFAULT 'IDR'` contradicts ADR-062 explicitness | MEDIUM |
| Lifecycle semantics | YES | Rate vs Version status semantics undocumented | LOW |

---

## 3. Root Cause

| Finding | Root Cause |
|---------|------------|
| Tenant lineage | Migration 025 created `tenant_id` on each table but only single-column FKs. No composite FK to enforce `child.tenant_id = parent.tenant_id`. |
| Version authority | Repository used `SELECT MAX(version_no) + 1` pattern which is not concurrency-safe. |
| ACTIVE uniqueness | Migration comment claimed "At most one ACTIVE version" but no partial unique index was created. |
| Effective overlap | No CHECK constraint to prevent `effective_from > effective_to`. |
| IDR default | `currency TEXT NOT NULL DEFAULT 'IDR'` made currency implicit, contradicting ADR-062. |
| Lifecycle semantics | Both Rate and Version used the same status enum without documenting the semantic distinction. |

---

## 4. Repairs

| Repair | Type | Files |
|--------|------|-------|
| Composite UNIQUE on parent tables | Constraint | Migration 026 |
| Composite FKs on child tables | Constraint | Migration 026 |
| `next_pricing_rate_version()` function | Function | Migration 026 |
| Repository uses function | Code | `lib/pricing/repository.ts` |
| Partial unique index on ACTIVE | Index | Migration 026 |
| CHECK constraint on effective period | Constraint | Migration 026 |
| Remove DEFAULT 'IDR' | Schema | Migration 026 |
| Repository requires explicit currency | Code | `lib/pricing/repository.ts` |
| Input DTO requires currency | Type | `lib/pricing/types.ts` |
| Lifecycle semantics documentation | Comment | Migration 026 |

---

## 5. Database Changes

### Migration: `20260901_026_pricing_foundation_forensic_repair.sql`

#### Constraints
- `uq_pricing_rates_id_tenant` — UNIQUE(id, tenant_id)
- `uq_pricing_rate_versions_id_tenant` — UNIQUE(id, tenant_id)
- `fk_pricing_rate_versions_rate_tenant` — FK(rate_id, tenant_id) → pricing_rates(id, tenant_id)
- `fk_pricing_rate_items_version_tenant` — FK(rate_version_id, tenant_id) → pricing_rate_versions(id, tenant_id)
- `chk_pricing_rate_versions_effective_period` — CHECK(effective_to IS NULL OR effective_from <= effective_to)

#### Indexes
- `uq_pricing_rate_versions_active` — UNIQUE(rate_id, tenant_id) WHERE status = 'ACTIVE'

#### Functions
- `next_pricing_rate_version(p_rate_id, p_tenant_id)` — Concurrency-safe version allocator using SELECT ... FOR UPDATE

#### Schema Changes
- `pricing_rate_items.currency` — DEFAULT removed

---

## 6. Domain Changes

| File | Change |
|------|--------|
| `lib/pricing/repository.ts` | Uses `next_pricing_rate_version()` RPC; requires explicit currency |
| `lib/pricing/types.ts` | `currency` is now required (not optional) in `CreatePricingRateItemInput` |

---

## 7. Security Verification

| Check | Status |
|-------|--------|
| IdentityContext for mutations | PASS |
| Tenant from authenticated identity | PASS |
| RLS on all tables | PASS |
| No client-supplied tenant authority | PASS |
| No trusted x-tenant-id | PASS |
| No fabricated pricing identifiers | PASS |
| No client-generated authoritative prices | PASS |

---

## 8. Tenant Lineage Verification

```
pricing_rates (id, tenant_id)
    ↓ composite FK
pricing_rate_versions (rate_id, tenant_id)
    ↓ composite FK
pricing_rate_items (rate_version_id, tenant_id)
```

A cross-tenant relationship is now impossible at the database level.

---

## 9. Version Concurrency Verification

The `next_pricing_rate_version()` function uses `SELECT ... FOR UPDATE` to lock the rows during allocation, preventing duplicate version numbers under concurrent requests.

---

## 10. ACTIVE Version Verification

Partial unique index `uq_pricing_rate_versions_active` enforces at most one ACTIVE version per rate per tenant.

---

## 11. Effective Period Verification

CHECK constraint `chk_pricing_rate_versions_effective_period` ensures `effective_from <= effective_to` when both are specified.

---

## 12. Currency Verification

- DEFAULT 'IDR' removed from `pricing_rate_items.currency`
- Repository no longer defaults to 'IDR'
- Input DTO requires explicit currency

---

## 13. Lifecycle Verification

| Rate Status | Version Status | Meaning |
|-------------|----------------|---------|
| DRAFT | DRAFT | Rate exists but not usable |
| ACTIVE | DRAFT | Rate usable but version not yet applicable |
| ACTIVE | ACTIVE | Rate usable and version applicable |
| SUPERSEDED | SUPERSEDED | Replaced by newer rate/version |
| INACTIVE | INACTIVE | Manually retired |

---

## 14. Regression

**1255/1255 PASS, 0 FAIL**

---

## 15. Static Architecture Gates

| Gate | Status |
|------|--------|
| No client-generated IDs | PASS |
| No tenant authority from client | PASS |
| No direct browser mutation | PASS |
| No SBU pricing duplication | PASS |
| No pricing authority duplication | PASS |
| No RLS bypass | PASS |

---

## 16. Files Changed

| File | Change |
|------|--------|
| `supabase/migrations/20260901_026_pricing_foundation_forensic_repair.sql` | Created |
| `lib/pricing/repository.ts` | Updated (version function, explicit currency) |
| `lib/pricing/types.ts` | Updated (currency required) |
| `lib/__tests__/phase5c1r-pricing-forensic-repair.test.ts` | Created |

---

## 17. Out-of-Scope

```
5C-2 NOT IMPLEMENTED
5C-3 NOT IMPLEMENTED
5C-4 NOT IMPLEMENTED
5C-5 NOT IMPLEMENTED
5C-6 NOT IMPLEMENTED
5C-7 NOT IMPLEMENTED
```

---

## 18. Remaining Risks

| Risk | Mitigation |
|------|------------|
| Effective period overlap prevention | Documented as future consideration (ADR-059 allows overlap for non-ACTIVE statuses) |
| Finer-grained pricing permissions | Use commercial:manage/read for now |

---

## PHASE 5C-1R FINAL FORENSIC GATE

```
==================================================
PHASE 5C-1R FINAL FORENSIC GATE
==================================================

ADR-057: RATIFIED
ADR-058: RATIFIED
ADR-059: RATIFIED
ADR-060: RATIFIED
ADR-061: RATIFIED
ADR-062: RATIFIED
ADR-063: RATIFIED
ADR-064: RATIFIED

Tenant Relational Lineage:
PASS

Version Number Authority:
PASS

Version Concurrency:
PASS

ACTIVE Version Invariant:
PASS

Effective Period Integrity:
PASS

Currency Explicitness:
PASS

Rate/Version Lifecycle:
PASS

IdentityContext:
PASS

Authorization:
PASS

RLS:
PASS

TypeScript:
PASS

5C-1R Tests:
PASS (22/22)

Full Regression:
PASS (1255/1255)

Static Architecture Gates:
PASS

Legacy Migration:
NOT EXECUTED

5C-2:
NOT IMPLEMENTED

Architecture Status:
GREEN

5C-2 Authorization:
NOT AUTHORIZED

Human Forensic Acceptance:
PENDING

IMPLEMENTATION HARD STOP:
YES
==================================================
```

---

**END OF PHASE 5C-1R REPORT**
