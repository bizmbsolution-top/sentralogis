# SENTRALOGIS — DATA-2R
# FORENSIC RECONCILIATION

**Date:** 2026-09-02  
**Phase:** DATA-2R  
**Nature:** INDEPENDENT FORENSIC RECONCILIATION  
**Status:** PRODUCTION IMPLEMENTATION NOT AUTHORIZED  

---

## 1. EXECUTIVE VERDICT

**DATA-2 overall verdict: PASS WITH CONDITIONS**

The DATA-2 architecture is fundamentally sound and correctly extends existing canonical structures. However, three conditions must be resolved before implementation:

1. **Boolean deprecation requires migration proof** — `is_vendor` has active business logic that must be preserved
2. **location_type enum conflict** — fw_locations uses a different enum than WMS location_type; consolidation requires care
3. **parent_id cycle prevention** — Application-layer only is acceptable but requires explicit documentation

---

## 2. CANONICAL PARTY VERIFICATION

### 2.1 md_entities is Truly Canonical

**Evidence:** 73+ code references use md_entities as the party authority. No competing party master exists.

**Readers:**
- `app/api/wo/route.ts` — customer resolution
- `app/api/track/wo/[token]/route.ts` — customer tracking
- `app/api/fleet-status/route.ts` — vendor fleet detection
- `lib/application/engagement/engagement-bridge.ts` — party resolution
- `lib/application/service-contracts/forwarding-writer.ts` — party resolution
- `lib/domain/customs/ceisa/mapping-engine.ts` — tax_id resolution
- `lib/invoice/pdf.ts` — customer billing
- `src/application/copilot/providers/CustomerLookupProvider.ts` — customer search

**Writers:**
- `app/api/webhooks/whatsapp/route.ts` — entity creation
- `src/application/gps/EasyGoSyncService.ts` — vendor entity creation
- `lib/services/assignmentSave.ts` — vendor resolution

**Foreign Keys (20+ tables reference md_entities):**
- work_orders.customer_id
- job_orders.transporter_id, vendor_id
- fw_order_headers.customer_id
- fw_consolidations.shipping_line_id
- shp_shipments.customer_id, shipper_id, consignee_id, notify_party_id
- shp_execution_legs.assigned_vendor_id
- cus_declarations.importer_id, exporter_id
- wh_inbound_receipts.customer_id, shipper_id
- wh_outbound_shipments.customer_id, consignee_id
- md_drivers.entity_id
- md_fleets.entity_id
- md_entity_addresses.entity_id
- crm_deals.entity_id
- commercial_work_orders.customer_id

**Classification:** CANONICAL — Confirmed

---

## 3. PARTY HIERARCHY FORENSICS

### 3.1 parent_id Sufficiency

**Current State:**
- parent_id on md_entities (UUID, FK → md_entities.id, ON DELETE SET NULL)
- Index: idx_md_entities_parent
- No cycle prevention at DB level
- No depth limit

**Challenge: Is application-layer cycle prevention sufficient?**

**Verdict: YES, with conditions.**

For a production-grade multi-tenant system:
- Cycle prevention at application layer is acceptable for parent_id patterns
- The risk is low because hierarchy changes are infrequent admin operations
- A recursive CTE with depth limit (e.g., 10) prevents infinite loops
- DB-level trigger is optional but recommended for defense-in-depth

**Recommendation:** Document the cycle prevention strategy. Consider a DB-level safety net in a future phase.

### 3.2 Cross-Tenant Parent References

**Risk:** parent_id could reference a party in a different tenant.

**Mitigation:** RLS on md_entities enforces tenant_id = get_my_tenant_id(). Application must validate that parent_id belongs to the same tenant.

---

## 4. CRITICAL PARTY SEMANTIC TEST

### 4.1 Concept Separation

| Concept | Current Representation | DATA-2 Target | Status |
|---------|------------------------|---------------|--------|
| Parent/Child | md_entities.parent_id | Same | PASS |
| Customer | is_customer boolean | party_roles (CUSTOMER) | MIGRATE |
| Bill-To | Not modeled | party_roles (BILL_TO) | NEW |
| Ship-To | Not modeled | party_roles (SHIP_TO) | NEW |
| Shipper | shp_shipments.shipper_id | party_roles (SHIPPER) + transaction ref | PASS |
| Consignee | shp_shipments.consignee_id | party_roles (CONSIGNEE) + transaction ref | PASS |
| Vendor | is_vendor boolean | party_roles (VENDOR) | MIGRATE |
| Carrier | md_transporters + md_entities | party_roles (CARRIER) | EXTEND |
| Agent | Not modeled | party_roles (AGENT) | NEW |

