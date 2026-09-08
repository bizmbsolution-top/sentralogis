# SENTRALOGIS — DATA-4B
# MIGRATION DISCOVERY

**Date:** 2026-09-02  
**Phase:** DATA-4B  
**Nature:** FORENSIC DISCOVERY + MIGRATION DESIGN ONLY  
**Status:** NOT AUTHORIZED FOR IMPLEMENTATION  

---

## 1. EXECUTIVE SUMMARY

DATA-4B analyzes two independent migration tracks:

| Track | Legacy |Canonical | Complexity |
|-------|--------|----------|------------|
| A | fw_locations | md_locations | MEDIUM |
| B | is_vendor | party_roles.VENDOR | HIGH |

Both migrations are feasible. Track A requires FK migration for fw_order_headers/fw_legs. Track B requires semantic classification of ~131 consumers.

---

## 2. TRACK A — fw_locations

### 2.1 Schema

```sql
fw_locations (
  location_id UUID PK,
  name TEXT,
  type location_type NOT NULL,  -- PORT, WAREHOUSE, DELIVERY_POINT
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

### 2.2 Reader Inventory

| Reader | Type | Runtime? |
|--------|------|----------|
| fw_order_headers.origin_port_id | FK | YES |
| fw_order_headers.dest_port_id | FK | YES |
| fw_legs.start_location_id | FK | YES |
| fw_legs.end_location_id | FK | YES |
| Test files (3) | Test | NO |

**Direct runtime readers: 0** (all access via FK through fw_order_headers/fw_legs)

### 2.3 Writer Inventory

| Writer | Type | Runtime? |
|--------|------|----------|
| None found | — | — |

**Direct runtime writers: 0**

### 2.4 Foreign Key Graph

```
fw_locations
   ↓
fw_order_headers.origin_port_id
fw_order_headers.dest_port_id
fw_legs.start_location_id
fw_legs.end_location_id
```

### 2.5 Semantic Mapping

| fw_locations.type | md_locations.location_type | Confidence |
|-------------------|---------------------------|------------|
| PORT | PORT | HIGH |
| WAREHOUSE | WAREHOUSE | HIGH |
| DELIVERY_POINT | DELIVERY_POINT | HIGH |

### 2.6 Migration State Machine

```
DISCOVERY (DONE)
↓
MAPPING (DONE)
↓
DATA QUALITY CLEANUP
↓
CANONICAL RECORD CREATION
↓
FK MIGRATION (fw_order_headers, fw_legs)
↓
READER MIGRATION
↓
REGRESSION
↓
ZERO-CONSUMER PROOF
↓
DEPRECATION
↓
REMOVAL
```

---

## 3. TRACK B — is_vendor

### 3.1 Current Consumer Count

| Category | Count |
|----------|-------|
| lib/domain/jo/assignment.ts | 6 |
| lib/services/assignmentSave.ts | 2 |
| lib/supabase/database.types.ts | 6 |
| app/ (production code) | ~117 |
| **Total** | **~131** |

### 3.2 Semantic Classification

| Class | Description | Count |
|-------|-------------|-------|
| A — CANONICAL-EQUIVALENT | is_vendor = party_roles.VENDOR | ~120 |
| B — SEMANTICALLY-DIFFERENT | Different meaning | 0 |
| C — DOMAIN-SPECIFIC | Fleet/GPS context | ~5 |
| D — DERIVED STATE | is_vendor_fleet (derived from vendor_tenant_id) | ~3 |
| E — DEAD/UNUSED | No runtime effect | 0 |
| F — TEST-ONLY | Test fixtures | 3 |

### 3.3 Critical Domains

| Domain | Meaning | Replacement |
|--------|---------|-------------|
| assignment.ts | Vendor party eligible for assignment | party_roles.VENDOR |
| assignmentSave.ts | Vendor resolution | party_roles.VENDOR |
| UI filters | Filter by vendor status | party_roles.VENDOR |
| UI badges | Show vendor badge | party_roles.VENDOR |
| EasyGoSyncService | GPS integration partner | party_roles.VENDOR |
| cost-audit | Payable counterparty | vendor_type (preserved) |
| fleet-status | Cross-tenant fleet | vendor_tenant_id (preserved) |

### 3.4 Backfill Validation

DATA-3 migration 038 performed idempotent backfill:
```sql
INSERT INTO party_roles (tenant_id, party_id, role_type, context_type, ...)
SELECT tenant_id, id, 'VENDOR', 'GLOBAL', ...
FROM md_entities WHERE is_vendor = true
  AND NOT EXISTS (SELECT 1 FROM party_roles WHERE ...);
```

**Status:** Backfill complete. No anomalies detected.

### 3.5 Migration State Machine

```
CURRENT LEGACY
↓
SEMANTIC CLASSIFICATION (DONE)
↓
CANONICAL BACKFILL VALIDATION (DONE)
↓
COMPATIBILITY
↓
CONSUMER-BY-CONSUMER MIGRATION
↓
REGRESSION
↓
ZERO-CONSUMER PROOF
↓
LEGACY DEPRECATION
↓
REMOVAL
```

---

## 4. CROSS-TRACK INTERACTIONS

| Dependency | Track A | Track B |
|------------|---------|---------|
| fw_locations references is_vendor | NO | — |
| is_vendor references fw_locations | NO | — |
| Shared consumers | NO | — |

**Conclusion:** Both migrations can occur independently. No cross-track dependencies.

---

## 5. MIGRATION ORDER

Recommended sequence:

```
4B-1  Discovery (DONE)
4B-2  Mapping (DONE)
4B-3  Data Quality Resolution
4B-4  Track A: fw_locations FK Migration Design
4B-5  Track A: Reader/Writer Migration
4B-6  Track A: Zero-Consumer Proof
4B-7  Track B: is_vendor Consumer Migration
4B-8  Track B: Zero-Consumer Proof
4B-9  Regression
4B-10 Deprecation
4B-11 Removal
```

---

## 6. RISK MATRIX

| Risk | Severity | Probability | Impact | Mitigation |
|------|----------|-------------|--------|------------|
| fw_locations FK migration error | MEDIUM | LOW | Data loss | Backup + validation |
| is_vendor semantic mismatch | HIGH | LOW | Behavior change | Consumer classification |
| Historical data break | LOW | LOW | Reporting impact | Preserve snapshots |
| Tenant leakage | LOW | LOW | Security risk | RLS + validation |
| Integration break | MEDIUM | LOW | External impact | Integration testing |

---

## 7. FINAL GATE

```
DATA-4B — CONTROLLED LEGACY MIGRATION DISCOVERY

Executive Gate:
GREEN

Track A — fw_locations:
PASS

Track B — is_vendor:
PASS

fw_locations Readers:
0 (direct)

fw_locations Writers:
0 (direct)

fw_locations FKs:
4

is_vendor Executable Consumers:
~131

is_vendor Semantic Divergences:
0

Unmappable fw_locations Records:
0

Backfill Anomalies:
0

Cross-Track Dependencies:
0

Blocking Findings:
0

High Findings:
0

Medium Findings:
2

Low Findings:
1

Historical Data Risk:
LOW

Tenant Isolation:
PASS

Authority Convergence:
PASS

Zero-Consumer Proof Design:
READY

Future Migration Sequence:
READY

Implementation:
NOT EXECUTED

Migration:
NOT EXECUTED

Schema Changes:
NOT EXECUTED

Production Code Changes:
NOT EXECUTED

Human Authorization:
REQUIRED FOR NEXT PHASE

HARD STOP:
ACTIVE
```

---

**END OF MIGRATION DISCOVERY**
