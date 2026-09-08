# SENTRALOGIS — PHASE TOKEN-2R
# FORENSIC RECONCILIATION

**Date:** 2026-09-02  
**Status:** GREEN  
**Phase:** TOKEN-2R — Forensic Reconciliation  

---

## Reconciliation Matrix

| Issue | TOKEN-2 Position | Forensic Evidence | Final Position | Status |
|-------|------------------|-------------------|---------------|--------|
| ADR Boundary | 057–069 govern | ADR-057..066 = Pricing 5C; ADR-067..069 = Financial 5D; Token extends existing Master Token (migrations 025/064/065/109/110/192), does NOT acquire authority from Pricing or Financial | Existing ADR-057..069 remain governing for their respective domains; Token Economy does not replace, reopen, or acquire authority over those domains | PASS |
| Token Value Versioning | Proposed tenant_token_prices | Current token_prices is global single-row; no effective dating per tenant | Add tenant_token_prices with effective_from/effective_to; snapshot value at consumption | PASS |
| Service Rate Versioning | Proposed tenant_service_rates | Current sbu_token_rates is global; no per-tenant override | Add tenant_service_rates with effective dating; snapshot rule version at consumption | PASS |
| Historical Snapshot | Required | Current token_transactions does NOT snapshot token value or rule version | Add token_value_snapshot and rule_version fields to consumption records | PASS |
| Idempotency Identity | Candidate: UNIQUE(tenant_id, source_type, source_id, service_type) | Current trigger has NO unique constraint; repeated status updates can double-burn | Verify candidate is sufficient; add idempotency_key or unique constraint | PASS |
| Completion Trigger | Existing trigger is authoritative | trg_deduct_tokens_on_jo_complete on job_orders AFTER UPDATE OF status; recognizes COMPLETED/DONE/PAID/etc.; NO idempotency guard | Extend existing trigger; add idempotency check; do NOT create second trigger | PASS |
| WMS Bundling | Bundled | WMS completion events not yet defined in token model | Define canonical WMS completion events (inbound/outbound/transfer) | PASS |
| Forwarding Composition | Independent | Forwarding composed services burn independently | Each service burns at its own completion; no automatic burn at selection | PASS |
| Burn-on-Completion | PASS | Trigger fires on status → COMPLETED | Existing mechanism is sound; needs idempotency addition | PASS |
| Reservation | NONE for V1 | No reservation ledger exists | Correct — V1 has no reservation | PASS |
| Super Admin Authority | PASS | Only owner/superadmin can modify token_prices and sbu_token_rates | Existing enforcement is correct | PASS |
| Tenant Isolation | PASS | token_transactions.tenant_id + RLS | Existing isolation is correct | PASS |
| Pricing Boundary | PASS | Token tables are separate from lib/pricing/ | Boundary preserved | PASS |
| Financial Boundary | PASS | Token tables are separate from lib/financial/ | Boundary preserved | PASS |
| Balance Semantics | PASS | Prepaid wallet, GREATEST(balance - rate, 0) | Existing semantics confirmed | PASS |
| Adjustment/Reversal | DEFERRED V1 | Not implemented | Correct — deferred to future phase | PASS |

---

## Issue #1 — ADR Boundary Correction

**TOKEN-2 stated:** ADR-057 through ADR-069 govern the extension.

**Correction:** ADR-057..066 belong to Pricing 5C (CLOSED/GREEN). ADR-067..069 belong to Financial/Payment 5D (GREEN). Token Economy does NOT depend on these ADRs.

**Evidence:**
- Token economy extends existing Master Token architecture implemented in migrations 025, 064, 065, 109, 110, 192
- These migrations predate ADR-057..069 and establish independent token authority
- Token tables (token_prices, sbu_token_rates, token_transactions) are separate from pricing and financial tables

**Final Position:** Existing ADR-057..069 remain governing authorities for their respective Pricing and Financial domains. Token Economy does not replace, reopen, or acquire authority over those domains.

---

## Issue #2 — Effective-Dated Token Economics

**Current State:**
- `token_prices`: Single global row, no tenant_id, no effective dating
- `sbu_token_rates`: Global rates, no per-tenant override

**Required Model:**

```sql
CREATE TABLE tenant_token_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES md_tenants(id),
  price_per_token INTEGER NOT NULL DEFAULT 1000,
  currency VARCHAR(3) DEFAULT 'IDR',
  effective_from TIMESTAMPTZ DEFAULT NOW(),
  effective_to TIMESTAMPTZ,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, effective_from)
);

CREATE TABLE tenant_service_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES md_tenants(id),
  service_type TEXT NOT NULL CHECK (service_type IN ('TRUCKING', 'CUSTOMS', 'WMS_INBOUND', 'WMS_OUTBOUND', 'WMS_TRANSFER', 'FORWARDING')),
  tokens_per_completion NUMERIC(8,2) NOT NULL DEFAULT 1,
  effective_from TIMESTAMPTZ DEFAULT NOW(),
  effective_to TIMESTAMPTZ,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, service_type, effective_from)
);
```

**Invariant:** Historical consumption MUST snapshot the token value and rule version at time of burn.

---

## Issue #3 — Canonical Idempotency Identity

**Candidate:** `UNIQUE(tenant_id, source_type, source_id, service_type)`

**Verification:**

| Scenario | Source Type | Source ID | Service Type | Unique? |
|----------|-------------|-----------|--------------|---------|
| Trucking JO-001 completed | JO | <uuid> | TRUCKING | YES |
| Customs DECL-001 completed | CUS_DECLARATION | <uuid> | CUSTOMS | YES |
| WMS Inbound INB-001 completed | WH_INBOUND | <uuid> | WMS_INBOUND | YES |
| Forwarding SHP-001 completed | SHP | <uuid> | FORWARDING | YES |
| Forwarding composed: Customs | SHP | <uuid> | CUSTOMS | YES |
| Forwarding composed: Trucking | SHP | <uuid> | TRUCKING | YES |

**Verdict:** The candidate is SUFFICIENT. Each combination uniquely identifies one legitimate billable service completion.

**Additional Protection:** Add `idempotency_key` column (generated from source_type + source_id + service_type) for explicit idempotency tracking.

---

## Issue #4 — Existing Completion Trigger Authority

**Current Trigger:** `trg_deduct_tokens_on_jo_complete`

| Attribute | Value |
|-----------|-------|
| Table | `job_orders` |
| Event | AFTER UPDATE OF status |
| Function | `deduct_tokens_on_jo_complete()` |
| Recognized statuses | COMPLETED, PEKERJAAN SELESAI, SELESAI, DONE, PAID, completed, RECEIVED |
| Idempotency | NONE |

**Verdict:** The trigger is authoritative but needs idempotency extension.

**Recommendation:** Extend the existing trigger function to:
1. Check for existing consumption record before burning
2. Use `INSERT ... ON CONFLICT DO NOTHING` pattern
3. Do NOT create a second trigger

---

**END OF FORENSIC RECONCILIATION**
