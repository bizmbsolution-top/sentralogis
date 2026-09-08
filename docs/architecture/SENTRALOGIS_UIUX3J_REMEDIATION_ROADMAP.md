# SENTRALOGIS — PHASE UI/UX-3J
# REMEDIATION ROADMAP

**Date:** 2026-09-01  

---

## 1. Remediation Classification

| Category | Count | Description |
|----------|-------|-------------|
| UI-ONLY | 4 | Can be implemented without backend changes |
| UI + EXISTING BACKEND | 6 | Existing APIs, UI integration needed |
| BACKEND ENABLEMENT | 8 | New API/service required |
| AUTHORIZATION ENABLEMENT | 3 | Role/permission changes needed |
| INTEGRATION | 2 | External system integration |
| FUTURE INTELLIGENCE | 2 | Smart Tutorial / Proactive Copilot |

---

## 2. Recommended Next Phases

### Phase UI/UX-3K — Customer & Vendor Access Enablement Discovery
**Scope:** Customer portal, Vendor portal, External API design

| Item | Type | Priority |
|------|------|----------|
| Customer-scoped API design | DISCOVERY | P0 |
| Vendor-scoped API design | DISCOVERY | P0 |
| Customer role permissions | DISCOVERY | P0 |
| Vendor role permissions | DISCOVERY | P0 |
| External tracking API | DISCOVERY | P1 |

### Phase UI/UX-3L — Customer/Vendor Authorization Design
**Scope:** Authorization model for external personas

| Item | Type | Priority |
|------|------|----------|
| Customer authorization model | DESIGN | P0 |
| Vendor authorization model | DESIGN | P0 |
| Scoped resource policies | DESIGN | P0 |
| RLS policy design | DESIGN | P0 |

### Phase UI/UX-3M — Portal Backend Enablement
**Scope:** Backend APIs for customer/vendor access

| Item | Type | Priority |
|------|------|----------|
| Customer order API | IMPLEMENTATION | P0 |
| Customer shipment API | IMPLEMENTATION | P0 |
| Vendor assignment API | IMPLEMENTATION | P0 |
| Vendor job API | IMPLEMENTATION | P0 |
| Public tracking API | IMPLEMENTATION | P1 |

### Phase UI/UX-3N — Portal Implementation
**Scope:** Customer/vendor portal UI connected to real APIs

| Item | Type | Priority |
|------|------|----------|
| Customer portal UI | IMPLEMENTATION | P0 |
| Vendor portal UI | IMPLEMENTATION | P0 |
| Mobile optimization | IMPLEMENTATION | P2 |

### Phase UI/UX-3O — Mobile Optimization
**Scope:** Mobile-first workflows

| Item | Type | Priority |
|------|------|----------|
| Responsive tables | IMPLEMENTATION | P2 |
| Mobile forms | IMPLEMENTATION | P2 |
| Touch targets | IMPLEMENTATION | P2 |
| Bottom navigation | IMPLEMENTATION | P2 |

---

## 3. Dependencies

```
UI/UX-3K (Discovery)
    ↓
UI/UX-3L (Auth Design)
    ↓
UI/UX-3M (Backend)
    ↓
UI/UX-3N (Portal UI)
    ↓
UI/UX-3O (Mobile)
```

---

**END OF REMEDIATION ROADMAP**
