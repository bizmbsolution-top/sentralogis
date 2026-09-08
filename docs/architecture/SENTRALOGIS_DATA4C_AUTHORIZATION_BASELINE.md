# SENTRALOGIS — DATA-4C
# AUTHORIZATION BASELINE LOCK

**Date:** 2026-09-02  
**Phase:** DATA-4C  
**Nature:** FROZEN ARCHITECTURAL BASELINE  
**Status:** LOCKED  

---

## 1. Approved Architecture

| Domain | Canonical Authority |
|--------|---------------------|
| Party | md_entities |
| Party Role | party_roles |
| Vendor | md_entities + party_roles.VENDOR |
| Location | md_locations |
| Carrier | md_entities + CARRIER role |
| Fleet | Existing domain-specific model |
| Driver | Existing domain-specific model |
| Container | Shipment Unit |
| Network | md_locations hierarchy |

---

## 2. Approved Migration Targets

| Legacy | Target | Status |
|--------|--------|--------|
| fw_locations | md_locations | Plan ratified |
| is_vendor | party_roles.VENDOR | Plan ratified |
| fw_order_headers | — | DEFERRED |

---

## 3. Approved Execution Tracks

### Track A — fw_locations

| Step | Description |
|------|-------------|
| 1 | Create md_locations from fw_locations |
| 2 | Migrate origin_port_id FK |
| 3 | Migrate dest_port_id FK |
| 4 | Migrate start_location_id FK |
| 5 | Migrate end_location_id FK |
| 6 | Zero-consumer proof |
| 7 | Drop fw_locations |

### Track B — is_vendor

| Batch | Domain |
|-------|--------|
| V01 | Assignment |
| V02 | Integration |
| V03 | Finance |
| V04 | Fleet |
| V05 | UI Filters |
| V06 | UI Badges |
| V07 | UI Forms |
| V08 | Final reconciliation |

---

## 4. Approved Preflight Gates

| Gate | Description |
|------|-------------|
| GATE-01 | Repository clean |
| GATE-02 | Baseline tests pass |
| GATE-03 | TypeScript passes |
| GATE-04 | Migration artifact integrity |
| GATE-05 | Data quality |
| GATE-06 | FK dependency |
| GATE-07 | Consumer freeze |
| GATE-08 | Tenant isolation |
| GATE-09 | Rollback readiness |
| GATE-10 | Zero-consumer strategy |
| GATE-11 | Regression plan |
| GATE-12 | Human authorization |

---

## 5. Approved Rollback Boundary

| Track | Point of No Return |
|-------|-------------------|
| Track A | DROP fw_locations |
| Track B | is_vendor column removal |

---

## 6. Explicit Exclusions

- No generic Resource master
- No separate Carrier master
- No separate Network Node master
- No master Container
- No Party Role duplication of Shipment contextual roles
- No fw_order_headers changes

---

## 7. DATA-4E Authorization Requirement

> **DATA-4E execution requires separate human authorization.**

This baseline lock authorizes the plan only.

---

**END OF AUTHORIZATION BASELINE LOCK**
