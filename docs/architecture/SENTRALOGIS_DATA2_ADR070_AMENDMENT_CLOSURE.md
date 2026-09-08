# SENTRALOGIS — DATA-2
# ADR-070 AMENDMENT CLOSURE

**Date:** 2026-09-02  
**Phase:** DATA-2 ADR Ratification — Amendment Closure  
**ADR:** ADR-070 Party Role Architecture  
**Related:** ADR-071 External Reference Architecture  
**Nature:** FORENSIC AMENDMENT ONLY  
**Status:** NOT AUTHORIZED FOR IMPLEMENTATION  

---

## 1. ORIGINAL FINDING

**Source:** `SENTRALOGIS_DATA2_ADR_FORENSIC_CHALLENGE.md`

> SHIPPER, CONSIGNEE, and NOTIFY_PARTY in `party_roles` would duplicate canonical Shipment authority already represented by `shp_shipments.shipper_id`, `shp_shipments.consignee_id`, and `shp_shipments.notify_party_id`.

**Classification:** BLOCKING — Duplicate canonical authority

---

## 2. FORENSIC EVIDENCE

### 2.1 shp_shipments FK References

**Source:** Migration `20260826_003_canonical_shipments_and_units.sql`

```sql
CREATE TABLE IF NOT EXISTS public.shp_shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.md_tenants(id),
  shipment_number TEXT NOT NULL,
  ...
  customer_id UUID NOT NULL REFERENCES public.md_entities(id),
  shipper_id UUID REFERENCES public.md_entities(id),
  consignee_id UUID REFERENCES public.md_entities(id),
  notify_party_id UUID REFERENCES public.md_entities(id),
  ...
);
```

**Evidence:**
- `shipper_id UUID REFERENCES public.md_entities(id)` — nullable FK
- `consignee_id UUID REFERENCES public.md_entities(id)` — nullable FK
- `notify_party_id UUID REFERENCES public.md_entities(id)` — nullable FK

### 2.2 Current Readers/Writers

| Field | Readers | Writers |
|-------|---------|---------|
| shipper_id | shipment domain, warehouse pages | shipment factory, assignment |
| consignee_id | shipment domain, warehouse pages, finance | shipment factory, assignment |
| notify_party_id | shipment domain | shipment factory |

### 2.3 Tenant Semantics

- All FK references are within the same tenant (shp_shipments.tenant_id = md_entities.tenant_id)
- RLS on shp_shipments enforces tenant_id = get_my_tenant_id()
- No cross-tenant shipment role assignment possible

### 2.4 Canonical Status

- shp_shipments is the canonical Shipment aggregate root
- FK references are the authoritative source for shipment-party relationships
- No competing Shipment role authority exists in the codebase

---

## 3. AUTHORITY ANALYSIS

### 3.1 The Contradiction

**ADR-070 (original):** SHIPPER, CONSIGNEE, NOTIFY_PARTY ∈ party_roles

**Existing schema:** SHIPPER, CONSIGNEE, NOTIFY_PARTY ∈ shp_shipments FK references

**Result:** Same business fact stored in two places → DUPLICATE AUTHORITY

### 3.2 Resolution

Apply: **ONE BUSINESS FACT → ONE CANONICAL AUTHORITY**

Shipment contextual roles are owned by the Shipment aggregate (shp_shipments), NOT by the Party Role Registry (party_roles).

---

## 4. ROLE AUTHORITY MATRIX

| Role | Classification | Canonical Authority | Stored In party_roles? | Reason |
|------|----------------|---------------------|------------------------|--------|
| CUSTOMER | PARTY_MASTER_ROLE | party_roles | YES | Global party classification |
| VENDOR | PARTY_MASTER_ROLE | party_roles | YES | Global party classification |
| SUPPLIER | PARTY_MASTER_ROLE | party_roles | YES | Global party classification |
| BROKER | PARTY_MASTER_ROLE | party_roles | YES | Global party classification |
| CARRIER | PARTY_MASTER_ROLE | party_roles | YES | Global party classification |
| AGENT | PARTY_MASTER_ROLE | party_roles | YES | Global party classification |
| BILL_TO | COMMERCIAL_CONTEXT_ROLE | party_roles | YES | Not on sales_orders |
| SHIP_TO | COMMERCIAL_CONTEXT_ROLE | party_roles | YES | Not on sales_orders |
| PAYER | COMMERCIAL_CONTEXT_ROLE | party_roles | YES | Not on sales_orders |
| ORDERING_PARTY | COMMERCIAL_CONTEXT_ROLE | party_roles | YES | Not on sales_orders |
| SHIPPER | SHIPMENT_CONTEXT_ROLE | shp_shipments.shipper_id | **NO** | Already canonical FK |
| CONSIGNEE | SHIPMENT_CONTEXT_ROLE | shp_shipments.consignee_id | **NO** | Already canonical FK |
| NOTIFY_PARTY | SHIPMENT_CONTEXT_ROLE | shp_shipments.notify_party_id | **NO** | Already canonical FK |

---

## 5. VERIFY THE REMAINING VOCABULARY

