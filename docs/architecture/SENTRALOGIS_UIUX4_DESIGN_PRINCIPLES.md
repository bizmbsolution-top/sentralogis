# SENTRALOGIS — PHASE UI/UX-4
# DESIGN PRINCIPLES

**Date:** 2026-09-02  

---

## 1. Core Principles

### 1.1 Business-Object Centric

The user should think in terms of **Orders, Fulfillment, Shipments, Execution** — not SBU modules.

### 1.2 Lifecycle Visibility

Every major object should make its lifecycle stage immediately visible.

### 1.3 Attention First

The Command Center should answer: **"What needs my attention right now?"**

### 1.4 Context Preservation

Users should never lose context when moving between related objects.

### 1.5 Authority Clarity

Users should always understand what they can and cannot do.

### 1.6 Domain Sovereignty

Forwarding, Customs, Trucking, and Warehouse remain sovereign domains. The UX coordinates — it does not absorb.

---

## 2. Information Hierarchy

### 2.1 Primary Information

What the user needs to know immediately:
- Identity (what is this?)
- Status (what stage?)
- Value (what is the commercial exposure?)
- Risk (what is at risk?)
- Action (what should I do?)

### 2.2 Secondary Information

What the user needs to drill into:
- Timeline (what happened?)
- Documents (what evidence?)
- Financial (what is the monetary impact?)
- Assignments (who owns this?)

### 2.3 Tertiary Information

What the user rarely needs:
- Audit history
- System metadata
- Configuration details

---

## 3. State Design

### 3.1 Lifecycle States

Every major object must have explicit visual state:

| State | Color | Meaning |
|-------|-------|---------|
| DRAFT | Slate | Not yet committed |
| PENDING | Awaiting action | Awaiting action |
| ACTIVE | Blue | In progress |
| AT RISK | Amber | Needs attention |
| BLOCKED | Red | Cannot proceed |
| COMPLETE | Green | Done |
| CANCELLED | Gray | Voided |

### 3.2 State Transitions

States should be visually distinct and transitions should be animated where appropriate.

---

## 4. Empty States

Every list must have a meaningful empty state:

- Icon + message
- Call to action (if applicable)
- Link to help/documentation

---

## 5. Loading States

- Skeleton screens for lists
- Spinners for actions
- Progress bars for long operations

---

## 6. Error States

- Clear error message
- Recovery action
- Link to support if needed

---

## 7. Permission-Aware Design

| Permission Level | UI Treatment |
|-----------------|--------------|
| Full access | All actions visible |
| Read-only | Actions hidden/disabled |
| No access | Section hidden |

---

## 8. Responsive Design

### 8.1 Breakpoints

| Breakpoint | Target |
|-----------|--------|
| Mobile (< 640px) | Action-oriented workflows |
| Tablet (640-1024px) | Management + supervision |
| Desktop (> 1024px) | Full operational work |

### 8.2 Mobile-First Workflows

- Assignment
- Execution
- Exception handling
- Approvals
- POD upload

---

## 9. Accessibility

- Keyboard navigation
- Screen reader labels
- Sufficient contrast
- Touch targets ≥ 44x44px
- Reduced motion support

---

## 10. Design System

### 10.1 Typography

Follow existing Tailwind conventions.

### 10.2 Color

| Color | Usage |
|-------|-------|
| Blue | Primary actions, active states |
| Green | Success, completed |
| Amber | Warning, at risk |
| Red | Error, blocked, critical |
| Slate | Neutral, draft, cancelled |

### 10.3 Components

Reuse existing components where possible. Create new only when justified.

---

## 11. Anti-Patterns to Avoid

| Anti-Pattern | Why |
|--------------|-----|
| Module-centric navigation | Users think in business objects, not SBUs |
| Hidden lifecycle states | Users must understand progress |
| No empty states | Users confused by blank screens |
| UI-only authorization | Security must be server-side |
| Desktop-first mobile | Field operations need mobile |
| Duplicate domain logic | Each domain owns its truth |

---

## 12. Traceability

Every design decision traces to:

- Existing canonical architecture (ADR-018..069)
- Persona requirement
- Enterprise/ERP integration requirement
- Existing UI limitation
- Operational workflow

---

**END OF DESIGN PRINCIPLES**
