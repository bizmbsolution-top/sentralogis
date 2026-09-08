# SENTRALOGIS — DATA-2 ADR
# FORENSIC CHALLENGE

**Date:** 2026-09-02  
**Phase:** DATA-2 ADR Ratification Closure  
**Nature:** FINAL INDEPENDENT FORENSIC CHALLENGE  
**Status:** NOT AUTHORIZED FOR IMPLEMENTATION  

---

## 1. CHALLENGE #1 — PARTY ROLE VOCABULARY

### 1.1 Role Classification

| Proposed Role | Classification | Currently In Schema? | Should be in party_roles? |
|---------------|----------------|----------------------|---------------------------|
| CUSTOMER | PARTY_MASTER_ROLE | is_customer boolean | YES |
| VENDOR | PARTY_MASTER_ROLE | is_vendor boolean | YES |
| SUPPLIER | PARTY_MASTER_ROLE | is_supplier boolean | YES |
| BROKER | PARTY_MASTER_ROLE | is_broker boolean | YES |
| CARRIER | PARTY_MASTER_ROLE | vendor_type='TRANSPORTER' | YES |
| AGENT | PARTY_MASTER_ROLE | Not modeled | YES |
| BILL_TO | COMMERCIAL_CONTEXT_ROLE | Not on sales_orders | CONDITIONAL |
| SHIP_TO | COMMERCIAL_CONTEXT_ROLE | Not on sales_orders | CONDITIONAL |
| PAYER | COMMERCIAL_CONTEXT_ROLE | Not on sales_orders | CONDITIONAL |
| ORDERING_PARTY | COMMERCIAL_CONTEXT_ROLE | Not on sales_orders | CONDITIONAL |
| SHIPPER | SHIPMENT_CONTEXT_ROLE | shp_shipments.shipper_id FK | **NO** |
| CONSIGNEE | SHIPMENT_CONTEXT_ROLE | shp_shipments.consignee_id FK | **NO** |
| NOTIFY_PARTY | SHIPMENT_CONTEXT_ROLE | shp_shipments.notify_party_id FK | **NO** |

### 1.2 Critical Finding: Duplicate Authority

**SHIPPER, CONSIGNEE, and NOTIFY_PARTY are already direct FK references on shp_shipments:**

```sql
shp_shipments:
  shipper_id UUID REFERENCES md_entities(id),
  consignee_id UUID REFERENCES md_entities(id),
  notify_party_id UUID REFERENCES md_entities(id),
```

**ADR-070 proposes adding these same roles to party_roles. This creates DUPLICATE AUTHORITY.**

The same information would be stored in two places:
1. `shp_shipments.shipper_id` (existing)
2. `party_roles(party_id, 'SHIPPER', 'SHIPMENT', shipment_id)` (proposed)

This violates the single-source-of-truth principle and creates synchronization risk.

### 1.3 Resolution

**Remove SHIPPER, CONSIGNEE, NOTIFY_PARTY from the party_roles vocabulary.**

These roles should remain as direct FK references on shp_shipments, following the existing schema pattern.

### 1.4 Commercial Context Roles (BILL_TO, SHIP_TO, PAYER, ORDERING_PARTY)

These are NOT currently on sales_orders. Two options exist:

**Option A: Direct FK on sales_orders**
```sql
sales_orders:
  bill_to_id UUID REFERENCES md_entities(id),
  ship_to_id UUID REFERENCES md_entities(id),
  payer_id UUID REFERENCES md_entities(id),
  ordering_party_id UUID REFERENCES md_entities(id),
```
- Pros: Simple, explicit, follows shp_shipments pattern
- Cons: Adds 4 columns, less flexible for global defaults

**Option B: party_roles with context_type=ORDER**
```sql
party_roles:
  (party_id, 'BILL_TO', 'ORDER', order_id),
  (party_id, 'SHIP_TO', 'ORDER', order_id),
  (party_id, 'PAYER', 'ORDER', order_id),
  (party_id, 'ORDERING_PARTY', 'ORDER', order_id),
```
- Pros: Flexible, supports global defaults, no schema changes
- Cons: More complex queries, harder to enforce cardinality