### 5.1 Final Count: 10 Roles (not 11)

The previous report stated "11 roles (6 global + 5 commercial context)" but this was an arithmetic error.

**Correct count:**
- Global Party Roles: 6 (CUSTOMER, VENDOR, SUPPLIER, BROKER, CARRIER, AGENT)
- Commercial Context Roles: 4 (BILL_TO, SHIP_TO, PAYER, ORDERING_PARTY)
- **Total: 10 roles**

### 5.2 Role Justification

| Role | Meaning | Party-Level? | Contextual? | Owner | In party_roles? |
|------|---------|--------------|-------------|-------|-----------------|
| CUSTOMER | Buys services | YES | NO | md_entities | YES |
| VENDOR | Provides services | YES | NO | md_entities | YES |
| SUPPLIER | Supplies goods | YES | NO | md_entities | YES |
| BROKER | Facilitates transactions | YES | NO | md_entities | YES |
| CARRIER | Transports goods | YES | NO | md_entities | YES |
| AGENT | Acts on behalf | YES | NO | md_entities | YES |
| BILL_TO | Receives invoices | NO | YES (ORDER) | sales_orders | YES |
| SHIP_TO | Receives goods | NO | YES (ORDER) | sales_orders | YES |
| PAYER | Pays invoices | NO | YES (ORDER) | sales_orders | YES |
| ORDERING_PARTY | Places orders | NO | YES (ORDER) | sales_orders | YES |

---

## 6. COMMERCIAL CONTEXT ROLES

### 6.1 BILL_TO

**Question:** Should BILL_TO be in party_roles or a direct FK on sales_orders?

**Analysis:**
- sales_orders currently has NO bill_to_id field
- A party can be BILL_TO for one order but not another
- Global default useful (party is BILL_TO for all orders unless overridden)

**Decision:** party_roles with context_type=ORDER. Supports global defaults + per-order overrides.

### 6.2 SHIP_TO

**Question:** Should SHIP_TO be in party_roles or a direct FK on sales_orders?

**Analysis:**
- sales_orders currently has NO ship_to_id field
- SHIP_TO is distinct from CONSIGNEE (order-level vs shipment-level)
- Global default useful

**Decision:** party_roles with context_type=ORDER. Distinct from CONSIGNEE on shp_shipments.

### 6.3 PAYER

**Question:** Should PAYER be in party_roles or a direct FK on sales_orders?

**Analysis:**
- sales_orders currently has NO payer_id field
- PAYER may differ from BILL_TO (e.g., parent company pays, subsidiary receives invoice)

**Decision:** party_roles with context_type=ORDER.

### 6.4 ORDERING_PARTY

**Question:** Should ORDERING_PARTY be in party_roles or a direct FK on sales_orders?

**Analysis:**
- sales_orders currently has customer_id but no ordering_party_id
- ORDERING_PARTY may differ from CUSTOMER (e.g., agent orders on behalf)

**Decision:** party_roles with context_type=ORDER.

---

## 7. SHIPMENT ROLE BOUNDARY

### 7.1 Classification

| Role | Classification | Canonical Authority |
|------|----------------|---------------------|
| SHIPPER | SHIPMENT_CONTEXT_ROLE | shp_shipments.shipper_id |
| CONSIGNEE | SHIPMENT_CONTEXT_ROLE | shp_shipments.consignee_id |
| NOTIFY_PARTY | SHIPMENT_CONTEXT_ROLE | shp_shipments.notify_party_id |

### 7.2 SHIP_TO vs CONSIGNEE Distinction

| Aspect | SHIP_TO | CONSIGNEE |
|--------|---------|-----------|
| Level | Order | Shipment |
| Meaning | Delivery destination for an order | Receiver of goods in a shipment |
| Authority | party_roles (ORDER context) | shp_shipments.consignee_id |
| Example | Deliver to BYD Subang warehouse | BYD Subang Factory receives goods |

**Verdict:** Distinct concepts. SHIP_TO is order-level, CONSIGNEE is shipment-level.

---

## 8. HIERARCHY INVARIANT

**Confirmed:** Party hierarchy (parent_id) is independent of Party role and Shipment contextual role.

**Example:**
```
BYD Group (parent_id: null)
└── BYD Indonesia (parent_id: BYD Group)
    └── Subang Factory (parent_id: BYD Indonesia)
```

This hierarchy does NOT determine:
- SHIPPER (owned by shp_shipments.shipper_id)
- CONSIGNEE (owned by shp_shipments.consignee_id)
- BILL_TO (owned by party_roles ORDER context)

---

## 9. NO DUPLICATE AUTHORITY TEST

### 9.1 Search Results

| Concept | Implementations | Competing? |
|---------|-----------------|------------|
| shipper | shp_shipments.shipper_id, wh_inbound_receipts.shipper_id | NO — different aggregates |
| consignee | shp_shipments.consignee_id, wh_outbound_shipments.consignee_id | NO — different aggregates |
| notify party | shp_shipments.notify_party_id | NO — single authority |
| ship_to | party_roles (ORDER context) | NO — single authority |
| bill_to | party_roles (ORDER context) | NO — single authority |
| payer | party_roles (ORDER context) | NO — single authority |
| ordering party | party_roles (ORDER context) | NO — single authority |

