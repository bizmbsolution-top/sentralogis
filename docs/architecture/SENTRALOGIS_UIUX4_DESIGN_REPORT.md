# SENTRALOGIS — UI/UX-4 DESIGN REPORT

**Date:** 2026-09-02  
**Phase:** UI/UX-4  
**Mode:** Design-Only  
**Status:** GATE COMPLETE  

---

## 1. Executive Summary

UI/UX-4 redesigns the SENTRALOGIS experience from **module-centric (SBU-first)** to **business-object/lifecycle-centric**. The design covers 12 primary navigation areas, 6 workspace types, 3 external portals, mobile workflows, and an embedded Copilot.

**Design is complete. Implementation is NOT authorized.**

---

## 2. Design Artifacts Produced

| # | Artifact | Status |
|---|----------|--------|
| 1 | Design System | COMPLETE |
| 2 | Information Architecture | COMPLETE |
| 3 | Command Center Design | COMPLETE |
| 4 | Workspace Design | COMPLETE |
| 5 | External Experience Design | COMPLETE |
| 6 | Mobile Design | COMPLETE |
| 7 | Copilot Design | COMPLETE |
| 8 | Screen Specification | COMPLETE |
| 9 | Design Decision Log | COMPLETE |

---

## 3. Key Design Decisions

### 3.1 Navigation Restructuring

**From:** SBU-centric (Forwarding, Customs, Trucking, Warehouse)  
**To:** Business-object centric (Command Center, Work, Orders, Fulfillment, Shipments, Execution, Exceptions, Customers, Finance, Intelligence, Copilot, Administration)

**Rationale:** Users think in business objects, not SBU modules.

### 3.2 Command Center as Default Landing

**Rationale:** Answers "What needs my attention?" immediately upon login.

### 3.3 Role-Aware Navigation

**Rationale:** Different roles need different navigation items. Reduces cognitive load.

### 3.4 Tab-Based Workspace Navigation

**Rationale:** Preserves context, allows quick switching between facets.

### 3.5 Composition Grid for Multi-Service Orders

**Rationale:** Shows complete picture of all services in one view.

### 3.6 Timeline Visualization for Shipments

**Rationale:** Intuitive progress visualization with milestone markers.

### 3.7 Separate Portals for Customers and Vendors

**Rationale:** Different personas have different needs and workflows.

### 3.8 Proactive + Embedded Copilot

**Rationale:** Surfaces intelligence where users are, not in a separate tool.

### 3.9 Copilot Never Acts Without Confirmation

**Rationale:** Maintains human authority, prevents unintended consequences.

---

## 4. Navigation Architecture

### 4.1 Primary Navigation

| # | Item | Route | Permission |
|---|------|-------|------------|
| 1 | Command Center | `/command-center` | All |
| 2 | Work | `/work` | All |
| 3 | Orders | `/orders` | commercial:read |
| 4 | Fulfillment | `/fulfillment` | commercial:read |
| 5 | Shipments | `/shipments` | shipment:read |
| 6 | Execution | `/execution` | job_order:read |
| 7 | Exceptions | `/exceptions` | All |
| 8 | Customers | `/customers` | commercial:read |
| 9 | Finance | `/finance` | finance:read |
| 10 | Intelligence | `/intelligence` | intelligence:read |
| 11 | Copilot | `/copilot` | All |
| 12 | Administration | `/admin` | tenant:manage |

### 4.2 Role-Aware Visibility

| Role | Primary Navigation |
|------|-------------------|
| Super Admin | All + Token Economics |
| Central Admin | All except Token Economics |
| SBU Admin | Work, Execution, Shipments, Exceptions |
| Operations | Work, Execution, Shipments, Exceptions, Copilot |
| CS | Work, Orders, Fulfillment, Customers, Exceptions |
| Finance | Work, Orders, Finance, Intelligence |
| Customer | Customer Portal only |
| Vendor | Partner Portal only |

---

## 5. Workspace Summary

| Workspace | Tabs | Primary Actions |
|-----------|------|-----------------|
| Order | Overview, Lines, Fulfillment, Shipments, Financial, Documents, Timeline, Activity | Create Fulfillment, Amend, Cancel |
| Fulfillment | Overview, Allocations, Plans, Shipments, Exceptions, Activity | Add Allocation, Update Progress, Cancel |
| Shipment | Overview, Units, Legs, Services, Milestones, Documents, Exceptions, Financial, Activity | Update Status, Add Leg, Assign |
| Execution | Overview, Assignments, History | Assign Driver, Update Status, Upload POD |
| Exception | Overview, Impact, Root Cause, Recommended Action, Resolution, Audit | Assign, Resolve, Escalate |
| Customer | Overview, Engagements, Orders, Shipments, Documents, Financial, Activity | Create Order, View History |

---

## 6. External Experience Summary

| Portal | Entry Point | Primary Workflows |
|--------|-------------|-------------------|
| Customer | `/portal/customer` | View Orders, Track Shipments, Download Documents, Contact Support |
| Vendor | `/portal/partner` | View Assignments, Execute Jobs, Upload POD, Report Exceptions |

---

## 7. Mobile Summary

| Aspect | Design |
|--------|--------|
| Navigation | Bottom nav (5 items max) |
| Workflows | Action-oriented (Accept, Update, Upload, Report) |
| Offline | Cache + queue + sync |
| Performance | FCP < 1.5s, TTI < 3s |

