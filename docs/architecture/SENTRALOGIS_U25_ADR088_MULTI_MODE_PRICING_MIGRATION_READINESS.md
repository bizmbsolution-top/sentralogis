# U-25 ADR-088 Wave 1 — Multi-Mode Pricing Migration Readiness

**Status:** GREEN — WAVE 1 COMPLETE  
**Date:** 2026-09-06  
**Depends on:** ADR-088 (RATIFIED), U-15 Fulfillment Foundation, U-18 Operational Handoff Foundation

---

## 1. Executive Summary

U-25 ADR-088 Wave 1 implements the migration readiness layer for legacy `fw_price_master` multi-mode pricing into the canonical `pricing_rates` / `pricing_rate_items` model. This is a **read-only migration preparation** — no production data mutations, no migrations, no ADR changes.

### Gate Result

| Metric | Value |
|--------|-------|
| U-25 ADR-088 Tests | **14 / 14 PASS** |
| Full Regression | **1514 / 1522 PASS** (8 pre-existing failures, 0 new) |
| TypeScript Errors | 0 (in new/modified files) |
| ESLint Warnings | 0 (in new/modified files) |

---

## 2. What Was Built

### 2.1 Migration Repository (`lib/pricing/migration-repository.ts`)

Extended the existing migration repository with `fw_price_master` support:

- **`dryRunFwPriceMaster(tenantId)`** — Returns dry-run preview of legacy pricing mapped to canonical format
- **`migrateFwPriceMaster(tenantId, dryRun?)`** — Executes migration (defaults to dry-run mode)
- **Multi-mode mapping**: `sell_price` → `PER_CONTAINER`, `sell_per_cbm` → `PER_CBM`, `sell_min_cbm` → `min_charge`
- **COGS exclusion**: No COGS fields mapped (ADR-088 invariant)
- **Exception handling**: Null prices generate skipped items with warnings, not fabricated data

### 2.2 Migration Types (`lib/pricing/migration-types.ts`)

Added `FwPriceMasterDryRunItem` interface with:
- `sourceRecordId`, `rateCode`, `capabilityType`, `rateDescription`, `status`
- `items[]` — Array of mapped rate items with `chargeBasis`, `unitOfMeasure`, `unitRate`, `minCharge`, `currency`, `applicabilityConditions`
- `warnings[]` — Non-blocking issues (e.g., missing `sell_min_cbm`)
- `exceptions[]` — Blocking issues (e.g., negative prices)

### 2.3 Test Suite (`lib/__tests__/u25-adr088-multi-mode-pricing-migration.test.ts`)

14 tests covering:
- Dry-run structure validation
- PER_CONTAINER mapping from `sell_price`
- PER_CBM mapping from `sell_per_cbm`
- `sell_min_cbm` → `min_charge` mapping
- MIN_CHARGE never emitted as charge_basis
- COGS fields excluded from mapping
- Null `sell_price` does not fabricate PER_CONTAINER items
- Multiple rate items coexist under one rate version
- Semantic equivalence with legacy model

### 2.4 Full Regression Registration

Registered `U-25 ADR-088 Multi-Mode Pricing Migration` suite in `scripts/run-full-regression.ts`.

---

## 3. Semantic Mapping (ADR-088 Compliance)

| Legacy Column | Canonical Representation | Notes |
|---------------|--------------------------|-------|
| `sell_price` | `pricing_rate_items.unit_rate` with `charge_basis = 'PER_CONTAINER'` | Direct mapping |
| `sell_per_cbm` | `pricing_rate_items.unit_rate` with `charge_basis = 'PER_CBM'` | Separate rate item under same rate version |
| `sell_min_cbm` | `pricing_rate_items.min_charge` on PER_CBM item | NOT a separate charge basis |

### Example Mapping

```
Legacy: fw_price_master (FCL, IDJKT → USLAX, 40HC, sell_price=1,500,000, sell_per_cbm=500,000, sell_min_cbm=1,000,000)

Canonical:
  pricing_rates: rate_code = "FWD-FCL-IDJKT-USLAX"
  └── pricing_rate_versions: version_no = 1
      ├── pricing_rate_items: charge_basis='PER_CONTAINER', unit_rate=1,500,000
      └── pricing_rate_items: charge_basis='PER_CBM', unit_rate=500,000, min_charge=1,000,000
```

---

## 4. Invariants Preserved

1. **ADR-088 does not introduce new canonical pricing schema** — Uses existing `pricing_rates`, `pricing_rate_versions`, `pricing_rate_items`
2. **Multiple rate items with different `charge_basis` values can coexist under one rate version** — Verified by test
3. **`sell_min_cbm` maps to `min_charge`, NOT to a new charge basis** — Verified by test
4. **COGS remains outside canonical Pricing scope** — Verified by test
5. **Zero production data mutations** — All operations are dry-run by default
6. **Zero migrations added** — Pure code preparation
7. **Zero ADR changes** — ADR-088 already RATIFIED

---

## 5. Test Results

### 5.1 U-25 ADR-088 Vitest

```
RUN  v4.1.11 C:/Users/sonad/projectQ/sentralogis

Test Files  1 passed (1)
Tests  14 passed (14)
```

### 5.2 Full Regression

```
FULL REGRESSION: 1514/1522 PASS, 8 FAIL
```

The 8 failures are pre-existing (U-08 Forwarding Writer Guard, X4 W3/W4, Post-X4 Reconciliation, R-Reader Wave R-A) and unrelated to U-25 ADR-088.

---

## 6. Files Changed

| File | Action | Description |
|------|--------|-------------|
| `lib/pricing/migration-repository.ts` | Modified | Added `dryRunFwPriceMaster`, `migrateFwPriceMaster` |
| `lib/pricing/migration-types.ts` | Modified | Added `FwPriceMasterDryRunItem` interface |
| `lib/__tests__/u25-adr088-multi-mode-pricing-migration.test.ts` | Created | 14 vitest tests |
| `scripts/run-full-regression.ts` | Modified | Registered U-25 ADR-088 suite |

---

## 7. Next Steps

- **Wave 2**: Actual production migration execution (requires human authorization)
- **Wave 3**: Adapter integration for runtime pricing lookups
- **Wave 4**: Deprecation of `fw_price_master` reads

---

**END OF U-25 ADR-088 WAVE 1 IMPLEMENTATION REPORT**