**Recommendation:** Option B (party_roles) is preferred because:
1. Supports global defaults (party is BILL_TO for all orders unless overridden)
2. No schema changes to sales_orders
3. Consistent with the party_roles model
4. Easier to query "all orders where Party X is BILL_TO"

---

## 2. CHALLENGE #2 — CONTEXT TYPE SEMANTICS

### 2.1 Context Type Validation

| Context | Owner Aggregate | Exists in Schema? | Valid? |
|---------|-----------------|-------------------|--------|
| GLOBAL | party_roles itself | YES | PASS |
| ENGAGEMENT | commercial_work_orders | YES (ADR-018) | PASS |
| ORDER | sales_orders | YES (ADR-034) | PASS |
| SHIPMENT | shp_shipments | YES (canonical) | PASS |
| CONTRACT | ??? | **NO** | **CONDITIONAL** |

### 2.2 CONTRACT Context Issue

**There is no contracts table in the current schema.**

The commercial_work_orders serves as the engagement root (ADR-018), but it is not a contract. The CONTRACT context_type has no owner aggregate.

**Resolution:** One of:
1. **Defer CONTRACT** until a contracts table exists
2. **Map CONTRACT to commercial_work_orders** (engagement serves as contract proxy)
3. **Document CONTRACT as forward-looking** with no current owner

**Recommendation:** Option 3 — Document CONTRACT as forward-looking. The context_type can be defined now and used when contracts are implemented. This is acceptable as long as it's clearly documented.

### 2.3 Context Type Invariant

**context_type means: the scope in which the Party Role is valid.**

A role with context_type=GLOBAL is valid everywhere. A role with context_type=ORDER is valid only for that specific order.

This is semantically sound and prevents a role from becoming globally valid merely because a row exists in party_roles.

### 2.4 Role Resolution Order

Where a Party has multiple roles at different scopes:

```
Party X:
  GLOBAL → CUSTOMER
  ORDER A → BILL_TO
  SHIPMENT B → CONSIGNEE
```

**Resolution rule:** More specific context takes precedence over less specific.
1. Check ORDER context first
2. Fall back to ENGAGEMENT context
3. Fall back to GLOBAL context

This is deterministic and prevents semantic collision.

---

## 3. CHALLENGE #3 — `is_vendor` AUTHORITY TRANSITION

### 3.1 Semantic Classification

| Usage Class | Meaning | Equivalent to VENDOR? | Migration Safe? |
|-------------|---------|----------------------|-----------------|
| Assignment filtering | External transporter eligible for assignment | YES | YES |
| Assignment resolveIsVendor | Vendor = NOT own-fleet | YES | YES |
| Fleet-status (is_vendor_fleet) | Cross-tenant fleet | **NO** — derived from vendor_tenant_id | N/A |
| Cost-audit | Payable counterparty | YES | YES |
| EasyGo sync | Integration partner | YES | YES |
| UI badges | External indicator | YES | YES |
| Entity creation defaults | New vendor | YES | YES |
| Filtering (vendor tab) | Vendor filter | YES | YES |
| Reporting | Filter by vendor status | YES | YES |

### 3.2 Critical Finding: is_vendor_fleet is Derived

**File:** `app/api/fleet-status/route.ts:101`

```typescript
const isVendorFleet = !!fleet.vendor_tenant_id && fleet.vendor_tenant_id !== tenantId;
```

`is_vendor_fleet` is **derived from `vendor_tenant_id`**, NOT from `is_vendor`. The fleet-status API does NOT use `md_entities.is_vendor` directly.

**Impact:** Fleet-status API needs NO migration for is_vendor deprecation.

### 3.3 Semantic Equivalence Proof

**Current:** `is_vendor = true` means "external counterparty (not own-fleet)"

**Target:** `party_roles.VENDOR (GLOBAL)` means "party has Vendor role"

**Equivalence:** YES — both represent the same semantic concept.