### 4.2 Realistic Example Test

```
BYD Group (parent_id: null)
├── CUSTOMER (GLOBAL) — YES, party_roles
├── BILL_TO (GLOBAL) — YES, party_roles
└── VENDOR (GLOBAL) — NO, not a vendor

BYD Indonesia (parent_id: BYD Group)
├── CUSTOMER (GLOBAL) — YES, party_roles
├── BILL_TO (ENGAGEMENT: ENG-001) — YES, party_roles
└── SHIP_TO (ORDER: SO-001) — YES, party_roles

BYD Subang Factory (parent_id: BYD Indonesia)
├── CONSIGNEE (SHIPMENT: SHP-001) — YES, party_roles
└── SHIP_TO (ORDER: SO-002) — YES, party_roles

Transporter XYZ (parent_id: null)
├── VENDOR (GLOBAL) — YES, party_roles
└── CARRIER (GLOBAL) — YES, party_roles
```

**Verdict:** Concepts are correctly separated. Parent/Child ≠ Bill-To/Ship-To.

---

## 5. BOOLEAN DEPRECATION FORENSICS

### 5.1 is_customer

| Aspect | Finding |
|--------|---------|
| Column | md_entities.is_customer |
| Readers | `lib/domain/jo/assignment.ts:253` — filters transporters by `!is_customer` |
| Writers | None found in application code |
| Business Meaning | Distinguishes customers from transporters |
| Replacement | party_roles (CUSTOMER, context_type: GLOBAL) |
| Migration Risk | LOW — Single reader, no writers |

### 5.2 is_vendor

| Aspect | Finding |
|--------|---------|
| Column | md_entities.is_vendor |
| Readers | `lib/domain/jo/assignment.ts:55,138,241,253,262,282` — vendor resolution for assignments |
| Readers | `app/api/fleet-status/route.ts:148,173` — vendor fleet detection |
| Readers | `app/(dashboard)/hq/finance/cost-audit/hooks/useCostAuditData.ts:432` — vendor cost filtering |
| Readers | `src/application/gps/EasyGoSyncService.ts:129` — vendor entity lookup |
| Writers | `src/application/gps/EasyGoSyncService.ts:146` — sets is_vendor = true |
| Business Meaning | Distinguishes vendor/3rd-party from own-fleet |
| Replacement | party_roles (VENDOR, context_type: GLOBAL) |
| Migration Risk | **HIGH** — Multiple readers AND writers in active business logic |

### 5.3 is_supplier

| Aspect | Finding |
|--------|---------|
| Column | md_entities.is_supplier |
| Readers | None found in application code |
| Writers | None found |
| Business Meaning | Supplier flag (unused) |
| Replacement | party_roles (SUPPLIER, context_type: GLOBAL) |
| Migration Risk | LOW — No active usage |

### 5.4 is_broker

| Aspect | Finding |
|--------|---------|
| Column | md_entities.is_broker |
| Readers | None found in application code |
| Writers | None found |
| Business Meaning | Broker flag (unused) |
| Replacement | party_roles (BROKER, context_type: GLOBAL) |
| Migration Risk | LOW — No active usage |

### 5.5 Boolean Deprecation Verdict

| Boolean | Deprecation Safe? | Condition |
|---------|-------------------|-----------|
| is_customer | YES | Update assignment.ts reader |
| is_vendor | **CONDITIONAL** | Must preserve business logic in party_roles |
| is_supplier | YES | No active usage |
| is_broker | YES | No active usage |

**Critical Finding:** `is_vendor` deprecation is BLOCKING until all readers/writers are migrated to party_roles. The assignment logic (`assignment.ts:253`) filters transporters by `is_vendor || !is_customer` — this logic must be preserved.

---

## 6. TRANSACTION CONTEXT VALIDATION

### 6.1 Anti-Pattern Check

**Target Anti-Pattern:**
```ts
party.bill_to_id
party.ship_to_id
party.consignee_id
party.payer_id
```

**Finding:** DATA-2 does NOT propose this anti-pattern. Instead:
- party_roles with context_type (GLOBAL, ENGAGEMENT, ORDER, SHIPMENT, CONTRACT)
- Transaction references (shp_shipments.shipper_id, consignee_id) remain on the transaction

**Verdict:** Transaction context is correctly separated from master data.

### 6.2 Role Placement

