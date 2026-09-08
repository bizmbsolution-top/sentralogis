# SENTRALOGIS — UI/UX-3C
# DECISION MATRIX

**Date:** 2026-09-01  

---

| Decision | Current State | Classification | Authority | Gap | Required ADR | Implementation Impact |
| -------- | ------------- | -------------- | --------- | --- | ------------ | --------------------- |
| Commercial workspace | Partial (SO, Quote exist) | ADAPT | Commercial | Engagement UI | None | UI only |
| Customer Success workspace | MISSING | NEW UX | Commercial | Backend services | None | Future phase |
| Operations workspace | Fragmented (SBU-first) | ADAPT | Operations | Consolidation | None | UI only |
| Finance workspace | Partial (Invoices exist) | ADAPT | Financial | Consolidation | None | UI only |
| Control Tower | EXISTS (5C-3) | REUSE | Intelligence | None | None | UI only |
| Customer visibility | Partial (tracking exists) | ADAPT | Customer | Portal | None | Future phase |
| Vendor visibility | MISSING | NEW UX | Vendor | Portal | None | Future phase |
| Multi-persona model | MISSING | NEW UX | Identity | Shell | None | UI only |
| Copilot integration | EXISTS (5D-3) | REUSE | Intelligence | None | None | UI only |
| Smart Tutorial | MISSING | NEW UX | Intelligence | Engine | None | Future phase |
| Mobile UX | POOR | ADAPT | UX | Responsive | None | UI only |
| Legacy sidebar | EXISTS (role-based) | REPLACE | UX | Consolidation | None | UI only |
| SBU-first navigation | EXISTS | REPLACE | UX | Consolidation | None | UI only |
| Pricing UI | EXISTS (legacy) | ADAPT | Pricing | Consolidation | None | UI only |
| Financial UI | Partial | ADAPT | Financial | Consolidation | None | UI only |
| Payment UI | MISSING | NEW UX | Financial | Backend | None | Future phase |
| Settlement UI | MISSING | NEW UX | Financial | Backend | None | Future phase |
| Reconciliation UI | MISSING | NEW UX | Financial | Backend | None | Future phase |
| External customer portal | MISSING | NEW UX | Customer | Backend | None | Future phase |
| External vendor portal | MISSING | NEW UX | Vendor | Backend | None | Future phase |

---

## Classification Summary

| Classification | Count |
|----------------|-------|
| EXISTING | 0 |
| REUSE | 3 |
| ADAPT | 7 |
| NEW UX | 6 |
| REPLACE | 2 |

---

## Architecture Gaps

| Gap | Impact | Recommended Action |
|-----|--------|-------------------|
| Engagement UI | HIGH | Implement in UI/UX-3D |
| Customer Success backend | MEDIUM | Future phase |
| Customer portal backend | MEDIUM | Future phase |
| Vendor portal backend | MEDIUM | Future phase |
| Smart Tutorial engine | LOW | Future phase |
| Payment/Settlement/Reconciliation UI | MEDIUM | Future phase |

---

**END OF DECISION MATRIX**
