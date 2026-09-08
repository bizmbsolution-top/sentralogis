# SENTRALOGIS — DATA-4E-R2
# FK RECONCILIATION

**Date:** 2026-09-02  
**Phase:** DATA-4E-R2  
**Nature:** FORENSIC DISCOVERY ONLY  

---

## 1. Actual Four FK Authorities

| # | Source Table | Source Column | Target | Business Meaning | Tenant Derivation | Runtime Use |
|---|--------------|---------------|--------|------------------|-------------------|-------------|
| 1 | fw_order_headers | origin_port_id | fw_locations.location_id | Origin port | fw_order_headers.tenant_id | **NO** — table not actively used |
| 2 | fw_order_headers | dest_port_id | fw_locations.location_id | Destination port | fw_order_headers.tenant_id | **NO** — table not actively used |
| 3 | fw_legs | start_location_id | fw_locations.location_id | Leg start | fw_legs.tenant_id | **NO** — table not actively used |
| 4 | fw_legs | end_location_id | fw_locations.location_id | Leg end | fw_legs.tenant_id | **NO** — table not actively used |

---

## 2. Tenant Derivation

| Source Table | Tenant Column | Deterministic? |
|--------------|---------------|----------------|
| fw_order_headers | tenant_id (direct) | YES |
| fw_legs | tenant_id (direct) | YES |

---

## 3. Cross-Tenant Risk

| Risk | Status |
|------|--------|
| Cross-tenant mapping | IMPOSSIBLE — direct tenant_id |
| Ambiguous tenant | IMPOSSIBLE — single column |
| Unmappable location | IMPOSSIBLE — all have tenant_id |

---

## 4. Schema Drift Check

| Expected | Actual |
|----------|--------|
| 4 FKs to fw_locations | **4 FKs confirmed** |
| fw_order_headers has tenant_id | **YES** (migration 024) |
| fw_legs has tenant_id | **YES** (migration 024) |
| fw_locations has tenant_id | **YES** (migration 024) |

---

**END OF FK RECONCILIATION**
