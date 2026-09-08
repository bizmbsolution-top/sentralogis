# SENTRALOGIS — PHASE TOKEN-2R
# RATIFICATION PATCH

**Date:** 2026-09-02  

---

## Corrections to TOKEN-2

### Correction #1 — ADR Boundary

**TOKEN-2 stated:** ADR-057 through ADR-069 govern the extension.

**Corrected:** ADR-057..066 belong to Pricing 5C (CLOSED/GREEN). ADR-067..069 belong to Financial 5D (GREEN). Token Economy does NOT depend on these ADRs. Token Economy extends existing Master Token architecture (migrations 025/064/065/109/110/192) and does not acquire authority from Pricing or Financial domains.

---

### Correction #2 — Token Value Versioning

**TOKEN-2 proposed:** `tenant_token_prices`

**Confirmed:** Add `tenant_token_prices` table with:
- `tenant_id` UUID NOT NULL
- `price_per_token` INTEGER NOT NULL
- `effective_from` TIMESTAMPTZ
- `effective_to` TIMESTAMPTZ
- `UNIQUE(tenant_id, effective_from)`

---

### Correction #3 — Service Rate Versioning

**TOKEN-2 proposed:** `tenant_service_rates`

**Confirmed:** Add `tenant_service_rates` table with:
- `tenant_id` UUID NOT NULL
- `service_type` TEXT NOT NULL
- `tokens_per_completion` NUMERIC(8,2) NOT NULL
- `effective_from` TIMESTAMPTZ
- `effective_to` TIMESTAMPTZ
- `UNIQUE(tenant_id, service_type, effective_from)`

---

### Correction #4 — Historical Snapshot

**TOKEN-2 required:** Historical value preservation

**Confirmed:** Each consumption record MUST snapshot:
- `token_value_snapshot` — token value at consumption
- `rule_version_snapshot` — service rate at consumption
- `monetary_equivalent` — computed at consumption

Future configuration changes MUST NOT rewrite historical economics.

---

### Correction #5 — Idempotency Identity

**TOKEN-2 proposed:** `UNIQUE(tenant_id, source_type, source_id, service_type)`

**Confirmed:** This combination uniquely identifies one legitimate billable service completion. Add as unique constraint on `token_consumption_events`.

---

### Correction #6 — Completion Trigger Extension

**TOKEN-2 stated:** Existing trigger is authoritative

**Confirmed:** Extend existing `trg_deduct_tokens_on_jo_complete` trigger. Add idempotency check inside the function. Do NOT create a second trigger.

---

## Unchanged from TOKEN-2

The following remain correct:
- Service-level tokenization principle
- WMS bundled consumption
- Forwarding composition independence
- Burn-on-completion model
- No reservation for V1
- Super Admin exclusive authority
- Tenant isolation
- Prepaid wallet semantics
- Adjustment/reversal deferred

---

**END OF RATIFICATION PATCH**
