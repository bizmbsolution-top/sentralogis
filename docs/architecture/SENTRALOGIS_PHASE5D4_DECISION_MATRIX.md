# SENTRALOGIS — PHASE 5D-4
# DECISION MATRIX

**Date:** 2026-09-01  

---

| Decision | Current State | Classification | Authority | Gap | Required ADR | Implementation Impact |
| -------- | ------------- | -------------- | --------- | --- | ------------ | --------------------- |
| Reconciliation authority | fin_reconciliation_records (5D-3) | B | Financial Domain | No | None | Ready for future logic |
| Reconciliation lifecycle | UNMATCHED/MATCHED/PARTIAL/REVERSED | B | Financial Domain | No | None | Ready for future logic |
| Bank/external statement | Not implemented | D | External | Yes | Future | Future phase |
| Accounting boundary | Not implemented | D | External | Yes | Future | Future phase |
| Journal authority | Not implemented | D | External | Yes | Future | Future phase |
| AR reconciliation | Foundation only | B | Financial Domain | No | None | Ready for future logic |
| AP reconciliation | Foundation only | B | Financial Domain | No | None | Ready for future logic |
| FX accounting | Not implemented | D | External | Yes | Future | Future phase |
| Adjustment/reversal | fin_adjustments (5D-2) | A | Financial Domain | No | None | Implemented |
| Idempotency | DB uniqueness (5D-3) | A | Financial Domain | No | None | Implemented |
| Immutability | Status-based (5D-3) | A | Financial Domain | No | None | Implemented |
| Audit | created_by/updated_by (5D-3) | A | Financial Domain | No | None | Implemented |
| External correlation | external_reference (5D-3) | A | Financial Domain | No | None | Implemented |
| Financial identity | DB UUIDs (5D-3) | A | Financial Domain | No | None | Implemented |
| IdentityContext | Server-derived | A | Identity | No | None | Implemented |
| Authorization | commercial:manage (5D-3) | B | Identity | No | None | Sufficient |
| Tenant isolation | RLS (5D-3) | A | Identity | No | None | Implemented |
| RLS | Enabled (5D-3) | A | Database | No | None | Implemented |

**Legend:** A = Governed, B = Sufficient, C = Decision required, D = Future
