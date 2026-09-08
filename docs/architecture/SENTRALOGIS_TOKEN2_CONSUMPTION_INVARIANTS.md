# SENTRALOGIS — PHASE TOKEN-2
# CONSUMPTION INVARIANTS

**Date:** 2026-09-02  

---

## 1. Idempotency Invariant

### 1.1 Rule

> **A repeated completion event MUST NOT create multiple token burns.**

### 1.2 Enforcement

```sql
UNIQUE(tenant_id, source_type, source_id, service_type)
```

### 1.3 Behavior

| Scenario | Result |
|----------|--------|
| First completion | Burn tokens |
| Duplicate completion | NO burn (constraint prevents insert) |
| Concurrent duplicate | Exactly one burn (DB constraint) |
| Retry after failure | NO double burn |

---

## 2. Historical Truth Invariant

### 2.1 Rule

> **Historical consumption MUST NOT be recalculated using a later token value.**

### 2.2 Snapshot Fields

| Field | Preserved |
|-------|-----------|
| `tokens_consumed` | YES |
| `token_value_snapshot` | YES |
| `monetary_equivalent` | YES |
| `rule_version` | YES |
| `consumed_at` | YES |

### 2.3 Immutability

- APPEND-ONLY table
- No UPDATE
- No DELETE
- Reversals via explicit adjustment entries (future)

---

## 3. Tenant Isolation Invariant

### 3.1 Rule

> **Tenant A can NEVER access Tenant B's token state.**

### 3.2 Enforcement

| Layer | Mechanism |
|-------|-----------|
| Application | IdentityContext tenant resolution |
| API | Server-side tenant filtering |
| Database | RLS policies |

---

## 4. Super Admin Authority Invariant

### 4.1 Rule

> **Only SENTRALOGIS Super Admin may configure token economics.**

### 4.2 Permissions

| Action | Super Admin | Tenant Admin | Tenant User |
|--------|-------------|--------------|-------------|
| Configure token value | YES | NO | NO |
| Configure service rates | YES | NO | NO |
| View tenant economics | YES | YES (own) | NO |
| View consumption | YES | YES (own) | YES (own) |
| Consume services | YES | YES | YES |

---

## 5. Pricing Boundary Invariant

### 5.1 Rule

> **Token is NOT Pricing.**

### 5.2 Separation

| Token | Pricing |
|-------|---------|
| Measures consumption | Determines charges |
| Burns on completion | Quoted at order time |
| Immutable history | Mutable until commitment |
| Separate engine | 5C closed/green |

---

## 6. Financial Boundary Invariant

### 6.1 Rule

> **Token is NOT Financial.**

### 6.2 Separation

| Token | Financial |
|-------|-----------|
| Consumption mechanism | Payment/settlement |
| May preserve monetary value | Owns accounting |
| Immutable consumption | Mutable until posting |
| Separate engine | 5D green |

---

## 7. Completion Authority Invariant

### 7.1 Rule

> **Token subsystem consumes completion events. It does NOT own operational completion.**

### 7.2 Domain Ownership

| Domain | Owns Completion | Token Consumes |
|--------|-----------------|----------------|
| Trucking | YES | Event |
| Customs | YES | Event |
| WMS | YES | Event |
| Forwarding | YES | Event |

---

## 8. No Reservation Invariant

### 8.1 Rule

> **V1 does NOT reserve tokens at selection time.**

### 8.2 Behavior

| Action | Token Burn |
|--------|------------|
| Select service | NO |
| Start service | NO |
| Complete service | YES |

---

## 9. Balance Semantics Invariant

### 9.1 Rule

> **Balance is prepaid wallet, derived from ledger.**

### 9.2 Formula

```
token_balance = SUM(credits) - SUM(debits)
```

### 9.3 Non-Negative

```sql
GREATEST(balance - rate, 0)
```

---

## 10. Failure Semantics Invariant

### 10.1 Rule

> **A successful token burn MUST be atomic and idempotent.**

### 10.2 Behavior

| Failure | Result |
|---------|--------|
| Duplicate event | No double burn |
| Concurrent event | Exactly one burn |
| Partial failure | Transaction rollback |
| Downstream failure | Retry-safe |

---

**END OF CONSUMPTION INVARIANTS**
