# SENTRALOGIS — PHASE TOKEN-2
# TOKEN ECONOMY DESIGN

**Date:** 2026-09-02  
**Status:** GREEN — READY FOR HUMAN RATIFICATION  
**Phase:** TOKEN-2 — Design  

---

## 1. Canonical Token Economy Model

### 1.1 Core Principle

> **SERVICE-LEVEL TOKENIZATION**

A token is a unit of platform/service consumption. Token burn occurs ONLY when a billable service reaches its canonical completion event.

### 1.2 Token Definition

| Concept | Definition |
|---------|------------|
| **Token** | A unit of platform/service consumption |
| **Token Value** | Monetary equivalent per token (tenant-specific, configurable) |
| **Service Rate** | Tokens consumed per service completion (integer or fractional) |
| **Completion Event** | Domain-authoritative event that triggers burn |
| **Consumption Record** | Immutable ledger entry preserving historical truth |

### 1.3 Design Defaults (Service Rules)

| Service | Completion Event | Token Rate |
|---------|-----------------|------------|
| Trucking | JO Completed | 1 |
| Customs Clearance | Clearance Completed | 1 |
| WMS Inbound | Inbound Completed | 1 |
| WMS Outbound | Outbound Completed | 1 |
| WMS Transfer | Transfer Completed | 1 |
| Forwarding Shipment | Shipment Completed | 1 |

**Note:** Forwarding composed services (Customs, Trucking, WMS) consume their own tokens independently when THEY complete.

---

## 2. Tenant-Specific Token Value

### 2.1 Model

```
Platform (Super Admin)
    ↓ configures
Tenant Token Economics
    ├── token_value (per tenant, effective-dated)
    ├── service_rates (per tenant, per service)
    └── rules (active/inactive, effective periods)
```

### 2.2 Storage

| Table | Purpose |
|-------|---------|
| `tenant_token_prices` | Per-tenant token value, effective-dated |
| `tenant_token_price_history` | Audit trail for value changes |
| `tenant_service_rates` | Per-tenant service token rates |
| `token_consumption_events` | Immutable consumption ledger |

### 2.3 Invariant

> **Historical consumption MUST NOT be recalculated using a later token value.**

Each consumption record snapshots the token value at time of burn.

---

## 3. Service Token Rate

### 3.1 Model

- **Type:** NUMERIC(8,2) to support fractional rates (e.g., 0.5 tokens)
- **Default:** 1 token per service completion
- **Scope:** Per tenant, per service
- **Effective Dating:** Supported (effective_from, effective_to)

### 3.2 Simplicity Principle

V1 uses integer rates (1 token per service). Fractional rates supported for future extensibility but not required.

---

## 4. Completion Event Authority

| Domain | Completion Event | Source Aggregate | Authority |
|--------|-----------------|------------------|-----------|
| Trucking | JO Completed | `job_orders.status` | Trucking domain |
| Customs | Clearance Completed | `cus_declarations.status` | Customs domain |
| WMS Inbound | Inbound Completed | `wh_receipt_orders.status` | WMS domain |
| WMS Outbound | Outbound Completed | `wh_shipments.status` | WMS domain |
| WMS Transfer | Transfer Completed | `wh_transfers.status` | WMS domain |
| Forwarding | Shipment Completed | `shp_shipments.global_status` | Forwarding domain |

**Token subsystem consumes events. It does NOT own operational completion.**

---

## 5. WMS Bundled Consumption

### 5.1 Principle

WMS activities (Receiving, QC, BAST, Putaway) are operational details. They do NOT independently consume tokens.

### 5.2 Canonical Events

| Event | Internal Activities | Token Burn |
|-------|---------------------|------------|
| WMS Inbound Completed | Receiving + QC + BAST + Putaway | 1 token |
| WMS Outbound Completed | Picking + Checking + Shipping | 1 token |
| WMS Transfer Completed | Pick + Transport + Receive | 1 token |

---

## 6. Forwarding Composition

### 6.1 Principle

