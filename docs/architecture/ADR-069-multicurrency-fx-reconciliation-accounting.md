# ADR-069 — Multi-Currency, FX, Reconciliation & Accounting Boundary

**Status:** RATIFIED (Phase 5D-3R, 2026-09-01)  
**Date:** 2026-09-01  
**Ratified by:** Human Architecture Gate, 2026-09-01  
**Depends on:** ADR-067 (Payment Boundary), ADR-064 (Financial Settlement)  

---

## 1. Context

Phase 5D-3 identified FX, reconciliation, and accounting as future gaps. ADR-069 defines the architectural boundaries for these capabilities without implementing them.

## 2. Problem

How should SENTRALOGIS handle multi-currency payments, FX conversion, reconciliation, and accounting integration without:
1. Building a full accounting engine
2. Mutating historical financial records
3. Creating duplicate financial authorities

## 3. Decision

**FX, reconciliation, and accounting are separate domain boundaries. SENTRALOGIS Financial Domain owns payment/settlement; external systems own accounting.**

### 3.1 Multi-Currency Boundary

| Aspect | Rule |
|--------|------|
| Transaction currency | Explicit on all financial documents |
| Payment currency | Explicit on payment |
| Settlement currency | Explicit on allocation |
| Base currency | IDR (default) |
| FX rate | Snapshot at payment time |
| FX source | External (future integration) |

### 3.2 FX Boundary

| Concept | Owner |
|---------|-------|
| FX rate source | External provider |
| FX snapshot | Financial Domain (at payment time) |
| FX gain/loss | Accounting Domain (future) |
| FX conversion | Not implemented in 5D-3 |

**FX conversion is NOT supported until FX infrastructure is built.**

### 3.3 Reconciliation Boundary

| Concept | Owner |
|---------|-------|
| Reconciliation authority | Future phase (5D+) |
| Reconciliation status | Future phase |
| Bank transaction matching | Future phase |

**Reconciliation is a future phase, not part of 5D-3.**

### 3.4 Accounting Boundary

| Concept | Owner |
|---------|-------|
| Chart of accounts | `finance_coa` (exists) |
| Journal entries | Future phase |
| GL posting | Future phase |
| Tax posting | Future phase |

**Accounting is an external integration boundary, not part of the Financial Domain.**

### 3.5 External Integration Boundary

| Integration | Status |
|-------------|--------|
| Bank APIs | Future phase |
| Payment gateway | Future phase |
| ERP/Accounting | Future phase |

**All external integrations are future phases.**

## 4. Alternatives Considered

| Alternative | Rejected Because |
|-------------|------------------|
| Build full accounting engine | Violates separation of concerns |
| Store mutable FX rates | Historical documents would change |
| Internal reconciliation | Requires bank integration first |

## 5. Consequences

1. FX is explicitly out of scope for 5D-3
2. Reconciliation is a future phase
3. Accounting is an external integration boundary
4. Multi-currency payment requires FX infrastructure

## 6. Security Implications

- FX rate data is read-only
- External integration requires authentication
- All external events are idempotent

## 7. Explicit Non-Goals

- FX conversion engine
- Bank reconciliation
- Accounting journal posting
- Tax calculation engine
- Payment gateway integration
