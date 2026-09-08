# ADR-063 — Price Override Governance

**Status:** RATIFIED (Phase 5C-4R, 2026-09-01)  
**Date:** 2026-09-01  
**Ratified by:** Human Architecture Gate, 2026-09-01  
**Depends on:** ADR-061 (Commercial Charge Model), ADR-066 (Commitment Boundary)  

---

## 1. Context

Phase 5C-4 discovered that no canonical override workflow exists. Browser-direct pricing writes present a security risk. No server-side override authorization or audit trail exists. A committed-price invariant (ADR-066) must not be weakened by override behavior.

## 2. Decision

**Manual override is supported with full audit trail, approval governance, and strict immutability after commitment.**

### 2.1 Definition of Override

A **Price Override** is an authorized deviation from a calculated commercial price that occurs **before** SO commitment. It modifies the price that gets committed to the SO line item's `price_snapshot`.

### 2.2 Override Scope

| Can Override | Cannot Override |
|--------------|-----------------|
| Unit price | Source rate master |
| Total amount | Quantity (use SO amendment) |
| Charge basis | Currency (use new line) |
| Min/max charges | UOM (use new line) |

### 2.3 Override Authority

| Role | Request | Approve | View |
|------|---------|---------|------|
| Sales | YES | NO | YES |
| Sales Manager | YES | YES (low threshold) | YES |
| Pricing Manager | YES | YES (high threshold) | YES |
| Finance | NO | YES (margin violations) | YES |

### 2.4 Authorization

| Operation | Permission | Existing? |
|-----------|------------|-----------|
| Calculate price | `commercial:read` | YES |
| View override | `commercial:read` | YES |
| Request override | `pricing:override` | **NO** |
| Approve override | `pricing:approve` | **NO** |
| Execute override | `pricing:override` | **NO** |
| Cancel override | `pricing:override` | **NO** |

### 2.5 Approval Model

| Variance | Approval Required |
|----------|-------------------|
| <= 5% or <= $500 | Auto-approve |
| > 5% or > $500 | Manager approval |
| > 20% or > $5,000 | Pricing Manager approval |
| Negative margin | Finance approval |

### 2.6 Threshold Model

Thresholds are evaluated against the **original calculated price**:
- Absolute variance: `|override_price - calculated_price|`
- Percentage variance: `(absolute_variance / calculated_price) × 100`
- Margin impact: `sell_price - buy_price` (must remain positive)

### 2.7 Audit Model

| Field | Purpose |
|-------|---------|
| `override_actor` | Who requested |
| `override_timestamp` | When |
| `original_calculated_price` | Before override |
| `override_price` | After override |
| `override_reason` | Why |
| `approval_actor` | Who approved |
| `approval_timestamp` | When approved |
| `approval_status` | PENDING/APPROVED/REJECTED |

### 2.8 Immutability

| State | Mutation |
|-------|----------|
| DRAFT SO | Override editable |
| Confirmed SO | Override immutable |
| Cancelled SO line | Override preserved for audit |

### 2.9 Quote Boundary

| Timing | Override Allowed? |
|--------|-------------------|
| Before Quote | N/A |
| During Quote | YES (via nego_price) |
| After Quote, before SO | YES |
| During Quote → SO conversion | YES |
| After SO creation (DRAFT) | YES |
| After SO confirmation | NO (use amendment) |

### 2.10 SO Boundary

- Override allowed only while SO is in DRAFT status
- After SO confirmation: NO direct override
- Post-commitment price change: use amendment (cancel + new line version)

### 2.11 Amendment Behavior

| Operation | Model |
|-----------|-------|
| Cancel old line | YES |
| Create new line version | YES |
| New snapshot | YES |
| Preserve lineage | YES |

### 2.12 Cancellation Behavior

| Operation | Allowed |
|-----------|---------|
| Cancel DRAFT override | YES |
| Delete committed override | NO |
| Cancel committed SO line | YES (preserves audit) |

### 2.13 BUY/SELL Handling

| Side | Override Independence |
|------|----------------------|
| SELL | Independent override |
| BUY | Independent override |
| Margin | Informational (future enforcement) |

### 2.14 Currency Handling

| Rule | Behavior |
|------|----------|
| Explicit currency | YES (no implicit IDR) |
| Currency override | Requires new SO line |
| FX conversion | NOT IMPLEMENTED |

### 2.15 UOM Handling

| Rule | Behavior |
|------|----------|
| Explicit UOM | YES |
| UOM override | Requires new SO line |
| UOM conversion | NOT IMPLEMENTED |

### 2.16 Rounding Handling

| Rule | Behavior |
|------|----------|
| Rounding mode | HALF_UP (ADR-062) |
| Rounding stage | Final result only |
| Precision | Currency-specific |

### 2.17 Tenant Isolation

| Rule | Behavior |
|------|----------|
| Server-derived tenant | YES (IdentityContext) |
| Client tenant authority | NO |
| x-tenant-id trust | NO |
| Cross-tenant override | BLOCKED |

### 2.18 Security

| Requirement | Status |
|-------------|--------|
| IdentityContext authoritative | YES |
| Authorization enforced | YES |
| Tenant isolation | YES |
| No client tenant authority | YES |
| No fabricated pricing IDs | YES |

### 2.19 Legacy Compatibility

| Structure | Classification | Action |
|-----------|---------------|--------|
| `fw_price_master` | Legacy adapter | Keep temporarily |
| `crm_sbu_customer_rates` | Legacy adapter | Keep temporarily |
| `md_billing_rates` | Legacy adapter | Keep temporarily |
| `crm_quotation_items.nego_price` | Legacy adapter | Keep temporarily |

### 2.20 Consequences

1. Overrides are always audited.
2. Approval workflow for large deviations.
3. Committed prices are immutable post-confirmation.
4. Rate master protected from override mutation.
5. Historical commercial truth reconstructable.

### 2.21 Alternatives Rejected

| Alternative | Rejected Because |
|-------------|------------------|
| No override | Business needs manual adjustment |
| Silent override | Violates audit and trust |
| Any user can override | Unauthorized price manipulation |
| Post-commitment override | Violates ADR-066 immutability |

## 3. Invariants

1. Override requires reason and actor.
2. Post-commitment prices are immutable.
3. Approval required for overrides exceeding threshold.
4. Override ≠ rate master mutation.
5. Historical commercial truth reconstructable.

## 4. Security Implications

1. Override creation requires IdentityContext.
2. Tenant isolation via parent SO.
3. No client-supplied tenant authority.
4. No client-generated authoritative commercial identifiers.
5. Browser-direct pricing writes must be eliminated.

## 5. Data Model Implications

1. `price_snapshot` JSONB extended with override metadata.
2. Override audit fields appended to snapshot.
3. No separate override table (Model A — snapshot embedded).

## 6. Runtime Implications

1. SO creation captures override state in snapshot.
2. SO confirmation locks override.
3. Amendment creates new override record.
4. Cancellation preserves override for audit.

## 7. Testing Requirements

1. Override captured at SO creation.
2. Rate master change does not affect committed override.
3. Amendment creates new override, preserves old.
4. Idempotent override commit (retry-safe).
5. Cross-tenant override rejected.
6. Approval workflow enforced.
