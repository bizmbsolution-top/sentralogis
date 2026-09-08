# SENTRALOGIS — DATA-4
# DECISION LOG

**Date:** 2026-09-02  
**Phase:** DATA-4  
**Nature:** FORENSIC DISCOVERY  

---

## 1. DECISIONS CONFIRMED

### 1.1 No Enterprise Resource Abstraction

**Decision:** Do NOT create a generic Resource master table.

**Evidence:** Domain-specific resources (md_fleets, md_drivers) are already well-governed. A generic abstraction would create duplication without clear benefit.

### 1.2 Location Hierarchy Sufficient for Network

**Decision:** Transport network participation is adequately represented by location hierarchy + type.

**Evidence:** Port → Terminal → Berth hierarchy covers all network node concepts. No separate network node authority needed.

### 1.3 Carrier = Party + Role

**Decision:** Carrier is correctly represented by md_entities + party_roles.CARRIER.

**Evidence:** No separate carrier master needed. Mode capability can be derived from execution history.

### 1.4 Driver = Operational Resource (Not Party)

**Decision:** Driver remains domain-specific (trucking). Not a Party, not an Application User.

**Evidence:** md_drivers.entity_id links to md_entities but driver identity is separate from party identity.

### 1.5 Container = Shipment Unit (Not Master Resource)

**Decision:** Container is shipment-specific. No master container resource needed.

**Evidence:** shp_unit_containers is canonical for shipment containers. Legacy fw_container_assignments should be deprecated.

---

## 2. REJECTED ALTERNATIVES

| Alternative | Rejected Because |
|-------------|------------------|
| Generic Resource master | Duplicates existing domain-specific resources |
| Resource Registry + specialized tables | Over-engineering for current needs |
| Network node authority | Location hierarchy already covers this |
| Separate carrier master | party_roles.CARRIER is sufficient |
| Master container table | Containers are shipment-specific |

---

## 3. FINDINGS SUMMARY

| Severity | Count |
|----------|-------|
| BLOCKING | 0 |
| HIGH | 0 |
| MEDIUM | 2 |
| LOW | 2 |

---

## 4. VERDICT

**GREEN — DATA-4 DISCOVERY COMPLETE**

---

**END OF DECISION LOG**
