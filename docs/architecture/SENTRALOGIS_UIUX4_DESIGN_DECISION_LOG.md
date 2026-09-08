# SENTRALOGIS — UI/UX-4 DESIGN
# DESIGN DECISION LOG

**Date:** 2026-09-02  

---

## 1. Navigation Architecture

### Decision 1.1: Business-Object Centric Navigation

**Context:** Current navigation is SBU-centric (Forwarding, Customs, Trucking, Warehouse). Users think in business objects (Orders, Fulfillment, Shipments).

**Decision:** Restructure navigation around business objects and lifecycle stages.

**Rationale:**
- Users don't think "I need to go to Forwarding" — they think "I need to track a shipment"
- Business-object navigation reduces cognitive load
- Aligns with the canonical lineage: Order → Fulfillment → Shipment → Execution

**Consequences:**
- SBU modules become sub-views within business objects
- Users can see cross-SBU composition in one place
- Reduces navigation depth for common tasks

---

### Decision 1.2: Command Center as Default Landing

**Context:** Users need to know what requires their attention immediately upon login.

**Decision:** Command Center is the default landing page for all internal users.

**Rationale:**
- Answers "What needs my attention?" immediately
- Reduces time-to-value for daily operations
- Surfaces exceptions and risks proactively

**Consequences:**
- Role-personalized views ensure relevance
- Operational Pulse provides at-a-glance status
- Copilot recommendations provide actionable intelligence

---

### Decision 1.3: Role-Aware Navigation Visibility

**Context:** Different roles need different navigation items. Showing all items creates clutter.

**Decision:** Navigation items are shown/hidden based on user role and permissions.

**Rationale:**
- Reduces cognitive load
- Prevents unauthorized access attempts
- Simplifies UI for each role

**Consequences:**
- Super Admin sees all items
- SBU operators see only relevant items
- External users see only portal items

---

## 2. Workspace Design

### Decision 2.1: Tab-Based Workspace Navigation

**Context:** Business objects have multiple facets (overview, lines, fulfillment, shipments, etc.).

**Decision:** Use horizontal tabs within workspace detail views.

**Rationale:**
- Preserves context (parent object always visible)
- Allows quick switching between facets
- Standard pattern users understand

**Consequences:**
- Tab state preserved during session
- Deep linking to specific tabs possible
- Breadcrumb shows full path

---

### Decision 2.2: Composition Grid for Multi-Service Orders

**Context:** A single order may contain forwarding, customs, trucking, and warehouse services.

**Decision:** Use a composition grid to show all services and their status.

**Rationale:**
- Shows complete picture in one view
- Enables cross-service correlation
- Supports partial fulfillment visibility

**Consequences:**
- Each service shows its own status
- Progress is aggregated at order level
- Exceptions are visible per-service

---

### Decision 2.3: Timeline Visualization for Shipments

**Context:** Shipments have multiple milestones that need clear visualization.

**Decision:** Use a horizontal timeline with milestone markers.

**Rationale:**
- Intuitive progress visualization
- Supports multiple legs and modes
- Clear current position indicator

**Consequences:**
- Timeline is interactive (click for details)
- Color-coded by status
- Supports both internal and customer views

---

## 3. External Experience

### Decision 3.1: Separate Portals for Customers and Vendors

**Context:** Customers and vendors have different needs and workflows.

**Decision:** Create separate portal experiences for each persona.

**Rationale:**
- Customers need order/shipment visibility
- Vendors need assignment/execution workflows
- Different permission models

**Consequences:**
- Customer Portal: `/portal/customer`
- Vendor Portal: `/portal/partner`
- Shared authentication, separate authorization

---

### Decision 3.2: ERP-Coexistence Visual Indicators

**Context:** Some data originates from ERP and has different editability rules.

**Decision:** Use visual indicators (badges, icons, locked fields) to show ERP-originated data.

**Rationale:**
- Prevents confusion about data ownership
- Clarifies what can/cannot be edited in SENTRALOGIS
- Supports audit trail

**Consequences:**
- ERP badge on ERP-originated records
- Locked fields for ERP-owned data
- "View in ERP" link where applicable

---

## 4. Mobile Design

### Decision 4.1: Bottom Navigation for Mobile

**Context:** Mobile users need thumb-friendly navigation with minimal items.

**Decision:** Use bottom navigation with 5 items max.

**Rationale:**
- Thumb-friendly reach
- Standard mobile pattern
- Role-specific items

**Consequences:**
- Home, Work, Create, Alerts, Profile
- Role-specific variations
- FAB for primary create action

---

### Decision 4.2: Action-Oriented Mobile Workflows

**Context:** Mobile users are typically in the field executing tasks.

**Decision:** Design mobile workflows around actions, not management.

**Rationale:**
- Field workers need quick actions
- Limited screen real estate
- Context is known (assigned work)

**Consequences:**
- Accept/Reject assignments
- Update status
- Upload POD
- Report exceptions

---

## 5. Copilot Design

### Decision 5.1: Proactive + Embedded Copilot

**Context:** Users need intelligence surfaced where they are, not in a separate tool.

**Decision:** Copilot is proactive and embedded in workspaces.

**Rationale:**
- Reduces context switching
- Surfaces insights at point of decision
- Actionable recommendations

**Consequences:**
- Command Center: Proactive recommendations
- Workspace: Contextual insights
- Global: Chat panel for queries

---

### Decision 5.2: Copilot Never Acts Without Confirmation

**Context:** Copilot recommendations may have significant business impact.

**Decision:** Copilot NEVER executes actions without user confirmation.

**Rationale:**
- Prevents unintended consequences
- Maintains human authority
- Builds trust

**Consequences:**
- All actions require explicit confirmation
- Copilot can draft but not send
- Audit trail for all Copilot-assisted actions

---

## 6. Visual Design

### Decision 6.1: Status Color Semantics

**Context:** Consistent color coding is critical for quick recognition.

**Decision:** Define standard status colors across all screens.

**Rationale:**
- Red = Critical/Error
- Amber = Warning/At Risk
- Blue = Active/Info
- Green = Success/Completed
- Slate = Neutral/Draft

**Consequences:**
- Consistent across all components
- Accessible (not color-only)
- Documented in Design System

---

### Decision 6.2: Empty States with Actions

**Context:** Empty lists confuse users — is there no data or an error?

**Decision:** Every empty state has an icon, message, and call to action.

**Rationale:**
- Clarifies the situation
- Guides next step
- Reduces support requests

**Consequences:**
- Standard empty state component
- Context-specific messages
- Action buttons where applicable

---

## 7. Technical Constraints

### Decision 7.1: No New Shadow Tables

**Context:** UI/UX redesign must not create duplicate state.

**Decision:** UI reads from existing canonical tables only.

**Rationale:**
- Single source of truth
- No sync issues
- No data inconsistency

**Consequences:**
- Read models built on existing tables
- Control Tower pattern reused
- No new migrations for UI

---

### Decision 7.2: Server-Derived Tenant Isolation

**Context:** UI must never trust client-provided tenant context.

**Decision:** All data access uses server-derived tenant isolation.

**Rationale:**
- Security: prevents cross-tenant data leakage
- Consistency: aligns with backend architecture
- Auditability: clear tenant context

**Consequences:**
- IdentityContext used throughout
- RLS enforced at database level
- No client-side tenant filtering

---

**END OF DESIGN DECISION LOG**
