# SENTRALOGIS — DATA-2
# LEGACY RECONCILIATION

**Date:** 2026-09-02  
**Phase:** DATA-2  
**Nature:** ARCHITECTURE DESIGN ONLY  

---

## 1. LEGACY STRUCTURE CLASSIFICATION

### 1.1 Party-Related Structures

| Structure | Classification | Reason |
|-----------|----------------|--------|
| md_entities | CANONICAL | Sound foundation for all party types |
| md_entities.parent_id | CANONICAL | Supports hierarchy |
| md_entity_addresses | ADAPTER | Physical addresses, keep for compatibility |
| md_transporters | ADAPTER | Transporter-specific attributes, keep |
| md_transporter_fleets | ADAPTER | Transporter-fleet linkage, keep |
| md_transporter_drivers | ADAPTER | Transporter-driver linkage, keep |
| is_customer, is_supplier, is_vendor, is_broker | DEPRECATE | Boolean flags replaced by party_roles |
| crm_leads | ADAPTER | CRM-specific, keep separate |
| crm_deals | ADAPTER | CRM-specific, keep separate |
| crm_quotations | ADAPTER | CRM-specific, keep separate |
| crm_activities | ADAPTER | CRM-specific, keep separate |
| crm_guest_links | ADAPTER | CRM-specific, keep separate |
| crm_sbu_customer_rates | ADAPTER | CRM-specific, keep separate |
| crm_quotation_items | ADAPTER | CRM-specific, keep separate |
| crm_quotation_sections | ADAPTER | CRM-specific, keep separate |
| crm_status (on md_entities) | DEPRECATE | CRM field on canonical party, move to CRM |
| sales_rep_id (on md_entities) | DEPRECATE | CRM field on canonical party, move to CRM |

### 1.2 Location-Related Structures

| Structure | Classification | Reason |
|-----------|----------------|--------|
| md_locations | CANONICAL | Sound foundation for all locations |
| fw_locations | DUPLICATE AUTHORITY | Duplicate of md_locations, deprecate |
| md_entity_addresses | ADAPTER | Physical addresses, keep for compatibility |
| md_warehouses | ADAPTER | Warehouse-specific, keep separate |
| md_warehouse_locations | ADAPTER | Warehouse-internal, keep separate |

### 1.3 Shipment-Related Structures (Reference Only)

| Structure | Classification | Reason |
|-----------|----------------|--------|
| shp_shipments | CANONICAL | Modern multimodal shipment model |
| fw_order_headers | DUPLICATE AUTHORITY | Duplicate of shp_shipments, deprecate |
| fw_legs | DUPLICATE AUTHORITY | Duplicate of shp_execution_legs, deprecate |
| fw_consolidations | DUPLICATE AUTHORITY | Duplicate of shp_shipments, deprecate |
| fw_container_assignments | DUPLICATE AUTHORITY | Duplicate of shp_units, deprecate |
| fw_container_items | DUPLICATE AUTHORITY | Duplicate of shp_manifest_items, deprecate |
| fw_box_assignments | DUPLICATE AUTHORITY | Duplicate of shp_units, deprecate |
| fw_box_items | DUPLICATE AUTHORITY | Duplicate of shp_manifest_items, deprecate |
| fw_price_master | ADAPTER | Forwarding-specific pricing, keep temporarily |

---

## 2. DETAILED RECONCILIATION

### 2.1 md_entities (CANONICAL)

**Source:** lib/supabase/database.types.ts:6352-6503

**Current Attributes:**
- id, entity_code, name, legal_name, tax_id
- email, phone, mobile, whatsapp
- is_customer, is_supplier, is_vendor, is_broker (boolean flags)
- vendor_type
- billing_address, billing_city, billing_province, billing_postal_code
- billing_latitude, billing_longitude
- tenant_id, is_active, notes, created_by
- billing_directions, billing_method
- parent_id (hierarchy)
- is_own, payment_terms_days, payment_terms_type
- logo_url
- crm_status (CRM pollution)
- sales_rep_id (CRM pollution)
- vendor_tenant_id (cross-tenant reference)

**Reconciliation Actions:**
1. Keep all existing columns
2. Add party_roles table for formal role model
3. Add party_relationships table for relationship model
4. Add party_contacts table for contact model
5. Add party_locations table for party-location linkage
6. Deprecate is_customer, is_supplier, is_vendor, is_broker (migrate to party_roles)
7. Deprecate crm_status, sales_rep_id (move to CRM domain)

