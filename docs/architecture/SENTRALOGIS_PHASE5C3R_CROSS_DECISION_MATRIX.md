# SENTRALOGIS — PHASE 5C-3R
# CROSS-DECISION MATRIX

**Date:** 2026-09-01  

---

## Scenario Testing

| Scenario | Precedence | Effective Period | UOM | Rounding | SO Boundary |
|----------|------------|------------------|-----|----------|-------------|
| Generic ocean rate | ADR-065 (7) | ADR-059 | ADR-062 | ADR-062 | ADR-061 + ADR-066 |
| Customer-specific ocean rate | ADR-065 (4) | ADR-059 | ADR-062 | ADR-062 | ADR-061 + ADR-066 |
| Customer + route rate | ADR-065 (2) | ADR-059 | ADR-062 | ADR-062 | ADR-061 + ADR-066 |
| Future rate | ADR-065 | ADR-059 (not yet applicable) | — | — | Cannot select |
| Historical rate | ADR-065 | ADR-059 (expired) | — | — | Cannot select |
| FCL | ADR-065 | ADR-059 | CONTAINER | USD 2dp | ADR-061 + ADR-066 |
| LCL | ADR-065 | ADR-059 | CBM | USD 2dp | ADR-061 + ADR-066 |
| Customs | ADR-065 | ADR-059 | DOCUMENT | IDR 0dp | ADR-061 + ADR-066 |
| Trucking | ADR-065 | ADR-059 | TRIP | IDR 0dp | ADR-061 + ADR-066 |
| Warehouse | ADR-065 | ADR-059 | DAY | IDR 0dp | ADR-061 + ADR-066 |
| BUY | ADR-065 | ADR-059 | Per rate | Per currency | ADR-061 + ADR-066 |
| SELL | ADR-065 | ADR-059 | Per rate | Per currency | ADR-061 + ADR-066 |
| BUY USD / SELL IDR | ADR-065 | ADR-059 | Per rate | USD 2dp / IDR 0dp | ADR-061 + ADR-066 |
| Partial SO fulfillment | N/A | N/A | N/A | N/A | ADR-061 (price stable) |

---

## Decision Interaction Points

| Interaction | Rule |
|-------------|------|
| Precedence → Effective Period | Candidate must be ACTIVE + effective period must contain pricing date |
| Precedence → UOM | All candidates must have matching UOM (or caller must convert) |
| Precedence → Rounding | Final selected rate's currency determines rounding |
| Effective Period → SO Boundary | Snapshot captures rate version + effective period at commitment |
| UOM → Rounding | UOM determines quantity precision, currency determines monetary precision |
| SO Boundary → Precedence | SO line stores selected rate version for audit trail |
| Quote → SO | Snapshot at SO creation; rate changes after do not affect SO |
| Override → Commitment | Override before commitment only; original preserved in snapshot |
| Amendment → Commitment | New line version; historical state reconstructable |

---

## ADR Ownership

| Decision | ADR | Status |
|----------|-----|--------|
| Rate Precedence | ADR-065 | RATIFIED |
| Effective Period | ADR-059 | RATIFIED |
| Snapshot Fields | ADR-059 | RATIFIED |
| SO Line Schema | ADR-061 | RATIFIED |
| Override | ADR-063 | PROPOSED |
| Settlement | ADR-064 | PROPOSED |
| Commitment Boundary | **ADR-066** | **PROPOSED** |
