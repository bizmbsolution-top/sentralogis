# SENTRALOGIS — PHASE TOKEN-1
# GAP REGISTER

**Date:** 2026-09-01  

---

| ID | Finding | Severity | Current State | Required Change | Type |
|----|---------|----------|---------------|-----------------|------|
| GAP-01 | Token value is global, not tenant-specific | P1 | `token_prices` single row | Add `tenant_id` to `token_prices` or create `tenant_token_prices` | EXTEND |
| GAP-02 | No idempotency for JO completion burn | P0 | Trigger fires on any status→COMPLETED | Add unique constraint + idempotency key | MISSING |
| GAP-03 | Forwarding composition not supported | P1 | Single burn per Forwarding JO | Add `token_consumption_events` for composed services | MISSING |
| GAP-04 | WMS bundling not supported | P1 | Per-JO burn only | Add WMS service-level completion events | MISSING |
| GAP-05 | No tenant-specific consumption rules | P1 | `sbu_token_rates` is global | Add `tenant_id` to `sbu_token_rates` | EXTEND |
| GAP-06 | Historical token value not preserved | P2 | Only current price stored | Snapshot value at consumption time | MISSING |
| GAP-07 | No customer/vendor portal token visibility | P2 | No scoped APIs | Create portal token APIs | MISSING |
| GAP-08 | No dedicated token test suite | P2 | No tests found | Create test suite | MISSING |
| GAP-09 | Double-burn possible on retry | P0 | No unique constraint | Add `UNIQUE(tenant_id, source_type, source_id)` | MISSING |

---

**Summary:**

| Type | Count |
|------|-------|
| P0 | 2 |
| P1 | 4 |
| P2 | 3 |

---

**END OF GAP REGISTER**
