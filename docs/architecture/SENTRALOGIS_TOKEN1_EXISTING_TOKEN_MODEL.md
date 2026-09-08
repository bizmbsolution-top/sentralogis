# SENTRALOGIS — PHASE TOKEN-1
# EXISTING TOKEN MODEL

**Date:** 2026-09-01  

---

## 1. Master Token Classification

**Current Model: A — Wallet**

The `tenants.token_balance` represents a wallet-style balance that is debited on JO completion and credited on owner topup/grant.

---

## 2. Data Model Details

### 2.1 token_prices

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID PK | Identity |
| `price_per_token` | INTEGER | Global price (default 1000 IDR) |
| `currency` | VARCHAR(3) | IDR |
| `effective_from` | TIMESTAMPTZ | Validity start |
| `effective_to` | TIMESTAMPTZ | Validity end |
| `updated_by` | UUID FK | Who changed |
| `notes` | TEXT | Justification |

### 2.2 sbu_token_rates

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID PK | Identity |
| `sbu_type` | TEXT UNIQUE | SBU classification |
| `tokens_per_jo` | INTEGER | Burn rate |
| `updated_by` | UUID FK | Who changed |

### 2.3 token_transactions

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID PK | Identity |
| `tenant_id` | UUID FK | Tenant scope |
| `tenant_code` | TEXT | Business identifier |
| `amount` | INTEGER | Positive=credit, negative=debit |
| `transaction_type` | TEXT | TOPUP, GRANT, CONSUME |
| `description` | TEXT | Human-readable |
| `created_at` | TIMESTAMPTZ | Timestamp |

### 2.4 tenants.token_balance

| Column | Type | Purpose |
|--------|------|---------|
| `token_balance` | INTEGER | Current wallet balance |

---

## 3. Token Value

**Current:** Global, single price (1000 IDR).

**Not tenant-specific.**

Historical values preserved in `token_price_history`.

---

## 4. Consumption Logic

**Trigger-based:** `deduct_tokens_on_jo_complete()` fires on `job_orders.status` → COMPLETED.

**No idempotency guard.**

---

## 5. Current Behavior by Domain

| Domain | Trigger | Rate |
|--------|---------|------|
| Trucking | JO Completed | 2 tokens |
| Warehouse | JO Completed | 1 token |
| Customs | JO Completed | 2 tokens |
| Forwarding | JO Completed | 1 token |

---

**END OF EXISTING TOKEN MODEL**
