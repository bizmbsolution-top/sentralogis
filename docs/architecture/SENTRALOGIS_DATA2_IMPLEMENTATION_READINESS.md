# SENTRALOGIS — DATA-2
# IMPLEMENTATION READINESS

**Date:** 2026-09-02  
**Phase:** DATA-2  
**Nature:** ARCHITECTURE DESIGN ONLY  
**Status:** IMPLEMENTATION NOT AUTHORIZED  

---

## 1. IMPLEMENTATION SCOPE

### 1.1 New Tables

| Table | Purpose | Dependencies |
|-------|---------|--------------|
| party_roles | Canonical party role model | md_entities, tenants |
| party_relationships | Party-to-party relationships | md_entities, tenants |
| party_contacts | Party communication contacts | md_entities, tenants |
| party_locations | Party-to-location relationships | md_entities, md_locations, tenants |
| external_references | External system ID mappings | tenants |

### 1.2 Table Extensions

| Table | Extension | Dependencies |
|-------|-----------|--------------|
| md_locations | Add location_type, parent_id, timezone, external_code | None |
| shp_shipments | Add pol_location_id, pod_location_id | md_locations |

### 1.3 Deprecated Structures

| Structure | Replacement | Migration Effort |
|-----------|-------------|------------------|
| is_customer (md_entities) | party_roles | Low |
| is_supplier (md_entities) | party_roles | Low |
| is_vendor (md_entities) | party_roles | Low |
| is_broker (md_entities) | party_roles | Low |
| fw_locations | md_locations | Medium |
| crm_status (md_entities) | CRM domain | Low |
| sales_rep_id (md_entities) | CRM domain | Low |

---

## 2. MIGRATIONS POTENTIALLY REQUIRED

### 2.1 Phase 1: Add New Tables (Low Risk)

```sql
-- party_roles
CREATE TABLE party_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  party_id UUID NOT NULL REFERENCES md_entities(id),
  role_type TEXT NOT NULL,
  context_type TEXT NOT NULL DEFAULT 'GLOBAL',
  context_id UUID,
  is_primary BOOLEAN DEFAULT false,
  effective_from DATE,
  effective_to DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, party_id, role_type, context_type, context_id)
);

-- party_relationships
CREATE TABLE party_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  from_party_id UUID NOT NULL REFERENCES md_entities(id),
  to_party_id UUID NOT NULL REFERENCES md_entities(id),
  relationship_type TEXT NOT NULL,
  effective_from DATE,
  effective_to DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, from_party_id, to_party_id, relationship_type)
);

-- party_contacts
CREATE TABLE party_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  party_id UUID NOT NULL REFERENCES md_entities(id),
  contact_name TEXT NOT NULL,
  contact_role TEXT,
  department TEXT,
  title TEXT,
  email TEXT,
  phone TEXT,
  mobile TEXT,
  whatsapp TEXT,
  is_primary BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- party_locations
CREATE TABLE party_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  party_id UUID NOT NULL REFERENCES md_entities(id),
  location_id UUID NOT NULL REFERENCES md_locations(id),
  relationship_type TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  effective_from DATE,
  effective_to DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, party_id, location_id, relationship_type)
);

-- external_references
CREATE TABLE external_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  external_system TEXT NOT NULL,
  external_id TEXT NOT NULL,
  external_context JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, entity_type, entity_id, external_system)
);
```

### 2.2 Phase 2: Extend Existing Tables (Low Risk)

```sql
-- md_locations extensions
ALTER TABLE md_locations
  ADD COLUMN IF NOT EXISTS location_type TEXT,
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES md_locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS timezone TEXT,
  ADD COLUMN IF NOT EXISTS external_code TEXT;

-- shp_shipments extensions
ALTER TABLE shp_shipments
  ADD COLUMN IF NOT EXISTS pol_location_id UUID REFERENCES md_locations(id),
  ADD COLUMN IF NOT EXISTS pod_location_id UUID REFERENCES md_locations(id);
```

### 2.3 Phase 3: Migrate Data (Medium Risk)

```sql
-- Migrate is_customer to party_roles
INSERT INTO party_roles (tenant_id, party_id, role_type, context_type)
SELECT tenant_id, id, 'CUSTOMER', 'GLOBAL'
FROM md_entities WHERE is_customer = true;

-- Repeat for is_supplier, is_vendor, is_broker

-- Migrate fw_locations to md_locations
INSERT INTO md_locations (tenant_id, location_code, name, location_type)
SELECT '00000000-0000-0000-0000-000000000000', 
       'FW-' || location_id::TEXT, name,
       CASE type WHEN 'PORT' THEN 'PORT' ELSE 'OTHER' END
FROM fw_locations;
```

### 2.4 Phase 4: Add RLS Policies (Low Risk)

All new tables require RLS policies:
```sql
CREATE POLICY "table_tenant_isolation" ON table_name
FOR ALL TO authenticated
USING (tenant_id = get_my_tenant_id())
WITH CHECK (tenant_id = get_my_tenant_id());
```

---

## 3. API IMPLICATIONS

### 3.1 New API Routes

| Route | Purpose |
|-------|---------|
| /api/v1/parties/[id]/roles | CRUD party roles |
| /api/v1/parties/[id]/relationships | CRUD party relationships |
| /api/v1/parties/[id]/contacts | CRUD party contacts |
| /api/v1/parties/[id]/locations | CRUD party locations |
| /api/v1/parties/[id]/external-refs | CRUD external references |
| /api/v1/locations/[id]/hierarchy | Get location hierarchy |
| /api/v1/locations/[id]/parties | Get parties at location |

