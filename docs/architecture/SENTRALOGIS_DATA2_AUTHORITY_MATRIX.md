# SENTRALOGIS — DATA-2
# AUTHORITY MATRIX

**Date:** 2026-09-02  
**Phase:** DATA-2  
**Nature:** ARCHITECTURE DESIGN ONLY  

---

## 1. CROSS-DOMAIN AUTHORITY MATRIX

### 1.1 Party Authority

| Object | Canonical Authority | Commercial | Forwarding | Customs | Trucking | WMS | Finance | Portal |
|--------|---------------------|------------|------------|---------|----------|-----|---------|--------|
| Party Identity | md_entities | READ | READ | READ | READ | READ | READ | READ |
| Party Hierarchy | md_entities.parent_id | READ | READ | READ | READ | READ | READ | READ |
| Party Roles | party_roles | READ/WRITE | READ | READ | READ | READ | READ | READ |
| Party Relationships | party_relationships | READ/WRITE | READ | READ | READ | READ | READ | READ |
| Contacts | party_contacts | READ/WRITE | READ | READ | READ | READ | READ | READ |
| Party Locations | party_locations | READ/WRITE | READ/WRITE | READ | READ/WRITE | READ/WRITE | READ | READ |
| External References | external_references | READ/WRITE | READ/WRITE | READ/WRITE | READ/WRITE | READ/WRITE | READ/WRITE | READ |

### 1.2 Location Authority

| Object | Canonical Authority | Commercial | Forwarding | Customs | Trucking | WMS | Finance | Portal |
|--------|---------------------|------------|------------|---------|----------|-----|---------|--------|
| Location Identity | md_locations | READ | READ | READ | READ | READ | READ | READ |
| Location Type | md_locations.location_type | READ | READ | READ | READ | READ | READ | READ |
| Location Hierarchy | md_locations.parent_id | READ | READ | READ | READ | READ | READ | READ |
| Location Geography | md_locations (existing) | READ | READ | READ | READ | READ | READ | READ |
| Party-Location | party_locations | READ/WRITE | READ/WRITE | READ | READ/WRITE | READ/WRITE | READ | READ |
| External References | external_references | READ/WRITE | READ/WRITE | READ/WRITE | READ/WRITE | READ/WRITE | READ/WRITE | READ |

---

## 2. AUTHORITY RULES

### 2.1 Read Access

All domains can READ all Party and Location data within their tenant scope.

### 2.2 Write Access

| Domain | Write Scope |
|--------|-------------|
| Commercial | Party roles, relationships, contacts, party locations |
| Forwarding | Party locations (for shipping origins/destinations) |
| Customs | External references (customs IDs) |
| Trucking | Party locations (for pickup/delivery) |
| WMS | Party locations (for warehouse receipts) |
| Finance | External references (ERP billing IDs) |
| Portal | Read-only for customer's own party data |

### 2.3 No Silent Authority Transfer

No domain may:
- Create duplicate party records
- Create duplicate location records
- Modify canonical party identity (only Commercial/Admin)
- Modify canonical location identity (only Admin)
- Create cross-tenant relationships

---

## 3. DOMAIN RESPONSIBILITIES

### 3.1 Commercial Domain

**Responsibilities:**
- Create/update party roles (CUSTOMER, BILL_TO, PAYER)
- Create/update party relationships
- Create/update contacts
- Create/update party locations

**Constraints:**
- Cannot modify party identity directly
- Cannot create duplicate parties

### 3.2 Forwarding Domain

**Responsibilities:**
- Reference parties as SHIPPER, CONSIGNEE, NOTIFY_PARTY
- Reference locations as POL, POD, ORIGIN, DESTINATION
- Create party locations for shipping origins/destinations

**Constraints:**
- Cannot create new parties (reference existing only)
- Cannot create new locations (reference existing only)
- Must use shp_shipments, not fw_order_headers

### 3.3 Customs Domain

**Responsibilities:**
- Reference parties as declarant, importer, exporter
- Reference locations as customs office, port of entry/exit
- Create external references for customs IDs

**Constraints:**
- Cannot create new parties (reference existing only)
- Must use cus_declarations

### 3.4 Trucking Domain

**Responsibilities:**
- Reference parties as transporter, vendor
- Reference locations as pickup/delivery points
- Create party locations for pickup/delivery

**Constraints:**
- Cannot create new parties (reference existing only)
- Must use svc_service_requests, not fw_order_headers

### 3.5 WMS Domain

**Responsibilities:**
- Reference parties as customer, owner
- Reference locations as warehouse, dock
- Create party locations for warehouse receipts

**Constraints:**
- Cannot create new parties (reference existing only)

### 3.6 Finance Domain

**Responsibilities:**
- Reference parties as BILL_TO, PAYER
- Create external references for ERP billing IDs

**Constraints:**
- Cannot create new parties (reference existing only)
- Must use canonical party roles for billing

### 3.7 Customer Portal

**Responsibilities:**
- View own party data
- View own party locations
- View own external references

**Constraints:**
- Read-only access to own data
- Cannot see other parties' data
- Cannot modify party data

### 3.8 Vendor Portal

**Responsibilities:**
- View own party data
- View own party locations
- View own external references

**Constraints:**
- Read-only access to own data
- Cannot see other parties' data
- Cannot modify party data

---

## 4. DUPLICATE AUTHORITY PREVENTION

### 4.1 Party Creation

**Only Commercial/Admin can create new parties.**

All other domains must:
1. Search existing parties via md_entities
2. If party not found, request creation via Commercial domain
3. Never create parties directly

### 4.2 Location Creation

**Only Admin can create new master locations.**

All other domains must:
1. Search existing locations via md_locations
2. If location not found, request creation via Admin
3. Never create locations directly

### 4.3 Party Role Assignment

**Only Commercial/Admin can assign global roles.**

Other domains can:
1. Reference parties in transaction context
2. Create transaction-specific roles (e.g., SHIPPER for a shipment)
3. Cannot assign global roles

---

## 5. ENFORCEMENT MECHANISMS

### 5.1 RLS Policies

- All tables have tenant_id
- All RLS policies use get_my_tenant_id()
- Cross-tenant access prevented

### 5.2 Application-Level Authorization

- U-02 assertPermission for domain-specific operations
- IdentityContext for tenant derivation
- Server-side validation for all mutations

### 5.3 Audit Trail

- All changes logged to audit_logs
- Party changes tracked
- Location changes tracked
- Role changes tracked

---

**END OF AUTHORITY MATRIX**
