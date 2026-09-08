# SENTRALOGIS — PHASE 5C-2R
# CROSS-DECISION MATRIX

**Date:** 2026-09-01  

---

## Scenario Testing

| Scenario | Precedence | Effective Period | UOM | Rounding | SO Boundary |
|----------|------------|------------------|-----|----------|-------------|
| Generic ocean rate (no customer) | Priority 7: service only | ACTIVE + effective_from <= date | CONTAINER | USD 2dp | SO line snapshot |
| Customer-specific ocean rate (BYD) | Priority 4: customer + service | ACTIVE + effective_from <= date | CONTAINER | USD 2dp | SO line snapshot |
| Customer + route rate (BYD + CNSHA→IDSUB) | Priority 2: customer + route + service + container | ACTIVE + effective_from <= date | CONTAINER | USD 2dp | SO line snapshot |
| Future rate version | Same priority | ACTIVE + future effective_from = not yet applicable | CONTAINER | USD 2dp | Cannot select until applicable |
| Historical rate (SUPERSEDED) | Ineligible (not ACTIVE) | N/A | N/A | N/A | N/A |
| FCL (1×40HC) | Priority 2-7 depending on context | ACTIVE + effective | CONTAINER | USD 2dp | SO line: qty=1, uom=CONTAINER |
| LCL (5 CBM) | Priority 2-7 depending on context | ACTIVE + effective | CBM | USD 2dp | SO line: qty=5, uom=CBM |
| Customs (1 declaration) | Priority 2-7 depending on context | ACTIVE + effective | DOCUMENT | IDR 0dp | SO line: qty=1, uom=DOCUMENT |
| Trucking (2 trips) | Priority 2-7 depending on context | ACTIVE + effective | TRIP | IDR 0dp | SO line: qty=2, uom=TRIP |
| Warehouse (100 pallet-days) | Priority 2-7 depending on context | ACTIVE + effective | DAY | IDR 0dp | SO line: qty=100, uom=DAY |
| BUY rate | Same priority | ACTIVE + effective | Per rate | Per currency | SO line: side=BUY |
| SELL rate | Same priority | ACTIVE + effective | Per rate | Per currency | SO line: side=SELL |
| BUY USD / SELL IDR | Same priority | ACTIVE + effective | Per rate | USD 2dp / IDR 0dp | Separate lines per currency |
| Partial SO fulfillment | N/A | N/A | N/A | N/A | Line items immutable, fulfillment tracks quantity |

---

## Decision Interaction Points

| Interaction | Rule |
|-------------|------|
| Precedence → Effective Period | Candidate must be ACTIVE + effective period must contain pricing date |
| Precedence → UOM | All candidates must have matching UOM (or caller must convert) |
| Precedence → Rounding | Final selected rate's currency determines rounding |
| Effective Period → SO Boundary | Snapshot captures rate version + effective period at commitment |
| UOM → Rounding | UOM determines quantity precision, currency determines monetary precision |
| SO Boundary → Precedence | SO line stores the selected rate version for audit trail |

---

## ADR Ownership

| Decision | ADR | Action |
|----------|-----|--------|
| Rate Precedence | **ADR-065 (NEW)** | New ADR required |
| Effective Period | ADR-059 | Amend §2 + add §7 (semantics) |
| Monetary Precision | ADR-062 | Amend §2 + add §4 (precision) |
| UOM | ADR-062 | Amend §2.2 + add §5 (UOM contract) |
| SO Line Boundary | ADR-061 | Amend §2.1 + add §6 (schema + rules) |
