# SENTRALOGIS — DATA-4A
# DECISION LOG

**Date:** 2026-09-02  
**Phase:** DATA-4A  
**Nature:** FORENSIC ADR RATIFICATION  

---

## 1. DECISIONS CONFIRMED

### 1.1 No Enterprise Resource Abstraction (ADR-072)

**Evidence:** Domain-specific resources (md_fleets, md_drivers) well-governed. No cross-domain identity need.

### 1.2 Carrier = Party + Role (ADR-073)

**Evidence:** md_entities + party_roles.CARRIER sufficient. No separate master needed.

### 1.3 Location Hierarchy = Network (ADR-074)

**Evidence:** Port→Terminal→Berth covers all network concepts. No separate node master needed.

### 1.4 fw_locations Migration Required (ADR-075)

**Evidence:** Legacy duplicate authority. Controlled migration with zero-consumer proof required.

### 1.5 is_vendor Migration Required (ADR-076)

**Evidence:** 131 consumers require semantic classification. Backfill done.

---

## 2. REJECTED ALTERNATIVES

| Alternative | Rejected Because |
|-------------|------------------|
| Generic Resource master | Duplicates existing authorities |
| Separate carrier master | Duplicates md_entities |
| Network node master | Duplicates md_locations |
| Blind is_vendor replacement | Semantic ambiguity |

---

## 3. UNRESOLVED QUESTIONS

| Question | Impact |
|----------|--------|
| fw_order_headers status | Requires further forensic analysis |
| Carrier mode capability | May become needed for multimodal |

---

## 4. VERDICT

**GREEN — DATA-4A ADR PACKAGE READY FOR HUMAN RATIFICATION**

---

**END OF DECISION LOG**