### 3.2 Modified API Routes

| Route | Modification |
|-------|--------------|
| /api/v1/parties | Return party with roles, contacts, locations |
| /api/v1/locations | Return location with hierarchy |
| /api/v1/shipments | Include POL/POD location details |

---

## 4. UI IMPLICATIONS

### 4.1 New UI Components

| Component | Purpose |
|-----------|---------|
| PartyRoleManager | Assign/manage party roles |
| PartyContactManager | Manage party contacts |
| PartyLocationManager | Manage party-location relationships |
| LocationHierarchyTree | Display location hierarchy |
| ExternalReferenceManager | Manage external references |

### 4.2 Modified UI Screens

| Screen | Modification |
|--------|--------------|
| Party Detail | Add roles, contacts, locations tabs |
| Location Detail | Add hierarchy, parties tabs |
| Shipment Detail | Add POL/POD location selectors |

---

## 5. SECURITY IMPLICATIONS

### 5.1 RLS Requirements

All new tables MUST have RLS policies using get_my_tenant_id().

### 5.2 Authorization Requirements

| Operation | Permission |
|-----------|------------|
| Create party role | commercial:manage |
| Update party role | commercial:manage |
| Delete party role | commercial:manage |
| Create party contact | commercial:manage |
| Update party contact | commercial:manage |
| Create party location | commercial:manage |
| Create location | admin:manage |
| Update location | admin:manage |
| Create external reference | commercial:manage |

### 5.3 Cross-Tenant Prevention

- All tables have tenant_id
- All RLS policies use get_my_tenant_id()
- No cross-tenant queries allowed
- Browser cannot establish tenant identity

---

## 6. MIGRATION RISKS

| Risk | Severity | Mitigation |
|------|----------|------------|
| Data loss during fw_locations migration | HIGH | Backup before migration, validation scripts |
| Code breakage from boolean flag removal | MEDIUM | Dual-write period, gradual migration |
| Performance impact from party_roles joins | LOW | Proper indexing on (tenant_id, party_id, role_type) |
| Inconsistent role assignments | MEDIUM | Validation scripts, admin review |
| Location hierarchy cycles | LOW | Application-level cycle prevention |

---

## 7. SEQUENCING

### 7.1 Recommended Implementation Order

1. **Phase 1: Foundation** — Create new tables, add RLS, add indexes
2. **Phase 2: Migration** — Migrate boolean flags to party_roles, migrate fw_locations
3. **Phase 3: API** — Create API routes for new tables
4. **Phase 4: UI** — Create UI components for new tables
5. **Phase 5: Cleanup** — Deprecate boolean flags, drop fw_locations

### 7.2 Dependencies

| Phase | Depends On |
|-------|------------|
| Phase 1 | None |
| Phase 2 | Phase 1 |
| Phase 3 | Phase 1 |
| Phase 4 | Phase 3 |
| Phase 5 | Phase 2, 3, 4 |

---

## 8. ESTIMATED EFFORT

| Component | Effort |
|-----------|--------|
| Database migrations | 2-3 hours |
| Domain services | 4-6 hours |
| API routes | 3-4 hours |
| UI components | 6-8 hours |
| Testing | 4-6 hours |
| **Total** | **19-27 hours** |

---

## 9. FINAL GATE

```
==================================================
DATA-2 FINAL GATE
==================================================

Party Identity: PASS
Party Hierarchy: PASS
Party Roles: GAP (new table designed)
Party Relationships: GAP (new table designed)
Contacts: GAP (new table designed)

Location Identity: PASS
Location Types: GAP (new column designed)
Location Hierarchy: GAP (new column designed)
Party-Location: GAP (new table designed)
Network Locations: PARTIAL
POL/POD: GAP (new columns designed)
Geography: PASS

External References: GAP (new table designed)

Cross-SBU Authority: PASS
ERP Compatibility: PARTIAL
Customer Boundary: PASS
Vendor Boundary: PASS

Tenant Isolation: PASS
Authorization: PASS

Duplicate Authority: FOUND (fw_locations, boolean flags)

New ADR Required: YES
  - ADR-0XX: Party Role Architecture
  - ADR-0XX: External Reference Architecture

Database Changes: ZERO
Production Business Logic Changes: ZERO
Production UI Changes: ZERO

TypeScript: PASS / NOT RUN
Full Regression: PASS / NOT RUN

Implementation Readiness:
CONDITIONAL

IMPLEMENTATION AUTHORIZATION:
NO

HARD STOP:
ACTIVE
==================================================
```

---

## 10. CONDITIONS FOR IMPLEMENTATION

Implementation is CONDITIONAL on:

1. **ADR Ratification** — Party Role Architecture and External Reference Architecture ADRs must be ratified
2. **Migration Strategy** — Detailed migration plan for fw_locations and boolean flags
3. **Stakeholder Review** — Business stakeholders must approve role model
4. **Security Review** — RLS policies must be reviewed by security team

---

**END OF IMPLEMENTATION READINESS**

**DATA-2 DISCOVERY/DESIGN COMPLETE — PRODUCTION IMPLEMENTATION NOT AUTHORIZED.**
