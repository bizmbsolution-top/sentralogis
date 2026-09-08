# SENTRALOGIS — PHASE TOKEN-2
# SERVICE RULE MATRIX

**Date:** 2026-09-02  

---

## 1. Service Token Rules

| Service | Completion Event | Source | Rate | Unit | Effective | Authority |
|---------|-----------------|--------|------|------|-----------|-----------|
| Trucking | JO Completed | `job_orders.status` | 1 | token | Always | Super Admin |
| Customs Clearance | Clearance Completed | `cus_declarations.status` | 1 | token | Always | Super Admin |
| WMS Inbound | Inbound Completed | `wh_receipt_orders.status` | 1 | token | Always | Super Admin |
| WMS Outbound | Outbound Completed | `wh_shipments.status` | 1 | token | Always | Super Admin |
| WMS Transfer | Transfer Completed | `wh_transfers.status` | 1 | token | Always | Super Admin |
| Forwarding Shipment | Shipment Completed | `shp_shipments.global_status` | 1 | token | Always | Super Admin |

---

## 2. Forwarding Composition

### 2.1 Example: BYD CKD Import

| Step | Service | Token Burn |
|------|---------|------------|
| 1 | Forwarding Shipment Completed | 1 |
| 2 | Customs Clearance Completed | 1 |
| 3 | Trucking JO Completed | 1 |
| 4 | WMS Inbound Completed | 1 |
| **TOTAL** | | **4 tokens** |

### 2.2 Key Principle

Each service burns independently at ITS completion. No automatic burn at selection.

---

## 3. WMS Bundling

| Event | Internal Activities | Token Burn |
|-------|---------------------|------------|
| WMS Inbound | Receiving + QC + BAST + Putaway | 1 |
| WMS Outbound | Picking + Checking + Shipping | 1 |
| WMS Transfer | Pick + Transport + Receive | 1 |

---

## 4. Token Value Configuration

### 4.1 Per-Tenant Model

| Tenant | Token Value | Currency |
|--------|-------------|----------|
| Tenant A | Rp7,500 | IDR |
| Tenant B | Rp10,000 | IDR |
| Tenant C | Rp15,000 | IDR |

### 4.2 Effective Dating

- `effective_from`: When rate becomes active
- `effective_to`: When rate expires (NULL = open-ended)
- `updated_by`: Who changed it

---

## 5. Configuration Hierarchy

```
Super Admin
    ↓ configures
Tenant Token Economics
    ├── token_value (per tenant)
    ├── service_rates (per tenant, per service)
    └── rules (active/inactive, effective periods)
        ↓ consumed at
    Completion Events
        ↓ recorded in
    token_consumption_events
```

---

## 6. Consumption Flow

```
Domain Completion Event
    ↓
Token Consumption Service
    ↓
1. Check idempotency (UNIQUE constraint)
    ↓
2. Get active token rate for tenant+service
    ↓
3. Get active token value for tenant
    ↓
4. Insert token_consumption_events (immutable)
    ↓
5. Update tenants.token_balance -= tokens_consumed
    ↓
6. Notify if low balance
```

---

**END OF SERVICE RULE MATRIX**