```
Forwarding Shipment Selected
    ├── Forwarding (1 token) — burns on Forwarding completion
    ├── Customs (1 token) — burns on Customs completion
    ├── Trucking (1 token) — burns on Trucking completion
    └── WMS Inbound (1 token) — burns on WMS completion
```

**Selection ≠ Consumption. Only completion burns tokens.**

### 6.2 No Reservation

V1 does NOT reserve tokens at selection time. Tokens burn ONLY at service completion.

---

## 7. Idempotency

### 7.1 Invariant

> **A repeated completion event MUST NOT create multiple token burns.**

### 7.2 Mechanism

```sql
UNIQUE(tenant_id, source_type, source_id, service_type)
```

- `source_type`: 'JO', 'SHP', 'CUS_DECLARATION', 'WH_INBOUND', etc.
- `source_id`: UUID of the source record
- `service_type`: 'TRUCKING', 'CUSTOMS', 'WMS_INBOUND', etc.

### 7.3 Database Enforcement

The unique constraint prevents duplicate burns at the database level, not just application level.

---

## 8. Historical Truth

### 8.1 Consumption Record Fields

| Field | Purpose |
|-------|---------|
| `tenant_id` | Tenant scope |
| `source_type` | Origin domain |
| `source_id` | Source record UUID |
| `service_type` | Service completed |
| `tokens_consumed` | Quantity burned |
| `token_value_snapshot` | Token value at consumption |
| `monetary_equivalent` | tokens × value at consumption |
| `rule_version` | Rate rule version |
| `consumed_at` | Timestamp |
| `idempotency_key` | Unique constraint |
| `actor` | System or user |

### 8.2 Immutability

Historical consumption records are APPEND-ONLY. No UPDATE, no DELETE.

---

## 9. Ledger vs Balance

### 9.1 Relationship

```
tenants.token_balance (current state)
    ↓ derived from
token_consumption_events (immutable history)
    +
token_grants (credits)
    -
token_consumption_events (debits)
```

### 9.2 No Direct Mutation

Balance is always derivable from ledger. No independent balance updates.

---

## 10. Super Admin Authority

### 10.1 Permissions

| Action | Role |
|--------|------|
| Configure token value | Super Admin only |
| Configure service rates | Super Admin only |
| View tenant token economics | Super Admin, Tenant Admin |
| View consumption history | Super Admin, Tenant Admin |
| Consume services | Any authenticated user |

### 10.2 Tenant Isolation

Tenant users CANNOT modify token economics. They can only view their own state and consume services.

---

## 11. Token vs Pricing Boundary

| Token | Pricing |
|-------|---------|
| Measures consumption | Determines charges |
| Burns on completion | Quoted at order time |
| Immutable history | Mutable until commitment |
| Separate engine | 5C closed/green |

**No automatic token → invoice coupling.**

---

## 12. Token vs Financial Boundary

| Token | Financial |
|-------|-----------|
| Consumption mechanism | Payment/settlement |
| May preserve monetary value | Owns accounting |
| Immutable consumption | Mutable until posting |
| Separate engine | 5D green |

**Token history is NOT an accounting ledger.**

---

## 13. Balance Semantics

**Current Model:** Prepaid wallet (tenants.token_balance)

- Credited by owner topup/grant
- Debited by service completion
- Never negative (GREATEST(balance - rate, 0))

**Future:** May support postpaid, quota, or usage counter models.

---

## 14. Adjustments / Reversals

### 14.1 V1 Scope

**NOT required in V1.**

If needed in future:
- Immutable original consumption
- Explicit adjustment/reversal entry
- Never UPDATE historical consumption

---

## 15. ADR Decision

**New ADRs Required: NONE**

Existing ADRs (057-069) govern:
- Commercial authority (ADR-018-044)
- Pricing authority (ADR-057-066)
- Financial authority (ADR-061-064)
- Operational authority (ADR-045-056)

Token economy extends existing Master Token architecture without requiring new architectural decisions.

---

**END OF TOKEN ECONOMY DESIGN**
