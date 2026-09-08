# ADR-070 — Canonical Party Role Architecture

**Status:** AMENDED — PENDING HUMAN RATIFICATION  
**Date:** 2026-09-02  
**Depends on:** ADR-018 (Engagement Root), ADR-031 (Anti-Corruption Boundary), ADR-034 (Engagement → Sales Order)  
**Depends on Ratification:** TOKEN-3/TOKEN-4 (Token Foundation)  
**Amended:** 2026-09-02 — Removed SHIPPER/CONSIGNEE/NOTIFY_PARTY from party_roles vocabulary (duplicate authority with shp_shipments FKs)  

---

## 1. Context

DATA-1 forensic discovery established that `md_entities` is the canonical Party identity authority with 73+ code references and no competing masters. However, Party role semantics are currently represented through legacy boolean flags (`is_customer`, `is_vendor`, `is_supplier`, `is_broker`) that are:
- Global (not contextual)
- Overloaded (single flag carries multiple meanings)
- Insufficient for transaction-context roles (BILL_TO, SHIP_TO, SHIPPER, CONSIGNEE)

DATA-2R-C condition closure proved that `is_vendor` alone has 131 code references across 9 usage classes, carrying semantics of "external counterparty", "payable entity", and "integration partner".

The absence of a canonical role model forces every domain to interpret boolean flags independently, creating semantic drift and preventing role-based access control.

---

## 2. Decision

**Party identity and Party role are distinct canonical concepts.**

### 2.1 Party Identity (md_entities)

`md_entities` remains the canonical Party identity authority. It owns:
- Identity (entity_code, name, legal_name, tax_id)
- Hierarchy (parent_id)
- Communication (email, phone, mobile, whatsapp)
- Billing address (billing_address, billing_city, etc.)
- Commercial terms (payment_terms_days, payment_terms_type)

### 2.2 Party Role (party_roles)

A new canonical `party_roles` table governs all role assignments:

```text
party_roles
├── id (UUID PK)
├── tenant_id (UUID FK → tenants)
├── party_id (UUID FK → md_entities)
├── role_type (TEXT)
├── context_type (TEXT: GLOBAL, ENGAGEMENT, ORDER, CONTRACT)
├── context_id (UUID, nullable)
├── is_primary (BOOLEAN)
├── effective_from (DATE)
├── effective_to (DATE, nullable)
├── created_at (TIMESTAMPTZ)
├── updated_at (TIMESTAMPTZ)
├── UNIQUE (tenant_id, party_id, role_type, context_type, context_id)
```

### 2.3 Core Invariant

> **Party hierarchy ≠ Party role ≠ Transaction-context role**

These are three different concepts that MUST NOT collapse into one mechanism.

---

## 3. Role Semantics

### 3.1 Global Party Roles

Assigned at the party level with `context_type = 'GLOBAL'`:

| Role | Description |
|------|-------------|
| CUSTOMER | Buys services from SENTRALOGIS |
| VENDOR | Provides services to SENTRALOGIS |
| SUPPLIER | Supplies goods |
| BROKER | Facilitates transactions |
| CARRIER | Transports goods |
| AGENT | Acts on behalf of another |

### 3.2 Commercial Context Roles

Assigned with specific `context_type` and `context_id`:

| Role | Context | Description |
|------|---------|-------------|
| BILL_TO | ORDER | Receives invoices |
| SHIP_TO | ORDER | Receives goods |
| PAYER | ORDER | Pays invoices |
| ORDERING_PARTY | ORDER | Places orders |

### 3.3 Shipment Context Roles — NOT in party_roles

The following roles are **NOT** stored in `party_roles`. Their canonical authority is `shp_shipments` direct FK references:

| Role | Canonical Authority | Reason |
|------|---------------------|--------|
| SHIPPER | shp_shipments.shipper_id | Already canonical FK on shp_shipments |
| CONSIGNEE | shp_shipments.consignee_id | Already canonical FK on shp_shipments |
| NOTIFY_PARTY | shp_shipments.notify_party_id | Already canonical FK on shp_shipments |

**Invariant:** ONE BUSINESS FACT → ONE CANONICAL AUTHORITY. Shipment contextual roles are owned by the Shipment aggregate, not by the Party Role Registry.

### 3.4 Role Coexistence Rules

- A party can hold multiple roles in different contexts
- Parent ≠ Bill-To (no automatic role inheritance)
- A party can be CUSTOMER and VENDOR simultaneously
- Roles are tenant-scoped
- UNIQUE constraint prevents duplicate assignments

---

## 4. Legacy Flag Treatment

| Legacy Field | Current Meaning | Canonical Replacement | Risk | Removal Condition |
|--------------|-----------------|----------------------|------|-------------------|
| is_customer | Party is customer | party_roles.CUSTOMER (GLOBAL) | LOW | All readers migrated |
| is_vendor | External counterparty | party_roles.VENDOR (GLOBAL) | **HIGH** | All 131 readers/writers migrated |
| is_supplier | Party is supplier | party_roles.SUPPLIER (GLOBAL) | LOW | All readers migrated |
| is_broker | Party is broker | party_roles.BROKER (GLOBAL) | LOW | All readers migrated |

### 4.1 is_vendor Semantic Decision

**is_vendor = legacy representation of party_roles.VENDOR (GLOBAL)**

Current consumers and their semantic meanings:

