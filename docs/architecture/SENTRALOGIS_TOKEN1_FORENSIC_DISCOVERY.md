# SENTRALOGIS — PHASE TOKEN-1
# FORENSIC DISCOVERY

**Date:** 2026-09-01  
**Status:** GREEN  
**Phase:** TOKEN-1 — Discovery  

---

## 1. Existing Token Implementation

### 1.1 Data Model

| Table | Purpose |
|-------|---------|
| `token_prices` | Global token price configuration |
| `token_price_history` | Audit trail for price changes |
| `sbu_token_rates` | Tokens burned per JO per SBU type |
| `token_transactions` | Ledger (TOPUP, GRANT, CONSUME) |
| `tenants.token_balance` | Current balance per tenant |

### 1.2 Token Value

| Aspect | Current State |
|--------|---------------|
| Storage | `token_prices.price_per_token` (single row) |
| Value | 1000 IDR (hard-coded default) |
| Scope | **GLOBAL** — not tenant-specific |
| Configurable | Yes, by owner/superadmin |
| Historical | `token_price_history` preserves changes |

### 1.3 Consumption Model

| Aspect | Current State |
|--------|---------------|
| Trigger | `deduct_tokens_on_jo_complete()` on `job_orders.status` change |
| Basis | Per JO completion (not service-level) |
| Rates | `sbu_token_rates.tokens_per_jo` per SBU |
| Burn values | TRUCKING=2, WAREHOUSE=1, CLEARANCE=2, FORWARDING=1 |
| Idempotency | **NO** — no unique constraint on source event |

---

## 2. Current Token Value

**1 Master Token = Rp1,000 (global, not tenant-specific)**

The `token_prices` table stores a single global price. Historical values are preserved in `token_price_history`.

---

## 3. Current Token Consumption

### 3.1 Consumption Path

```
JO Status → COMPLETED
    ↓
deduct_tokens_on_jo_complete() trigger
    ↓
Lookup sbu_token_rates
    ↓
UPDATE tenants.token_balance -= tokens_per_jo
    ↓
INSERT token_transactions (CONSUME)
    ↓
Low balance notification (if ≤5)
```

### 3.2 Domains Supported

| Domain | Supported | Rate |
|--------|-----------|------|
| Trucking | YES | 2 tokens/JO |
| Warehouse | YES | 1 token/JO |
| Customs | YES | 2 tokens/JO |
| Forwarding | YES | 1 token/JO |

---

## 4. Double-Burn / Idempotency

**GAP: No idempotency mechanism exists.**

The trigger fires on ANY status change to COMPLETED. Repeated updates or retry scenarios could cause duplicate burns.

**No unique constraint on `(tenant_id, source_type, source_id)` in `token_transactions`.**

---

## 5. Forwarding Composition

**Current:** Forwarding burns 1 token per JO completion.

**Gap:** No mechanism for composed services (Customs + Trucking + WMS) to consume additional tokens within one Forwarding JO.

---

## 6. WMS Bundling

**Gap:** WMS activities (Receiving, QC, BAST, Putaway) are not bundled into a single "Inbound Completed" event for token consumption.

Current model burns per JO, not per WMS service bundle.

---

## 7. Authority & Permissions

| Role | Authority |
|------|-----------|
| superadmin / owner | Full control (prices, rates, topup, grant) |
| tenant_admin | View only |
| tenant_superadmin | View only |

---

## 8. Tenant Isolation

| Check | Status |
|-------|--------|
| Tenant balance isolated | YES (`tenants.token_balance`) |
| Cross-tenant access | Prevented by RLS |
| Client tenant authority | Not trusted |

---

## 9. Historical Truth

| Field | Preserved |
|-------|-----------|
| Token value at consumption | **NO** — only current price stored |
| Service completed | YES (description) |
| Source transaction | Partial (JO number) |
| Timestamp | YES |
| Tenant | YES |
| Rule/rate used | **NO** |

---

## 10. Token vs Pricing Boundary

**Current:** Token is separate from `lib/pricing/` (5C architecture).

**Boundary respected:** Token measures consumption, not commercial price.

---

## 11. Existing UI

| Component | Location |
|-----------|----------|
| Token balance | `app/(dashboard)/token/page.tsx` |
| Token history | `app/(dashboard)/token/history/page.tsx` |
| Master Token admin | `app/(dashboard)/owner/token/page.tsx` |
| Token topup | Owner dashboard |

---

## 12. Test Coverage

| Suite | Coverage |
|-------|----------|
| No dedicated token tests found | GAP |

---

**END OF FORENSIC DISCOVERY**