---

## 8. Copilot Summary

| Mode | Location | Behavior |
|------|----------|----------|
| Proactive | Command Center | Recommendations based on attention model |
| Contextual | Workspaces | Insights based on current object |
| Global | Chat panel | Natural language queries and actions |

**Constraint:** Copilot NEVER acts without user confirmation.

---

## 9. Design Principles

1. **Business-Object Centric** — Users think in Orders, Fulfillment, Shipments
2. **Lifecycle Visibility** — Every object's stage is immediately visible
3. **Attention First** — Command Center answers "What needs my attention?"
4. **Context Preservation** — Users never lose context between related objects
5. **Authority Clarity** — Users understand what they can/cannot do
6. **Domain Sovereignty** — Forwarding, Customs, Trucking, Warehouse remain sovereign
7. **Composability** — One Shipment may contain multiple services
8. **ERP Coexistence** — Clear boundary between ERP and SENTRALOGIS truth
9. **Mobile Operational** — Field workflows are mobile-first

---

## 10. Constraints & Guardrails

| Constraint | Description |
|------------|-------------|
| No Shadow Tables | UI reads from existing canonical tables only |
| Server-Derived Tenant | All data access uses server-derived tenant isolation |
| No Client Business Numbers | All business numbers generated by canonical server functions |
| No Direct DB Mutations | All mutations go through domain services |
| Copilot Confirmation | Copilot NEVER acts without user confirmation |
| Domain Sovereignty | SBU domains remain sovereign — no cross-domain mutations |

---

## 11. Implementation Readiness

### 11.1 What Is Ready

- Complete design system
- Complete information architecture
- Complete screen specifications
- Complete design decision log
- Role-aware navigation model
- Workspace tab structure
- External portal designs
- Mobile workflow designs
- Copilot integration model

### 11.2 What Is NOT Ready

- Implementation code
- New migrations (none required for UI)
- Component library updates
- API endpoint changes (existing APIs sufficient)

### 11.3 Implementation Dependencies

| Dependency | Status |
|------------|--------|
| Existing canonical tables | READY |
| Existing domain services | READY |
| Existing API routes | READY |
| Existing authentication | READY |
| Existing authorization | READY |
| Existing Control Tower read model | READY |

---

## 12. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| User resistance to navigation change | Medium | Phased rollout, training, feedback loops |
| Performance with complex workspace views | Low | Pagination, lazy loading, skeleton states |
| Mobile offline complexity | Medium | Progressive enhancement, clear sync indicators |
| Copilot accuracy | Medium | Human-in-the-loop, confidence indicators |

---

## 13. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Task completion time | -30% | Time to complete common tasks |
| Navigation errors | -50% | Wrong navigation attempts |
| User satisfaction | > 4.0/5.0 | Post-redesign survey |
| Exception resolution time | -25% | Time from creation to resolution |
| Mobile adoption | > 60% | % of field workflows on mobile |

---

## 14. Gate Decision

### DESIGN PHASE: COMPLETE

All 9 design artifacts produced. Design is coherent, consistent, and implementable.

### IMPLEMENTATION: NOT AUTHORIZED

Implementation requires explicit authorization after design review.

### NEXT STEPS:

1. **Design Review** — Review design artifacts with stakeholders
2. **Implementation Planning** — Break implementation into phases
3. **Implementation Authorization** — Explicit go-ahead for implementation
4. **Phased Implementation** — Implement in priority order:
   - Phase A: Navigation + Command Center
   - Phase B: Order + Fulfillment Workspaces
   - Phase C: Shipment + Execution Workspaces
   - Phase D: Exception Center
   - Phase E: Customer + Vendor Portals
   - Phase F: Mobile Optimization
   - Phase G: Copilot Integration

---

## 15. Artifact Locations

| Artifact | Path |
|----------|------|
| Design System | `docs/architecture/SENTRALOGIS_UIUX4_DESIGN_SYSTEM.md` |
| Information Architecture | `docs/architecture/SENTRALOGIS_UIUX4_INFORMATION_ARCHITECTURE.md` |
| Command Center Design | `docs/architecture/SENTRALOGIS_UIUX4_COMMAND_CENTER_DESIGN.md` |
| Workspace Design | `docs/architecture/SENTRALOGIS_UIUX4_WORKSPACE_DESIGN.md` |
| External Experience | `docs/architecture/SENTRALOGIS_UIUX4_EXTERNAL_EXPERIENCE_DESIGN.md` |
| Mobile Design | `docs/architecture/SENTRALOGIS_UIUX4_MOBILE_DESIGN.md` |
| Copilot Design | `docs/architecture/SENTRALOGIS_UIUX4_COPILOT_DESIGN.md` |
| Screen Specification | `docs/architecture/SENTRALOGIS_UIUX4_SCREEN_SPECIFICATION.md` |
| Design Decision Log | `docs/architecture/SENTRALOGIS_UIUX4_DESIGN_DECISION_LOG.md` |
| Design Report (this) | `docs/architecture/SENTRALOGIS_UIUX4_DESIGN_REPORT.md` |

---

**END OF DESIGN REPORT**

**STATUS: DESIGN COMPLETE — IMPLEMENTATION PENDING AUTHORIZATION**
