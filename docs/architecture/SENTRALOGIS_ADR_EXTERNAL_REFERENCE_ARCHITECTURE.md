# ADR-071 — External Reference Architecture

**Status:** PROPOSED — PENDING HUMAN RATIFICATION  
**Date:** 2026-09-02  
**Depends on:** ADR-070 (Party Role Architecture), ADR-031 (Anti-Corruption Boundary)  

---

## 1. Context

DATA-1 forensic discovery established that SENTRALOGIS has no formal external reference model. Integration identifiers (ERP customer codes, CRM account IDs, customs system IDs) are either absent or embedded as free-text attributes without governance.

DATA-2R-C condition closure confirmed that:
- fw_locations.type uses a different enum than WMS location_type
- EasyGoSyncService creates vendor entities with integration-specific attributes
- No canonical mechanism maps SENTRALOGIS entities to external system identities

The absence of a canonical external reference model prevents ERP-led, SENTRALOGIS-led, and hybrid operating modes.

---

## 2. Decision

**External identity references are governed by a single canonical mechanism.**

### 2.1 External Reference Concept

```text
SENTRALOGIS Entity
       │
       └── External Reference
              │
              ├── ERP (SAP, Oracle, etc.)
              ├── CRM (Salesforce, etc.)
              ├── TMS
              ├── WMS
              ├── CUSTOMS (CEISA 4.0)
              └── Other External System
```

### 2.2 Canonical Table

```text
external_references
├── id (UUID PK)
├── tenant_id (UUID FK → tenants)
├── entity_type (TEXT: PARTY, LOCATION, CARRIER, SHIPMENT, ORDER)
├── entity_id (UUID)
├── external_system (TEXT: ERP, CRM, TMS, WMS, CUSTOMS, OTHER)
├── external_id (TEXT)
├── external_context (JSONB)
├── is_active (BOOLEAN)
├── created_at (TIMESTAMPTZ)
├── updated_at (TIMESTAMPTZ)
├── UNIQUE (tenant_id, entity_type, entity_id, external_system)
```

### 2.3 External Reference Rules

| Rule | Description |
|------|-------------|
| Identity | External reference identifies an entity in another system |
| NOT primary key | Does NOT replace SENTRALOGIS UUID |
| NOT business name | Does NOT replace entity name |
| NOT metadata | Is NOT free-form JSON dumping ground |
| Governance | source system + external_id + entity_type + tenant = unique |
| Lifecycle | is_active flag supports active/inactive semantics |
| Validation | Application validates external_id format per system |
| Ownership | Integration domain owns specific external references |

---

## 3. Uniqueness Rules

### 3.1 Canonical Uniqueness

```sql
UNIQUE (tenant_id, entity_type, entity_id, external_system)
```

This means:
- One entity can have multiple external references (one per system)
- One external ID maps to exactly one entity per tenant
- Same external ID can exist in different tenants

### 3.2 One External ID → Multiple Canonical Objects?

**Answer: NO.** The UNIQUE constraint prevents this. If business requires many-to-one, that is a data integrity defect that should be flagged, not accommodated.

---

## 4. ERP Operating Modes

### 4.1 Mode A — ERP-led

- ERP is System of Record for selected master data
- SENTRALOGIS references ERP identities via external_references
- External reference is authoritative for cross-system correlation

### 4.2 Mode B — SENTRALOGIS-led

- SENTRALOGIS is primary operational identity authority
- External references are optional
- External reference exists only for integration purposes

### 4.3 Mode C — Hybrid

- Both systems maintain identities
- external_references provides controlled cross-reference
- Each system owns its authoritative attributes

**The architecture does NOT assume one operating model for all tenants.**

---

## 5. Entity Types

| Entity Type | Canonical Table | Example External Ref |
|-------------|-----------------|---------------------|
| PARTY | md_entities | ERP Customer ID, CRM Account ID |
| LOCATION | md_locations | ERP Plant Code, WMS Warehouse ID |
| CARRIER | md_entities (CARRIER role) | TMS Carrier ID |
| SHIPMENT | shp_shipments | ERP Delivery ID |
| ORDER | sales_orders | ERP Sales Order ID |

---

## 6. External Systems

| System | Description | Example IDs |
|--------|-------------|-------------|
| ERP | Enterprise Resource Planning | SAP Customer Number |
| CRM | Customer Relationship Management | Salesforce Account ID |
| TMS | Transportation Management System | Carrier Code |
| WMS | Warehouse Management System | Warehouse ID |
| CUSTOMS | Customs System | CEISA Declarant ID |
| OTHER | Future systems | Integration-specific |

---

## 7. Security Implications

- External reference mutations require `integration:manage` permission
- External reference reads require `integration:read` permission
- Tenant isolation is server-derived (IdentityContext + RLS)
- Cross-tenant reference prevented by RLS
- Client-supplied external identifiers MUST NOT bypass IdentityContext
- External references MUST NOT become a second identity authority

---

## 8. Tenant Isolation

- tenant_id on all external_references
- RLS policy: tenant_id = get_my_tenant_id()
- No cross-tenant external reference possible
- Browser cannot establish tenant identity

---

## 9. Governance — Preventing Uncontrolled Dump

To prevent external_references from becoming an uncontrolled metadata dump:

1. **Controlled vocabularies:** entity_type and external_system use CHECK constraints
2. **UNIQUE constraint:** Prevents duplicate references
3. **is_active flag:** Supports lifecycle management
4. **external_context JSONB:** Limited to integration metadata, NOT query-critical data
5. **No free-text entity_type:** Must be from controlled vocabulary
6. **Validation:** Application validates external_id format per system

---

## 10. Token Compatibility

External Reference Architecture MUST NOT create:
- Token burn authority (TOKEN-3 owns this)
- Token completion authority (TOKEN-4 owns this)
- Token pricing authority (ADR-057..066 own this)
- Duplicate completion events

**Token boundary is preserved.**

---

## 11. Forwarding Compatibility

External references support Forwarding requirements:
- ERP shipment IDs
- TMS carrier codes
- Customs declarant IDs

No Forwarding-specific external ID masters are created.

---

## 12. Consequences

- Single canonical mechanism for all external identity references
- ERP-led, SENTRALOGIS-led, and hybrid modes supported
- Governance prevents uncontrolled dump
- Integration trust boundaries are explicit

---

## 13. Non-Goals

- External Reference Architecture does NOT implement ERP integration
- External Reference Architecture does NOT synchronize data with external systems
- External Reference Architecture does NOT replace U-01 Identity Resolver
- External Reference Architecture does NOT remove legacy integration attributes

---

## 14. Alternatives Considered

| Alternative | Rejected Because |
|-------------|------------------|
| External ID columns on each table | Scattered authority, no governance |
| Separate table per system | Proliferation, no single view |
| JSONB metadata on entities | No uniqueness, no validation |
| Free-text key-value store | No governance, no query capability |

---

## 15. Future Decisions

- External reference synchronization workflows
- External reference validation rules per system
- External reference versioning
- External reference audit trail

---

## 16. Ratification Criteria

This ADR is ready for ratification when:
1. Human reviewers confirm entity type vocabulary
2. Human reviewers confirm external system vocabulary
3. Uniqueness constraints are validated
4. Security model is validated

---

**END OF ADR-071**
