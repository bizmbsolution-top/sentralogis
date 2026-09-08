# DATA-4E LIVE ↔ REPOSITORY RECONCILIATION REPORT

**Date:** 2026-09-02  
**Phase:** DATA-4E-R11  

---

## 1. Verdict

### **RED — DATA-4E Track A INVALID AGAINST CURRENT LIVE DB**

---

## 2. ADR-075 Interpretation

ADR-075 assumes:
- Source: `fw_locations` (legacy location authority)
- Target: `md_locations` (canonical location authority)
- Consumers: `fw_order_headers`, `fw_legs` (via FK)

**Reality:** None of these tables exist in the live database.

---

## 3. Historical Schema Lineage

### Repository Migrations

| Table | Created By | Status in Repo |
|-------|------------|----------------|
| fw_locations | migration 174 | EXISTS in repo |
| fw_order_headers | migration 024 | EXISTS in repo |
| fw_legs | migration 024 | EXISTS in repo |
| md_locations | migration 030 | EXISTS in repo |
| shp_execution_legs | migration 003 | EXISTS in repo |

### Live Database

| Table | Present in Live DB |
|-------|-------------------|
| fw_locations | **NO** |
| fw_order_headers | **NO** |
| fw_legs | **NO** |
| locations | YES (legacy) |
| md_locations | YES (canonical) |
| shp_execution_legs | YES (canonical) |

---

## 4. Current Live Schema

### `locations` (Legacy)

| Column | Type |
|--------|------|
| id | UUID PK |
| name | TEXT |
| address | TEXT |
| city | TEXT |
| organization_id | UUID |

**Note:** This table exists in live DB but NOT in repository migrations. Likely a pre-existing legacy table.

### `md_locations` (Canonical)

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| tenant_id | UUID | FK → tenants |
| location_code | TEXT | **GLOBAL UNIQUE** |
| name | TEXT | NOT NULL |
| address | TEXT | NOT NULL |
| location_type | TEXT | |
| external_code | **DOES NOT EXIST** | |
| parent_id | UUID | |

**Critical:** `md_locations.external_code` does NOT exist in live DB. Migration 036 added it in repo but it was never deployed.

### `shp_execution_legs` (Canonical Execution)

| Column | FK Target |
|--------|-----------|
| origin_location_id | md_locations.id |
| destination_location_id | md_locations.id |

**This is the current execution model**, replacing `fw_legs`.

---

## 5. Mapping Evidence

| Repository Assumption | Live Reality |
|-----------------------|--------------|
| fw_locations exists | **DOES NOT EXIST** |
| fw_order_headers exists | **DOES NOT EXIST** |
| fw_legs exists | **DOES NOT EXIST** |
| md_locations.external_code exists | **DOES NOT EXIST** |
| md_locations.location_code is unique per tenant | **GLOBAL UNIQUE** |

---

## 6. Migration 049 Applicability

### `20260902_049_fw_locations_to_canonical.sql = NOT EXECUTED`

**Reason:** The source table `fw_locations` does not exist in the live database. Migration 049 is INVALID against the current live schema.

---

## 7. Required Next Decision

### DATA-4E Track A is INVALID

The historical forwarding location model (`fw_locations`, `fw_order_headers`, `fw_legs`) has been replaced by the canonical shipment model (`shp_execution_legs`, `shp_leg_units`).

### Options

1. **Cancel DATA-4E Track A** — The migration target no longer exists
2. **Reinterpret DATA-4E** — Apply to a different source/consumer if equivalents exist
3. **Archive ADR-075** — Mark as superseded by canonical shipment architecture

---

## 8. Files Inspected

| File | Purpose |
|------|---------|
| supabase/migrations/174_fw_locations.sql | fw_locations creation |
| supabase/migrations/024_phase5a2_forwarding_schema_repair.sql | fw_order_headers/fw_legs creation |
| supabase/migrations/003_canonical_shipments_and_units.sql | shp_execution_legs creation |
| supabase/migrations/036_location_foundation.sql | md_locations extensions |
| lib/supabase/database.types.ts | Current schema types |

---

**END OF RECONCILIATION REPORT**
