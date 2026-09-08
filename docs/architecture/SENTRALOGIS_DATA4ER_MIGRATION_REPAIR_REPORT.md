# SENTRALOGIS — DATA-4E-R
# MIGRATION REPAIR REPORT

**Date:** 2026-09-02  
**Phase:** DATA-4E-R  

---

## 1. Previous Artifact Status

| File | Status |
|------|--------|
| 20260902_039_fw_locations_to_md_locations.sql | **INVALID — DO NOT EXECUTE** |

## 2. Defects Found

| # | Defect | Severity |
|---|--------|----------|
| 1 | Modifies fw_order_headers (DEFERRED) | **BLOCKING** |
| 2 | Creates parallel FK columns instead of converging | MEDIUM |
| 3 | Tenant mapping via md_fles + LIMIT 1 (nondeterministic) | **BLOCKING** |
| 4 | fw_locations has no tenant_id column | **BLOCKING** |
| 5 | external_code mapping not tenant-scoped | HIGH |
| 6 | No safe failure on unknown types | MEDIUM |
| 7 | Zero-consumer proof not established | HIGH |

## 3. Corrective Actions

| Action | Status |
|--------|--------|
| Mark previous artifact as INVALID | DONE |
| Document blocking contradictions | DONE |
| Identify required human decisions | DONE |
| Create repaired artifact | NOT POSSIBLE — blocked by fw_order_headers |

## 4. Required Human Decisions

| Decision | Impact |
|----------|--------|
| Amend DATA-4A to allow fw_order_headers FK migration? | Required for Track A |
| Add tenant_id to fw_locations as prerequisite? | Required for tenant mapping |
| Defer fw_locations until fw_order_headers addressed? | Alternative path |

---

**END OF MIGRATION REPAIR REPORT**
