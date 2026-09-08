# ADR-058 — Rate Master Model

**Status:** PROPOSED (Phase 5C-R, 2026-09-01)  
**Date:** 2026-09-01  
**Depends on:** ADR-057 (Pricing Domain Authority)  

---

## 1. Context

SENTRALOGIS needs a canonical rate model that supports Forwarding, Customs, Trucking, and Warehouse without creating separate pricing engines per SBU.

## 2. Decision

**Three-level rate hierarchy: Rate → Rate Version → Rate Item.**

### 2.1 Rate
Represents a reusable commercial pricing definition.

| Field | Purpose |
|-------|---------|
| `rate_id` | UUID PK |
| `tenant_id` | Tenant isolation |
| `capability_type` | FORWARDING, CUSTOMS, TRUCKING, WAREHOUSE |
| `rate_category` | Service classification |
| `rate_code` | Business identifier |
| `description` | Human-readable |
| `status` | DRAFT, ACTIVE, INACTIVE |

### 2.2 Rate Version
Represents an immutable time-bound definition.

| Field | Purpose |
|-------|---------|
| `rate_version_id` | UUID PK |
| `rate_id` | Parent rate |
| `version_no` | Sequential |
| `effective_from` | Validity start |
| `effective_to` | Validity end (nullable = open-ended) |
| `status` | DRAFT, ACTIVE, SUPERSEDED |

### 2.3 Rate Item
Represents a specific charge definition.

| Field | Purpose |
|-------|---------|
| `rate_item_id` | UUID PK |
| `rate_version_id` | Parent version |
| `charge_basis` | What is being priced (container, CBM, kg, declaration, trip) |
| `unit_of_measure` | UOM code |
| `unit_rate` | Rate amount |
| `currency` | ISO currency code |
| `min_charge` | Minimum applicable charge |
| `max_charge` | Maximum applicable charge (nullable) |
| `applicability_conditions` | JSONB (lane, customer, vendor, container type) |

## 3. Alternatives Considered

| Alternative | Rejected Because |
|-------------|------------------|
| Single flat rate table | No versioning, no historical preservation |
| One rate table per capability | Creates 4 competing engines |
| Copy `fw_price_master` as-is | Forwarding-specific, no buy/sell distinction |

## 4. Consequences

- All capability-specific rates share one canonical model.
- Rate versions are immutable once published.
- Rate items support flexible applicability conditions.

## 5. Invariants

1. Rate versions are immutable once activated.
2. At most one active version per rate context at any effective timestamp.
3. Rate items are tenant-isolated.
4. Capability-specific rate structures are supported without separate engines.

## 6. Security Implications

- Rate creation requires `pricing:manage`.
- Rate reads require `pricing:read`.
- Tenant isolation via `tenant_id` + RLS.