| Role | Placement | Correct? |
|------|-----------|----------|
| CUSTOMER | party_roles (GLOBAL) | YES |
| BILL_TO | party_roles (ORDER context) | YES |
| SHIP_TO | party_roles (ORDER context) | YES |
| SHIPPER | party_roles (SHIPMENT context) | YES |
| CONSIGNEE | party_roles (SHIPMENT context) | YES |
| PAYER | party_roles (ORDER context) | YES |
| NOTIFY_PARTY | party_roles (SHIPMENT context) | YES |
| VENDOR | party_roles (GLOBAL) | YES |
| CARRIER | party_roles (GLOBAL) | YES |

---

## 7. PARTY ROLE MODEL FORENSICS

### 7.1 party_roles Correctness

**Challenge:** Is party_roles genuinely the correct authority?

**Verdict: YES.**

**Reasoning:**
- Boolean flags cannot represent contextual roles (a party can be CUSTOMER for one order and not for another)
- party_roles with context_type provides the necessary flexibility
- UNIQUE constraint prevents duplicate assignments
- Effective dating supports role lifecycle

### 7.2 Role Scope Questions

| Question | Answer |
|----------|--------|
| Is role scoped by tenant? | YES — tenant_id on party_roles |
| Is role scoped by relationship? | YES — context_type + context_id |
| Is role scoped by transaction? | YES — context_type = ORDER/SHIPMENT |
| Can one party have multiple roles? | YES — multiple role_type values |
| Can a role be active/inactive? | YES — effective_from/to |
| Can same party be CUSTOMER and VENDOR? | YES — different role_type values |
| Can same party be BILL_TO and SHIP_TO? | YES — different contexts |
| Does a role require another party? | NO — roles are standalone |
| Does a role require a service context? | NO — GLOBAL roles are valid |

---

## 8. PARTY RELATIONSHIP FORENSICS

### 8.1 Is party_relationships Necessary?

**Challenge:** Does hierarchy + roles already provide sufficient semantics?

**Verdict: YES, relationship table is necessary.**

**Reasoning:**
- Hierarchy (parent_id) only captures parent/child
- Roles capture what a party IS, not how parties RELATE
- Business relationships (CUSTOMER_OF, SUPPLIER_OF, AGENT_OF) are distinct from hierarchy

**Example:**
```
BYD Indonesia
├── hierarchy → BYD Group (parent_id)
└── customer relationship → SENTRALOGIS Tenant (party_relationships)
```

### 8.2 Relationship Model Validation

| Aspect | Finding |
|--------|---------|
| Directionality | from_party_id → to_party_id (correct) |
| Effective dates | effective_from/to (correct) |
| Tenant scope | tenant_id (correct) |
| Uniqueness | UNIQUE (tenant_id, from_party_id, to_party_id, relationship_type) |
| Inverse semantics | Not automatic — acceptable for v1 |

---

## 9. CONTACT FORENSICS

### 9.1 party_contacts Necessity

**Current State:** md_entity_addresses has contact_person and contact_phone but no dedicated contact model.

**Verdict: YES, party_contacts is necessary.**

**Reasoning:**
- md_entity_addresses is address-centric, not contact-centric
- A party needs multiple contacts (operations, finance, management)
- Contacts need roles, preferred methods, active status
- Contact ≠ User Identity (confirmed)

### 9.2 Contact vs User Identity

| Aspect | Contact | User Identity |
|--------|---------|---------------|
| Purpose | Communication endpoint | Authentication + authorization |
| Table | party_contacts | profiles / auth.users |
| Relationship | Belongs to party | May link to party via customer_portal_users |
| Portal access | NO | YES |

**Verdict:** Correctly separated. Contact ≠ User.

---

## 10. CANONICAL LOCATION VERIFICATION

### 10.1 md_locations is Truly Canonical

**Evidence:** Referenced by shp_shipments, shp_execution_legs, commercial_service_scopes, forwardingActions.ts.

**Readers:**
- `lib/actions/forwardingActions.ts:30` — location search
- `lib/domain/shipment/types.ts` — origin/destination references

**Writers:** None found in application code (locations are admin-managed).

**Classification:** CANONICAL — Confirmed

### 10.2 fw_locations is Duplicate Authority

**Evidence:**
- Separate table with location_id PK
- Referenced by fw_order_headers.origin_port_id, dest_port_id
- Referenced by fw_legs.start_location_id, end_location_id
- Has its own location_type enum (different from WMS location_type)