**Preservation of behavior:**
- assignment.ts:253 filter → Query party_roles for VENDOR
- assignment.ts:282 sort → Query party_roles for VENDOR
- EasyGoSyncService:129 → Query party_roles for VENDOR
- UI badges → Query party_roles for VENDOR

### 3.4 vendor_type Preservation

**Critical:** `vendor_type` (TRANSPORTER, SHIPPING_LINE, OWN, INTERNAL, OTHER) is a SEPARATE field from `is_vendor`.

`vendor_type` provides granular classification:
- `vendor_type = 'TRANSPORTER'` → Also assign `party_roles.CARRIER (GLOBAL)`
- `vendor_type = 'SHIPPING_LINE'` → Also assign `party_roles.CARRIER (GLOBAL)`
- `vendor_type = 'OWN'` → Do NOT assign VENDOR role

**Recommendation:** Preserve `vendor_type` as a separate field. Use it to determine additional party_roles assignments.

---

## 4. CHALLENGE #4 — EXTERNAL SYSTEM VOCABULARY

### 4.1 Vocabulary Analysis

| Proposed Category | Coverage |
|-------------------|----------|
| ERP | SAP, Oracle, Microsoft Dynamics, etc. |
| CRM | Salesforce, HubSpot, etc. |
| TMS | Transportation Management Systems |
| WMS | Warehouse Management Systems |
| CUSTOMS | CEISA 4.0, other customs systems |
| OTHER | Future systems |

### 4.2 System Category vs System Instance

**Current ADR-071 models only CATEGORY, not INSTANCE.**

Example:
```
Category: ERP
Instance: SAP S/4HANA Production
External Identifier: CUST-000123
```

**Question:** Can a tenant have multiple instances of the same category (e.g., SAP Production + SAP Sandbox)?

**Current uniqueness constraint:**
```sql
UNIQUE (tenant_id, entity_type, entity_id, external_system)
```

This allows only ONE external reference per (tenant, entity, system). If a tenant has SAP Production and SAP Sandbox with the same external_id, the constraint would prevent both.

**Resolution:** For v1, this is acceptable. Most tenants will have one instance per system category. If multi-instance support is needed in future, add `system_instance` column.

### 4.3 Vocabulary Governance

**Option A (Closed enum):** Simple, but requires migration to add new systems.

**Option B (Governed extensible):** More flexible, but requires reference table.

**Option C (Free-form):** No governance, not acceptable.

**Recommendation:** Option A for v1 with documented governance process for additions. The ADR should specify how new system categories are added (e.g., via migration + ADR amendment).

---

## 5. CROSS-ARCHITECTURE CONTRADICTION TEST

### 5.1 U-Series Compatibility

| U-Series | Compatibility | Notes |
|----------|---------------|-------|
| U-01 Identity Resolver | PASS | md_entities preserved |
| U-02 Authorization | PASS | party_roles ≠ authorization |
| U-03 Engagement | PASS | commercial_work_orders preserved |
| U-05 Capability Registry | PASS | No conflict |
| U-06 Capability Binding | PASS | No conflict |
| U-07 Execution Lineage | PASS | No conflict |
| U-08 Forwarding Writer Guard | PASS | No conflict |
| U-10 Architecture Gates | PASS | No conflict |
| U-11 Quote Identity | PASS | No conflict |
| U-12 Commercial Lineage | PASS | No conflict |
| U-13 Sales Order | PASS | No conflict |
| U-14 Fulfillment Architecture | PASS | No conflict |

### 5.2 ADR Compatibility

| ADR Range | Domain | Compatibility |
|-----------|--------|---------------|
| ADR-018..038 | Commercial/Shipment | PASS |
| ADR-039..056 | Fulfillment/Handoff | PASS |
| ADR-057..066 | Pricing | PASS |
| ADR-067..069 | Financial | PASS |

### 5.3 Token Compatibility

| Token Component | Compatibility |
|-----------------|---------------|
| TOKEN-3 Foundation | PASS |
| TOKEN-4 Integration | PASS |
| Token burn authority | NOT affected |
| Token completion authority | NOT affected |

