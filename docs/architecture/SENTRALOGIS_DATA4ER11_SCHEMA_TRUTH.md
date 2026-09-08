# SENTRALOGIS — DATA-4E-R11
# SCHEMA TRUTH

**Date:** 2026-09-02  
**Phase:** DATA-4E-R11  

---

## fw_locations

```sql
CREATE TABLE fw_locations (
  location_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,  -- added by migration 024
  name TEXT NOT NULL,
  type location_type NOT NULL,  -- ENUM: PORT, WAREHOUSE, DELIVERY_POINT
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## md_locations

```sql
CREATE TABLE md_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  location_code TEXT NOT NULL,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  location_type TEXT,  -- added by migration 036
  external_code TEXT,  -- added by migration 036
  parent_id UUID REFERENCES md_locations(id),  -- added by migration 036
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**NO unique constraint on (tenant_id, external_code).**

---

**END OF SCHEMA TRUTH**