---

### 2.2 fw_locations (DUPLICATE AUTHORITY)

**Source:** Migration 174_fw_locations.sql

**Current Schema:**
```text
fw_locations
├── location_id (UUID PK)
├── name (TEXT)
├── type (location_type enum)
├── created_at, updated_at
```

**Problem:** Duplicates md_locations with separate type enum.

**Reconciliation Actions:**
1. Migrate all fw_locations data to md_locations
2. Map location_type to md_locations.location_type
3. Update all fw_order_headers.origin_port_id/dest_port_id to reference md_locations
4. Update all fw_legs.start_location_id/end_location_id to reference md_locations
5. Drop fw_locations table

---

### 2.3 md_entity_addresses (ADAPTER)

**Source:** Migration 062_comprehensive_master_columns.sql

**Current Schema:**
```text
md_entity_addresses
├── id (UUID PK)
├── entity_id (UUID FK → md_entities)
├── address_name, address_type, address
├── city, province, postal_code
├── latitude, longitude
├── contact_person, contact_phone
├── is_active, created_at, address_directions
```

**Purpose:** Physical addresses for parties. Not the same as locations (a party can have multiple addresses).

**Reconciliation Actions:**
1. Keep md_entity_addresses for physical addresses
2. party_locations links parties to canonical locations
3. md_entity_addresses can coexist with party_locations
4. Over time, migrate addresses to locations where appropriate

---

### 2.4 md_transporters (ADAPTER)

**Source:** Migration 062_comprehensive_master_columns.sql

**Current Schema:**
```text
md_transporters
├── id (UUID PK)
├── tenant_id (UUID)
├── transporter_code, transporter_name
├── transporter_type (OWN_FLEET, etc.)
├── contact_person, phone, email, address
├── tax_id, contract_number, contract dates
├── payment_terms, is_active, notes
├── created_by, created_at, updated_at
├── UNIQUE (tenant_id, transporter_code)
```

**Purpose:** Transporter-specific attributes beyond party identity.

**Reconciliation Actions:**
1. Keep md_transporters for transporter-specific attributes
2. party_roles links md_entities to CARRIER/VENDOR roles
3. md_transporters remains for contract/payment details

---

### 2.5 CRM Tables (ADAPTER)

**Tables:**
- crm_leads
- crm_deals
- crm_quotations
- crm_quotation_items
- crm_quotation_sections
- crm_activities
- crm_guest_links
- crm_sbu_customer_rates

**Purpose:** CRM-specific functionality. Not party master data.

**Reconciliation Actions:**
1. Keep CRM tables separate
2. entity_id in CRM tables references md_entities
3. CRM fields on md_entities (crm_status, sales_rep_id) should be removed over time
4. CRM deals can create parties via trigger (existing)

---

## 3. DEPRECATION ROADMAP

### 3.1 Phase 1: Add New Tables

1. Create party_roles
2. Create party_relationships
3. Create party_contacts
4. Create party_locations
5. Create external_references
6. Add location_type, parent_id, timezone, external_code to md_locations

### 3.2 Phase 2: Migrate Data

1. Migrate is_customer/is_supplier/is_vendor/is_broker to party_roles
2. Migrate fw_locations to md_locations
3. Migrate denormalized cargo_owner/consignee to party_roles

### 3.3 Phase 3: Update References

1. Update fw_order_headers to reference shp_shipments
2. Update fw_legs to reference shp_execution_legs
3. Update all code to use party_roles instead of boolean flags

### 3.4 Phase 4: Drop Deprecated

1. Drop is_customer, is_supplier, is_vendor, is_broker from md_entities
2. Drop crm_status, sales_rep_id from md_entities
3. Drop fw_locations
4. Drop fw_order_headers (after full migration)
5. Drop fw_legs (after full migration)

---

## 4. RISK ASSESSMENT

| Risk | Severity | Mitigation |
|------|----------|------------|
| Data loss during fw_locations migration | HIGH | Backup before migration, validation scripts |
| Code breakage from boolean flag removal | MEDIUM | Dual-write period, gradual migration |
| Cross-tenant data leakage | LOW | RLS policies on all new tables |
| Performance impact from party_roles joins | LOW | Proper indexing |

---

**END OF LEGACY RECONCILIATION**