| Consumer | Current Meaning | Target Authority |
|----------|-----------------|------------------|
| assignment.ts:253 | External transporter eligible for assignment | party_roles.VENDOR |
| assignment.ts:282 | Vendor = NOT own-fleet | party_roles.VENDOR |
| fleet-status:101 | Cross-tenant fleet (uses vendor_tenant_id) | **No change needed** |
| cost-audit:432 | Payable counterparty | vendor_type (preserved) |
| EasyGoSyncService:129 | Integration partner | party_roles.VENDOR |
| UI badges | External indicator | party_roles.VENDOR |

### 4.2 Migration Strategy

1. **Phase 1:** Create party_roles table with RLS
2. **Phase 2:** Dual-write (update both is_vendor and party_roles)
3. **Phase 3:** Migrate all readers to party_roles
4. **Phase 4:** Migrate all writers to party_roles
5. **Phase 5:** Deprecate is_vendor (keep column, stop using)
6. **Phase 6:** Remove column after zero-consumer proof

---

## 5. Alternatives Considered

| Alternative | Rejected Because |
|-------------|------------------|
| Keep boolean flags | Cannot represent contextual roles, overloaded semantics |
| Add more boolean flags | Exponential growth, still not contextual |
| Role on transaction only | Loses global party classification, no role history |
| Single role_type on md_entities | Cannot have multiple roles, no effective dating |

---

## 6. Data Model Implications

### 6.1 New Tables

| Table | Purpose |
|-------|---------|
| party_roles | Canonical contextual role authority |
| party_relationships | Party-to-party business relationships |
| party_contacts | Party communication contacts |
| party_locations | Party-to-location relationships |

### 6.2 Table Extensions

| Table | Extension |
|-------|-----------|
| md_locations | Add location_type, parent_id, timezone, external_code |
| shp_shipments | Add pol_location_id, pod_location_id |

---

## 7. Security Implications

- Party role mutations require `commercial:manage` permission
- Party role reads require `commercial:read` permission
- Tenant isolation is server-derived (IdentityContext + RLS)
- Cross-tenant role assignment prevented by RLS + application validation
- Party roles MUST NOT become a second authorization system (U-02 remains authoritative)

---

## 8. Tenant Isolation

- All new tables have tenant_id
- All RLS policies use get_my_tenant_id()
- No cross-tenant role assignment possible
- Browser cannot establish tenant identity

---

## 9. Token Compatibility

Party Role Architecture MUST NOT create:
- Token burn authority (TOKEN-3 owns this)
- Token completion authority (TOKEN-4 owns this)
- Token pricing authority (ADR-057..066 own this)
- Duplicate completion events

**Token boundary is preserved.**

---

## 10. Forwarding Compatibility

Party roles support Forwarding requirements:
- CARRIER for transport providers
- AGENT for customs brokers

Shipment contextual roles (SHIPPER, CONSIGNEE, NOTIFY_PARTY) are owned by `shp_shipments` direct FK references:
- `shp_shipments.shipper_id` → md_entities
- `shp_shipments.consignee_id` → md_entities
- `shp_shipments.notify_party_id` → md_entities

No Forwarding-specific Party masters are created.

---

## 11. Consequences

- All domains use canonical party_roles instead of boolean flags
- Role-based access control becomes possible
- Commercial context roles are explicitly modeled in party_roles
- Shipment context roles (SHIPPER, CONSIGNEE, NOTIFY_PARTY) remain as direct FK references on shp_shipments
- Legacy boolean flags are deprecated (not immediately removed)
- Assignment logic requires migration (131 references)
- Party Role Registry is NOT a universal registry of every role a Party can perform

---

## 12. Non-Goals

- Party Role Architecture does NOT replace U-02 authorization
- Party Role Architecture does NOT create resource/carrier masters
- Party Role Architecture does NOT implement ERP integration
- Party Role Architecture does NOT remove legacy columns in this phase
- Party Role Registry is NOT a universal registry of every role a Party can perform
- Shipment context roles (SHIPPER, CONSIGNEE, NOTIFY_PARTY) are NOT in party_roles — they are owned by shp_shipments

---

## 13. Dependencies

- U-01 Identity Resolver (preserved)
- U-02 Authorization (preserved)
- ADR-018 Engagement Root (preserved)
- ADR-031 Anti-Corruption Boundary (preserved)
- TOKEN-3/TOKEN-4 Token Foundation (preserved)

---

## 14. Future Decisions

- Party role hierarchy (role inheritance)
- Party role templates (pre-defined role sets)
- Party role approval workflows
- Party role analytics

---

## 15. Ratification Criteria

This ADR is ready for ratification when:
1. Human reviewers confirm role type vocabulary (10 roles: 6 global + 4 commercial context)
2. Human reviewers confirm context type semantics (5 types: GLOBAL, ENGAGEMENT, ORDER, SHIPMENT, CONTRACT)
3. Human reviewers confirm shipment context roles are NOT in party_roles
4. Migration governance is approved
5. Security model is validated

---

## 16. Amendment History

| Date | Amendment | Reason |
|------|-----------|--------|
| 2026-09-02 | Removed SHIPPER, CONSIGNEE, NOTIFY_PARTY from party_roles vocabulary | Duplicate authority with shp_shipments FK references (DATA-2 ADR Forensic Challenge) |

---

**END OF ADR-070**
