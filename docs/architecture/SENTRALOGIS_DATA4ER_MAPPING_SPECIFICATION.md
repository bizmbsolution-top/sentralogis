# SENTRALOGIS — DATA-4E-R
# MAPPING SPECIFICATION

**Date:** 2026-09-02  
**Phase:** DATA-4E-R  

---

## Location Type Mapping

| Legacy Value | Canonical Value | Count | Deterministic? |
|--------------|-----------------|-------|----------------|
| PORT | PORT | Unknown (runtime) | YES |
| WAREHOUSE | WAREHOUSE | Unknown (runtime) | YES |
| DELIVERY_POINT | DELIVERY_POINT | Unknown (runtime) | YES |

## Tenant Mapping

**STATUS: BLOCKED**

fw_locations has no tenant_id column. Cannot create tenant-scoped md_locations without:
1. Amending DATA-4A to allow fw_order_headers access (which has tenant_id)
2. OR adding tenant_id to fw_locations as a prerequisite
3. OR identifying another canonical tenant source

## Collision Analysis

**Cannot be performed** until tenant mapping is resolved.

---

**END OF MAPPING SPECIFICATION**
