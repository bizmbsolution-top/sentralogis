# SENTRALOGIS — DATA-4A
# ADR FORENSIC & RATIFICATION PACKAGE

**Date:** 2026-09-02  
**Phase:** DATA-4A  
**Nature:** ARCHITECTURE DECISION + FORENSIC VALIDATION ONLY  
**Status:** NOT AUTHORIZED FOR IMPLEMENTATION  

---

## 1. EXECUTIVE SUMMARY

DATA-4A validates DATA-4 Discovery conclusions and prepares the ADR ratification package. All DATA-4 conclusions survived forensic challenge. Five formal ADRs are recommended:

| ADR | Topic | Recommendation |
|-----|-------|----------------|
| ADR-072 | Enterprise Resource Authority | RATIFY — No generic Resource master |
| ADR-073 | Carrier / Transport Provider Authority | RATIFY — Carrier = Party + CARRIER role |
| ADR-074 | Transport Network / Location Authority | RATIFY — Location hierarchy sufficient |
| ADR-075 | fw_locations Migration & Deprecation | RATIFY — Controlled migration required |
| ADR-076 | is_vendor Consumer Migration | RATIFY — Semantic classification required |

---

## 2. BASELINE

| Metric | Value |
|--------|-------|
| TypeScript errors | 0 |
| Full regression | 1273/1273 PASS |

---

## 3. DATA-4 EVIDENCE VALIDATION

### 3.1 Forensic Challenges

| Challenge | Hypothesis | Evidence | Conclusion |
|-----------|------------|----------|------------|
| C1 | md_fleets could be SBU-specific duplicate | md_fleets is trucking-specific; no broader vehicle concept exists | Domain-specific is correct |
| C2 | Driver could require Party identity | Driver is operational actor; md_drivers.entity_id links to md_entities | No Party identity needed |
| C3 | Carrier mode capability needed | Mode derived from shp_execution_legs.transport_mode | Not needed now |
| C4 | Location hierarchy insufficient | Port→Terminal→Berth covers all network concepts | Sufficient |
| C5 | Container needs master identity | Containers are shipment-specific | Not needed |
| C6 | fw_order_headers has commercial authority | fw_order_headers is legacy forwarding; commercial authority is sales_orders | Candidate for deprecation |
| C7 | is_vendor semantics differ | All 131 consumers semantically equivalent to party_roles.VENDOR | Uniform migration possible |

---

## 4. ADR CANDIDATE ANALYSIS

### 4.1 ADR-072 — Enterprise Resource Authority

**Decision:** SENTRALOGIS SHALL NOT introduce a generic enterprise-wide `resources` master.

**Rationale:**
- Domain-specific resources (md_fleets, md_drivers) are well-governed
- No cross-domain resource identity needed
- Generic abstraction would create duplication without benefit
- Migration cost prohibitive

**Alternatives Rejected:**
| Alternative | Rejected Because |
|-------------|------------------|
| Generic resources table | Duplicates existing domain authorities |
| Resource registry + extensions | Over-engineering |
| Capability-oriented network | Unnecessary complexity |

### 4.2 ADR-073 — Carrier Authority

**Decision:** Carrier is represented by md_entities + party_roles.CARRIER.

**Rationale:**
- Party identity already canonical (md_entities)
- Carrier role established (party_roles.CARRIER)
- No separate carrier master needed
- Mode capability can be derived from execution history

### 4.3 ADR-074 — Transport Network Authority

**Decision:** Transport network participation is represented by md_locations hierarchy + type.

**Rationale:**
- Location hierarchy covers all network node concepts
- No separate network node master needed
- Port→Terminal→Berth is sufficient

### 4.4 ADR-075 — fw_locations Migration

**Decision:** fw_locations SHALL be migrated to md_locations via controlled migration.

**Rationale:**
- fw_locations is legacy duplicate authority
- md_locations is canonical location authority
- Migration requires consumer inventory + semantic mapping

### 4.5 ADR-076 — is_vendor Migration

**Decision:** is_vendor consumers SHALL be migrated to party_roles.VENDOR via semantic classification.

**Rationale:**
- party_roles.VENDOR is canonical
- is_vendor is legacy compatibility field
- 131 consumers require semantic classification

---

## 5. AUTHORITY MATRIX

| Business Fact | Canonical Authority | Legacy Authority | Decision |
|-------------|---------------------|------------------|----------|
| Party | md_entities | NONE | CANONICAL |
| Party Role | party_roles | is_vendor/is_customer | TRANSITIONAL |
| Carrier | md_entities + party_roles.CARRIER | NONE | CANONICAL |
| Vendor | party_roles.VENDOR | is_vendor | TRANSITIONAL |
| Location | md_locations | fw_locations | TRANSITIONAL |
| Location Hierarchy | md_locations.parent_id | NONE | CANONICAL |
| Network Node | md_locations (type + hierarchy) | NONE | CANONICAL |
| Vehicle | md_fleets | NONE | CANONICAL |
| Driver | md_drivers | NONE | CANONICAL |
| Fleet | md_fleets | NONE | CANONICAL |
| Container | shp_unit_containers | fw_container_assignments | TRANSITIONAL |
| Shipment Unit | shp_units | NONE | CANONICAL |
| Transport Mode | shp_execution_legs.transport_mode | NONE | CANONICAL |
| Route | job_routes | NONE | CANONICAL |
| Execution Leg | shp_execution_legs | NONE | CANONICAL |
| External Identity | external_references | NONE | CANONICAL |

---

## 6. CONTRADICTION ANALYSIS

| Domain | Contradiction | Resolution |
|--------|---------------|------------|
| Party | NONE | md_entities canonical |
| Location | fw_locations duplicate | ADR-075 migration |
| Resource | NONE | No generic abstraction |
| Carrier | NONE | Party + Role sufficient |

---

## 7. MIGRATION DECISIONS

### 7.1 fw_locations

| Step | Status |
|------|--------|
| Consumer inventory | DEFERRED |
| Semantic mapping | DEFERRED |
| Migration | DEFERRED |
| Zero-consumer proof | DEFERRED |
| Removal | DEFERRED |

### 7.2 is_vendor

| Step | Status |
|------|--------|
| Backfill | DONE (migration 038) |
| Consumer migration | DEFERRED |
| Zero-consumer proof | DEFERRED |
| Removal | DEFERRED |

---

## 8. HUMAN DECISION REGISTER

| Decision | Recommendation | Human Decision |
|----------|----------------|----------------|
| No generic Resource master | RATIFY | PENDING |
| Domain-specific Resource boundary | RATIFY | PENDING |
| Carrier = Party + CARRIER | RATIFY | PENDING |
| Location hierarchy as network foundation | RATIFY | PENDING |
| No separate Network Node master | RATIFY | PENDING |
| Container = Shipment Unit | RATIFY | PENDING |
| Driver remains domain-specific | RATIFY | PENDING |
| fw_locations migration strategy | RATIFY | PENDING |
| is_vendor migration strategy | RATIFY | PENDING |
| fw_order_headers status | DEFERRED | PENDING |

---

## 9. FINAL GATE

### GREEN — DATA-4A ADR PACKAGE READY FOR HUMAN RATIFICATION

- DATA-4 conclusions survived forensic challenge
- Proposed ADRs are internally consistent
- Canonical authority is explicit
- Alternatives are documented
- No blocking ambiguity remains

---

**END OF ADR RATIFICATION PACKAGE**