**Classification:** DUPLICATE AUTHORITY — Confirmed

---

## 11. LOCATION HIERARCHY FORENSICS

### 11.1 parent_id on md_locations

**Challenge:** Is unrestricted parent-child relationships safe?

**Verdict: YES, with type compatibility guidelines.**

**Potential Issue:** Port → Warehouse (semantically incorrect)

**Mitigation:** Application-layer validation should enforce type compatibility:
- PORT → TERMINAL → BERTH (valid)
- FACTORY → WAREHOUSE → RECEIVING_AREA (valid)
- PORT → WAREHOUSE (invalid — application should prevent)

**Recommendation:** Document type compatibility matrix. Application enforces, not DB.

### 11.2 Cycle Prevention

Same as party hierarchy — application-layer cycle prevention is acceptable.

---

## 12. LOCATION TYPE MODEL

### 12.1 Single Enum Sufficiency

**Challenge:** Is location_type as a single enum sufficient?

**Verdict: YES for v1.**

**Reasoning:**
- A location has a primary type (PORT, WAREHOUSE, etc.)
- Multiple capabilities can be tracked via party_locations or operational attributes
- Creating separate masters for each type would be over-engineering

### 12.2 Existing location_type Enums

**Critical Finding:** Two different location_type definitions exist:

1. **WMS location_type** (md_warehouse_locations):
   - STORAGE, PICKING, RECEIVING, SHIPPING, QUARANTINE, RETURN
   - Used for warehouse-internal locations

2. **FW location_type** (fw_locations):
   - PORT, WAREHOUSE, DELIVERY_POINT (inferred from forwarding/types.ts)
   - Used for forwarding locations

**Conflict:** These enums have different purposes. WMS is warehouse-internal, FW is logistics-network.

**Resolution:** 
- md_locations.location_type should use the broader logistics-network enum
- WMS warehouse-internal locations should use md_warehouse_locations (separate table)
- No conflict if scopes are respected

---

## 13. PARTY LOCATION FORENSICS

### 13.1 party_locations Necessity

**Verdict: YES.**

**Reasoning:**
- Party and Location are separate entities
- A party can be associated with multiple locations
- A location can be associated with multiple parties
- Relationship type (OWNS, OPERATES, USES) provides semantic clarity

### 13.2 Duplication with Transaction Addresses

**Risk:** party_locations could duplicate transaction-level addresses.

**Mitigation:**
- party_locations is for canonical, reusable associations
- Transaction addresses (shipment origin/destination) remain on the transaction
- party_locations is a superset; transactions reference specific locations

---

## 14. NETWORK LOCATION

### 14.1 Party Location vs Network Location

| Type | Example | party_id |
|------|---------|----------|
| Party Location | BYD Subang Factory | BYD Indonesia |
| Network Location | Tanjung Priok Port | NULL (shared) |
| Both | Customer CFS | Customer XYZ |

**Verdict:** Model supports this without duplication. Network locations have NULL party_id.

---

## 15. POL/POD

### 15.1 Verification

**Verdict: PASS.**

- Shipment.pol_location_id → md_locations
- Shipment.pod_location_id → md_locations
- No separate POL/POD masters required
- All transport modes supported (Ocean, Air, Rail, Road)

---

## 16. GEOGRAPHY

### 16.1 Attribute Placement

| Attribute | Placement | Correct? |
|-----------|-----------|----------|
| country, province, city | md_locations (existing) | YES |
| postal_code, address | md_locations (existing) | YES |
| latitude, longitude | md_locations (existing) | YES |
| timezone | md_locations (new) | YES |
| UN/LOCODE, IATA | external_references | YES |

**Verdict:** Correct. External codes belong in external_references, not base table.

---

## 17. EXTERNAL REFERENCES FORENSICS

### 17.1 external_references Necessity

**Verdict: YES, with strict governance.**

**Challenge:** Can external_references become an uncontrolled dump?

**Mitigation:**
- UNIQUE (tenant_id, entity_type, entity_id, external_system) prevents duplicates
- is_active flag supports lifecycle
- external_context JSONB for metadata (not query-critical)

### 17.2 One External ID → Multiple Canonical Objects?

**Question:** Can one external ID map to multiple canonical objects?

**Answer:** NO — UNIQUE constraint prevents this. If business requires many-to-one, that's a data integrity defect that should be flagged.

---

## 18. ERP OPERATING MODES

### 18.1 Three Modes Validation

