# SENTRALOGIS — PHASE 5C-3
# ARCHITECTURE DECISION MATRIX

**Date:** 2026-09-01  

---

## Decision Status

| # | Decision | Status | ADR | Blocking |
|---|----------|--------|-----|----------|
| 1 | Price Snapshot Identity | **GAP** | ADR-059 | YES |
| 2 | Snapshot Immutability | **GAP** | ADR-059 | YES |
| 3 | Commercial Charge Identity | **GAP** | ADR-061 | YES |
| 4 | SO Line-Item Schema | **GAP** | ADR-061 | YES |
| 5 | Quote → SO Conversion | **GAP** | — | YES |
| 6 | SO Confirmation → Commitment | **GAP** | ADR-061 | YES |
| 7 | Override Governance | **GAP** | ADR-063 | NO |
| 8 | Amendment Handling | **GAP** | ADR-061/063 | NO |
| 9 | Currency Explicitness | DONE | ADR-062 | — |
| 10 | UOM Explicitness | DONE | ADR-062 | — |
| 11 | Rounding/Precision | DONE | ADR-062 | — |
| 12 | Settlement Interface | **GAP** | ADR-064 | NO |
| 13 | Idempotency | **UNDEFINED** | — | NO |
| 14 | Audit Lineage | **PARTIAL** | — | NO |
| 15 | Authorization | **PARTIAL** | ADR-057 | NO |
| 16 | Tenant Isolation | **PARTIAL** | ADR-057 | NO |

---

## Scenario Validation

| Scenario | Precedence | Effective Period | UOM | Rounding | SO Boundary |
|----------|------------|------------------|-----|----------|-------------|
| Generic ocean rate | 5C-2 | 5C-2 | 5C-2 | 5C-2 | **GAP** |
| Customer-specific ocean rate | 5C-2 | 5C-2 | 5C-2 | 5C-2 | **GAP** |
| Customer + route rate | 5C-2 | 5C-2 | 5C-2 | 5C-2 | **GAP** |
| Future rate | 5C-2 | 5C-2 | 5C-2 | 5C-2 | **GAP** |
| Historical rate | 5C-2 | 5C-2 | 5C-2 | 5C-2 | **GAP** |
| FCL | 5C-2 | 5C-2 | 5C-2 | 5C-2 | **GAP** |
| LCL | 5C-2 | 5C-2 | 5C-2 | 5C-2 | **GAP** |
| Customs | 5C-2 | 5C-2 | 5C-2 | 5C-2 | **GAP** |
| Trucking | 5C-2 | 5C-2 | 5C-2 | 5C-2 | **GAP** |
| Warehouse | 5C-2 | 5C-2 | 5C-2 | 5C-2 | **GAP** |
| BUY | 5C-2 | 5C-2 | 5C-2 | 5C-2 | **GAP** |
| SELL | 5C-2 | 5C-2 | 5C-2 | 5C-2 | **GAP** |
| BUY USD / SELL IDR | 5C-2 | 5C-2 | 5C-2 | 5C-2 | **GAP** |
| Partial SO fulfillment | N/A | N/A | N/A | N/A | **GAP** |

---

## ADR Amendment Plan

| ADR | Current | Required | Action |
|-----|---------|----------|--------|
| ADR-059 | Rate versioning + snapshot fields | + Snapshot identity, immutability rules, applicability rule | Amend |
| ADR-061 | Commercial charge model | + SO line-item schema, lifecycle, BUY/SELL treatment | Amend |
| ADR-063 | Override governance | + Override for commercial charges (not just rates) | Amend |
| **ADR-066** | — | Price snapshot + commercial charge commitment boundary | **New** |
