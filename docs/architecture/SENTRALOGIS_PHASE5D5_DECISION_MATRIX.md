# SENTRALOGIS — PHASE 5D-5
# DECISION MATRIX

**Date:** 2026-09-01  

---

| Decision | Current State | Classification | Authority | Gap | Required ADR | Implementation Impact |
| -------- | ------------- | -------------- | --------- | --- | ------------ | --------------------- |
| Bank/external statement | Not implemented | D | External | Yes | Future | Future phase |
| External transaction authority | Correlation fields | B | Financial | No | None | Supported |
| Accounting boundary | Not implemented | D | External | Yes | Future | Future phase |
| Journal authority | Not implemented | D | External | Yes | Future | Future phase |
| Accounting event contract | Event outbox | B | Financial | No | None | Supported |
| AR accounting | Event outbox ready | B | Financial | No | None | Supported |
| AP accounting | Event outbox ready | B | Financial | No | None | Supported |
| FX accounting | Not implemented | D | External | Yes | Future | Future phase |
| Integration reliability | Event outbox | B | Financial | No | None | Supported |
| Outbox/event delivery | event_outbox (migration 006) | A | Financial | No | None | Implemented |
| External acknowledgment | Outbox tracks | B | Financial | No | None | Supported |
| Adjustment/reversal | fin_adjustments | A | Financial | No | None | Implemented |
| Idempotency | DB uniqueness | A | Financial | No | None | Implemented |
| Immutability | Status-based | A | Financial | No | None | Implemented |
| Audit | created_by/updated_by | A | Financial | No | None | Implemented |
| External correlation | external_reference | A | Financial | No | None | Implemented |
| Financial identity | DB UUIDs | A | Financial | No | None | Implemented |
| IdentityContext | Server-derived | A | Identity | No | None | Implemented |
| Authorization | commercial:manage | B | Identity | No | None | Sufficient |
| Tenant isolation | RLS | A | Identity | No | None | Implemented |
| RLS | Enabled | A | Database | No | None | Implemented |

**Legend:** A = Governed, B = Sufficient, C = Decision required, D = Future