### 5.4 Forwarding Compatibility

| Forwarding Component | Compatibility |
|----------------------|---------------|
| shp_shipments | PASS |
| shp_units | PASS |
| shp_execution_legs | PASS |
| Multimodal model | PASS |

### 5.5 Critical Invariant Verification

| Invariant | Status |
|-----------|--------|
| Party hierarchy ≠ Party role | PASS |
| Party role ≠ Transaction context role | PASS |
| Party identity ≠ Authentication identity | PASS |
| Party roles ≠ Authorization (U-02) | PASS |
| Party roles ≠ Order/Engagement state | PASS |
| Party roles ≠ Shipment execution state | PASS |
| Party/Location ≠ Token consumption | PASS |
| External references ≠ Primary identity | PASS |

---

## 6. DATA-3 BOUNDARY TEST

### 6.1 DATA-3 Should Include

| Component | Source |
|-----------|--------|
| party_roles | ADR-070 |
| party_relationships | ADR-070 |
| party_contacts | ADR-070 |
| party_locations | ADR-070 |
| md_locations extensions (location_type, parent_id, timezone, external_code) | ADR-070 |
| shp_shipments extensions (pol_location_id, pod_location_id) | ADR-070 |
| external_references | ADR-071 |

### 6.2 DATA-3 Should NOT Include

| Component | Reason |
|-----------|--------|
| Resource abstraction | Future phase |
| Carrier redesign | Future phase |
| Forwarding migration (fw_*) | Future phase |
| UI implementation | Future phase |
| Token changes | Out of scope |
| Pricing changes | Out of scope |
| Financial changes | Out of scope |
| SHIPPER/CONSIGNEE/NOTIFY_PARTY in party_roles | Would create duplicate authority |

---

## 7. ADR QUALITY TEST

### 7.1 ADR-070 Quality

| Section | Present |
|---------|---------|
| Context | YES |
| Problem | YES (implicit in Context) |
| Decision | YES |
| Decision Drivers | YES (in Consequences) |
| Alternatives Considered | YES |
| Rejected Alternatives | YES |
| Data Model Implications | YES |
| API/Service Implications | YES (in Consequences) |
| Security Implications | YES |
| Tenant Isolation | YES |
| Migration Strategy | YES |
| Backward Compatibility | YES (in Migration) |
| Testing Requirements | YES (in Migration) |
| Risks | YES (in Consequences) |
| Consequences | YES |
| Non-Goals | YES |
| Dependencies | YES |
| Future Decisions | YES |
| Ratification Criteria | YES |

### 7.2 ADR-071 Quality

| Section | Present |
|---------|---------|
| Context | YES |
| Problem | YES (implicit in Context) |
| Decision | YES |
| Decision Drivers | YES |
| Alternatives Considered | YES |
| Rejected Alternatives | YES |
| Data Model Implications | YES |
| Security Implications | YES |
| Tenant Isolation | YES |
| Migration Strategy | YES |
| Consequences | YES |
| Non-Goals | YES |
| Dependencies | YES |
| Future Decisions | YES |
| Ratification Criteria | YES |

---

## 8. CRITICAL FINDINGS SUMMARY

| # | Finding | Severity | Resolution |
|---|---------|----------|------------|
| 1 | SHIPPER/CONSIGNEE/NOTIFY_PARTY in party_roles creates duplicate authority with shp_shipments FKs | **BLOCKING** | Remove from party_roles vocabulary |
| 2 | CONTRACT context_type has no owner aggregate | CONDITIONAL | Document as forward-looking |
| 3 | is_vendor_fleet derived from vendor_tenant_id (not is_vendor) | INFORMATIONAL | No migration needed for fleet-status |
| 4 | vendor_type must be preserved for granular classification | INFORMATIONAL | Map to additional party_roles |
| 5 | External system vocabulary needs governance process | CONDITIONAL | Document addition process |

---

**END OF FORENSIC CHALLENGE**
