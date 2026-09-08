# SENTRALOGIS — PHASE UI/UX-3I
# RECOMMENDATION MATRIX

**Date:** 2026-09-01  

---

## P0 — CRITICAL

| ID | Finding | Screen | Persona | Dependency | Backend Required | ADR Required | Future Phase |
|----|---------|--------|---------|------------|-----------------|--------------|--------------|
| P0-01 | Customer-scoped APIs missing | Customer Portal | Customer | None | YES | No | UI/UX-3J |
| P0-02 | Vendor-scoped APIs missing | Vendor Portal | Vendor | None | YES | No | UI/UX-3J |
| P0-03 | Customer role permissions undefined | Auth | Customer | None | YES | No | UI/UX-3J |
| P0-04 | Vendor role permissions undefined | Auth | Vendor | None | YES | No | UI/UX-3J |
| P0-05 | SO line item editor backend missing | SO Detail | CS | None | YES | No | UI/UX-3J |
| P0-06 | Engagement backend API not connected | Engagement | CS | None | YES | No | UI/UX-3J |

---

## P1 — CORE EXPERIENCE

| ID | Finding | Screen | Persona | Dependency | Backend Required | ADR Required | Future Phase |
|----|---------|--------|---------|------------|-----------------|--------------|--------------|
| P1-01 | Real-time dashboard data | All | All | APIs | No | No | UI/UX-3J |
| P1-02 | Invoice creation UI not connected | Finance | Finance | APIs | YES | No | UI/UX-3J |
| P1-03 | Payment recording UI not connected | Finance | Finance | APIs | YES | No | UI/UX-3J |
| P1-04 | AR aging view not built | Finance | Finance | APIs | YES | No | UI/UX-3J |
| P1-05 | Reconciliation UI not built | Finance | Finance | APIs | YES | No | UI/UX-3J |
| P1-06 | Assignment workflow not connected | Operations | Ops | APIs | YES | No | UI/UX-3J |
| P1-07 | Forwarding execution UI not connected | Operations | Ops | APIs | No | No | UI/UX-3J |
| P1-08 | Command Center search not connected | Global | All | APIs | YES | No | UI/UX-3J |

---

## P2 — ENHANCEMENT

| ID | Finding | Screen | Persona | Dependency | Backend Required | ADR Required | Future Phase |
|----|---------|--------|---------|------------|-----------------|--------------|--------------|
| P2-01 | Mobile table responsiveness | All | All | None | No | No | UI/UX-3J |
| P2-02 | Smart Tutorial engine | All | All | None | YES | No | Tutorial phase |
| P2-03 | Proactive Copilot | Intelligence | Mgmt | None | YES | No | Future phase |
| P2-04 | Document management | All | All | None | YES | No | Future phase |
| P2-05 | Notification service | All | All | None | YES | No | Future phase |
| P2-06 | External accounting integration | Finance | Finance | None | YES | No | Future phase |
| P2-07 | Copilot commercial intents | Commercial | CS | None | YES | No | Copilot phase |
| P2-08 | Copilot financial intents | Finance | Finance | None | YES | No | Copilot phase |

---

## P3 — POLISH

| ID | Finding | Screen | Persona | Dependency | Backend Required | ADR Required | Future Phase |
|----|---------|--------|---------|------------|-----------------|--------------|--------------|
| P3-01 | Mobile order creation | Commercial | CS | None | No | No | UI/UX-3J |
| P3-02 | Mobile pricing management | Pricing | CS | None | No | No | UI/UX-3J |

---

## Summary

| Priority | Count | Backend Required | ADR Required |
|----------|-------|-----------------|--------------|
| P0 | 6 | 6 | 0 |
| P1 | 8 | 7 | 0 |
| P2 | 8 | 7 | 0 |
| P3 | 2 | 0 | 0 |
| **Total** | **24** | **20** | **0** |

---

## Phase Recommendations

| Phase | Focus | Items |
|-------|-------|-------|
| UI/UX-3J | Critical UX + Backend integration | P0-01 to P0-06, P1-01 to P1-08 |
| Tutorial phase | Smart Tutorial engine | P2-02 |
| Copilot phase | Additional intents | P2-07, P2-08 |
| Future phase | Advanced capabilities | P2-03 to P2-06 |

---

**END OF RECOMMENDATION MATRIX**