| Mode | Support |
|------|---------|
| Standalone | YES — SENTRALOGIS owns all master data |
| ERP-led | YES — external_references maps ERP IDs |
| Hybrid | YES — ERP owns some attributes, SENTRALOGIS owns operational |

**Verdict:** Architecture supports all three modes without assuming ERP is mandatory.

---

## 19. CUSTOMER/VENDOR SECURITY

### 19.1 Conceptual Mapping

```
IdentityContext (customerId)
      ↓
Party (md_entities)
      ↓
Party Role (party_roles: CUSTOMER)
      ↓
Authorized Scope (tenant_id + role)
      ↓
Visible Objects (orders, shipments)
```

**Verdict:** Conceptually sound. Customer isolation via IdentityContext + RLS.

---

## 20. TENANT ISOLATION

### 20.1 Cross-Tenant Prevention

| Relationship | Tenant Isolation |
|--------------|------------------|
| Party → Party | Both must have same tenant_id |
| Party → Location | Both must have same tenant_id |
| Location → Location | Both must have same tenant_id |
| Party → External Ref | Both must have same tenant_id |

**Verdict:** All relationships respect tenant boundaries via RLS + application validation.

---

## 21. CROSS-DOMAIN AUTHORITY

### 21.1 Duplicate Authority Check

| Domain | Party Authority | Location Authority |
|--------|-----------------|-------------------|
| Commercial | READ/WRITE | READ |
| Forwarding | READ | READ/WRITE (party_locations) |
| Customs | READ | READ |
| Trucking | READ | READ/WRITE (party_locations) |
| WMS | READ | READ/WRITE (party_locations) |
| Finance | READ | READ |
| Portal | READ (own) | READ (own) |

**Verdict:** No domain creates duplicate party or location masters.

---

## 22. LEGACY FORENSICS

### 22.1 fw_locations

| Aspect | Finding |
|--------|---------|
| Authority | DUPLICATE of md_locations |
| Readers | fw_order_headers, fw_legs |
| Writers | None found |
| Migration Strategy | Migrate to md_locations, update FKs |
| Risk | MEDIUM — FK update required |
| Target | Deprecate |

### 22.2 md_transporters

| Aspect | Finding |
|--------|---------|
| Authority | ADAPTER — transporter-specific attributes |
| Readers | assignment logic |
| Writers | None found |
| Migration Strategy | Keep for transporter-specific attributes |
| Risk | LOW |
| Target | Keep as adapter |

---

## 23. TOKEN COMPATIBILITY

### 23.1 Duplicate Token Authority

**Finding:** DATA-2 introduces no token-related tables or logic.

**Verdict:** PASS — No duplicate token authority.

---

## 24. UI/UX COMPATIBILITY

### 24.1 Master Data UX Support

| UI Component | Supported? |
|--------------|------------|
| Parties | YES |
| Party Hierarchy | YES (parent_id) |
| Contacts | YES (party_contacts) |
| Locations | YES |
| Location Hierarchy | YES (parent_id) |
| External References | YES |

**Verdict:** PASS — Compatible with business-object/lifecycle navigation.

---

## 25. ADR FORENSICS

### 25.1 Party Role Architecture

**ADR Required: YES**

**Reason:** Materially changes how parties are classified and accessed across domains. All domains must use party_roles instead of boolean flags.

**Existing ADR sufficient: NO**

---

### 25.2 External Reference Architecture

**ADR Required: YES**

**Reason:** Establishes canonical pattern for external system integration. All external ID mappings use external_references table.

**Existing ADR sufficient: NO**

---

### 25.3 Hierarchy Integrity

**ADR Required: NO**

**Reason:** parent_id pattern is already established (md_entities). Extension to md_locations follows same pattern.

---

## 26. CONTRADICTION DETECTION

### 26.1 Duplicate Authority Scan

| Contradiction | Status |
|---------------|--------|
| Duplicate Party Authority | NONE |
| Duplicate Customer Authority | NONE |
| Duplicate Vendor Authority | NONE |
| Duplicate Carrier Authority | NONE |
| Duplicate Location Authority | FOUND (fw_locations) |
| Duplicate Contact Authority | NONE |
| Duplicate External ID Authority | NONE |
| Duplicate Role Authority | NONE |
| Duplicate Hierarchy Authority | NONE |
| Duplicate Token Authority | NONE |

### 26.2 Blocking Contradictions

**None found.** fw_locations is a known duplicate scheduled for deprecation, not a blocking contradiction.

---

**END OF FORENSIC RECONCILIATION**
