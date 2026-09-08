# SENTRALOGIS — DATA-4E-R3
# CORRECTED MIGRATION DESIGN

**Date:** 2026-09-02  
**Phase:** DATA-4E-R3  
**Nature:** DESIGN + ARTIFACT CREATION ONLY  

---

## 1. Design Principles

| Principle | Implementation |
|-----------|----------------|
| Direct tenant authority | Uses fw_locations.tenant_id directly |
| No LIMIT 1 | No nondeterministic selection |
| No md_fleets | No indirect tenant inference |
| Direct FK convergence | Replaces old FK constraints, no parallel columns |
| Idempotent | ON CONFLICT DO NOTHING |
| Fail-safe | Pre-flight assertions raise exceptions |
| No DROP | fw_locations preserved for separate retirement gate |

---

## 2. Migration Steps

| Step | Description |
|------|-------------|
| 1 | Create md_locations from fw_locations |
| 2 | Pre-flight assertions (tenant, type, mapping) |
| 3 | Converge fw_order_headers.origin_port_id |
| 4 | Converge fw_order_headers.dest_port_id |
| 5 | Converge fw_legs.start_location_id |
| 6 | Converge fw_legs.end_location_id |
| 7 | Verification assertions |

---

## 3. Tenant Mapping

| Source | Target | Mechanism |
|--------|--------|-----------|
| fw_locations.tenant_id | md_locations.tenant_id | Direct column copy |
| fw_locations.location_id | md_locations.external_code | Cast to TEXT |

---

## 4. Location Type Mapping

| fw_locations.type | md_locations.location_type |
|-------------------|---------------------------|
| PORT | PORT |
| WAREHOUSE | WAREHOUSE |
| DELIVERY_POINT | DELIVERY_POINT |

---

**END OF CORRECTED MIGRATION DESIGN**