### 9.2 Verdict

**PASS** — No duplicate authority after amendment.

---

## 10. CROSS-ARCHITECTURE CHECK

| Architecture | Compatibility | Notes |
|--------------|---------------|-------|
| U-03 Engagement | PASS | commercial_work_orders preserved |
| U-12 Commercial Lineage | PASS | sales_orders preserved |
| U-13 Sales Order | PASS | customer_id preserved |
| U-14 Fulfillment | PASS | fulfillment preserved |
| shp_shipments | PASS | FK references preserved |
| ADR-071 | PASS | No contradiction |
| TOKEN-3 | PASS | No impact |
| TOKEN-4 | PASS | No impact |

---

## 11. ROLE RESOLUTION EXAMPLE

**Scenario:**
```
Party A: GLOBAL → CUSTOMER
Sales Order X: BILL_TO → Party A
Shipment Y: SHIPPER → Party A, CONSIGNEE → Party B, NOTIFY_PARTY → Party C
```

**party_roles contains:**
```
(party_id=A, role_type=CUSTOMER, context_type=GLOBAL, context_id=null)
(party_id=A, role_type=BILL_TO, context_type=ORDER, context_id=X)
```

**shp_shipments contains:**
```
(shipment_id=Y, shipper_id=A, consignee_id=B, notify_party_id=C)
```

**No duplication.** Shipment owns shipment-context roles. Party Registry owns party-master and commercial-context roles.

---

## 12. CONTRADICTION RESOLUTION

| Original Contradiction | Resolution |
|------------------------|------------|
| SHIPPER/CONSIGNEE/NOTIFY_PARTY in party_roles duplicates shp_shipments FKs | Removed from party_roles vocabulary. Shipment roles owned by shp_shipments. |

---

## 13. REMAINING RISKS

| Risk | Severity | Mitigation |
|------|----------|------------|
| is_vendor migration (131 refs) | HIGH | Dual-write period, exhaustive consumer inventory |
| party_roles query performance | MEDIUM | Index on (tenant_id, party_id, role_type) |
| fw_locations migration | MEDIUM | Pre-migration FK scan |

---

## 14. ADR-071 CHECK

**Status:** UNCHANGED

The amendment to ADR-070 does not affect ADR-071 (External Reference Architecture). No contradiction discovered.

---

## 15. ADR STATUS

| ADR | Status |
|-----|--------|
| ADR-070 | **AMENDED — PENDING HUMAN RATIFICATION** |
| ADR-071 | READY — PENDING HUMAN RATIFICATION |

---

## 16. RATIFICATION RECOMMENDATION

### 16.1 Human Ratification Required

1. Ratify ADR-070 (amended) — Party Role Architecture
2. Ratify ADR-071 — External Reference Architecture
3. Confirm 10-role vocabulary (6 global + 4 commercial context)
4. Confirm context-type semantics (4 types: GLOBAL, ENGAGEMENT, ORDER, CONTRACT)
5. Confirm shipment context roles are NOT in party_roles
6. Confirm governed extensibility of external-system vocabulary
7. Approve migration governance principles

### 16.2 DATA-3 Readiness

**READY FOR HUMAN AUTHORIZATION** — After ADR ratification.

---

## 17. FINAL VERDICT

### Executive Decision

**GREEN — AMENDMENT CLOSED**

### ADR-070

**AMENDED**

### ADR-071

**UNCHANGED**

### Final Party Role Vocabulary

**10 roles:**
- Global Party Roles (6): CUSTOMER, VENDOR, SUPPLIER, BROKER, CARRIER, AGENT
- Commercial Context Roles (4): BILL_TO, SHIP_TO, PAYER, ORDERING_PARTY

### Shipment Context Roles

| Role | Canonical Authority |
|------|---------------------|
| SHIPPER | shp_shipments.shipper_id |
| CONSIGNEE | shp_shipments.consignee_id |
| NOTIFY_PARTY | shp_shipments.notify_party_id |

### Duplicate Authority Test

**PASS**

### Human Ratification Required

1. Ratify ADR-070 (amended)
2. Ratify ADR-071
3. Confirm 10-role vocabulary
4. Confirm 4 context types
5. Confirm shipment roles separation
6. Confirm external system governance
7. Approve migration governance

### DATA-3

**READY FOR HUMAN AUTHORIZATION**

---

**ADR RATIFICATION STATUS: PENDING HUMAN APPROVAL**

**IMPLEMENTATION AUTHORIZATION: NOT GRANTED**

**PRODUCTION CHANGE AUTHORIZATION: NOT GRANTED**

---

**END OF AMENDMENT CLOSURE**

**DATA-2 ADR-070 AMENDMENT CLOSURE COMPLETE — PRODUCTION IMPLEMENTATION NOT AUTHORIZED.**

**HARD STOP MUST REMAIN ACTIVE.**