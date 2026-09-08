# SENTRALOGIS — UI/UX-4 DESIGN SYSTEM

**Date:** 2026-09-02  

---

## 1. Design Principles

| Principle | Description |
|-----------|-------------|
| **Business-Object Centric** | Users think in Orders, Fulfillment, Shipments — not SBU modules |
| **Lifecycle Visibility** | Every object's stage is immediately visible |
| **Attention First** | Command Center answers "What needs my attention?" |
| **Context Preservation** | Users never lose context between related objects |
| **Authority Clarity** | Users understand what they can/cannot do |
| **Domain Sovereignty** | Forwarding, Customs, Trucking, Warehouse remain sovereign |
| **Composability** | One Shipment may contain multiple services |
| **ERP Coexistence** | Clear boundary between ERP and SENTRALOGIS truth |
| **Mobile Operational** | Field workflows are mobile-first |

---

## 2. Visual Language

### 2.1 Typography

Follow existing Tailwind conventions. No changes.

### 2.2 Color Semantics

| Color | Usage |
|-------|-------|
| Blue | Primary actions, active states, info |
| Green | Success, completed, positive |
| Amber | Warning, at risk, pending action |
| Red | Error, blocked, critical, exception |
| Slate | Neutral, draft, cancelled, disabled |

### 2.3 Status Colors

| Status | Color | Usage |
|--------|-------|-------|
| DRAFT | Slate | Not yet committed |
| PENDING | Awaiting action | Awaiting action |
| ACTIVE | Blue | In progress |
| AT_RISK | Amber | Needs attention |
| BLOCKED | Red | Cannot proceed |
| COMPLETED | Green | Done |
| CANCELLED | Gray | Voided |

---

## 3. Component Strategy

### 3.1 KEEP

| Component | Reason |
|-----------|--------|
| Button | Consistent, accessible |
| Input | Consistent, accessible |
| Select | Consistent, accessible |
| Table | Sortable, filterable |
| Card | Container with header/content |
| Dialog | Modal, drawer |
| Tabs | Horizontal, vertical |
| Badge | Status, type indicator |
| Skeleton | Loading placeholder |
| EmptyState | No data + action |
| ErrorState | Error + retry |

### 3.2 EVOLVE

| Component | Evolution |
|-----------|-----------|
| StatusBadge | Add lifecycle stage indicators |
| Timeline | Add milestone visualization |
| ExceptionCard | Add impact + resolution |
| CommandBar | Add contextual commands |

### 3.3 NEW

| Component | Purpose |
|-----------|---------|
| AttentionCard | Command Center attention item |
| LifecycleIndicator | Visual lifecycle stage |
| CompositionGrid | Service composition view |
| ExceptionCenter | First-class exception experience |
| CopilotContext | Contextual Copilot panel |

---

## 4. Interaction Patterns

### 4.1 List → Detail

```
List (search/filter/sort) → click row → Detail (tabs + actions) → back to list (preserved state)
```

### 4.2 Create Flow

```
List → Create Button → Form → Validate → Submit → Detail
```

### 4.3 Command Bar

```
Context-aware actions appear in command bar based on current object and user permissions
```

### 4.4 Tab Navigation

```
Workspace uses tabs for sub-views. State preserved across tabs.
```

---

## 5. Responsive Strategy

| Breakpoint | Target | Behavior |
|------------|--------|----------|
| Mobile (< 640px) | Action-oriented | Bottom nav, cards, minimal tables |
| Tablet (640-1024px) | Management | Collapsible sidebar, hybrid tables |
| Desktop (> 1024px) | Full operations | Full sidebar, data tables |

---

## 6. Empty States

Every list must have:
- Icon + message
- Call to action (if applicable)
- Link to help

---

## 7. Loading States

- Skeleton screens for lists
- Spinners for actions
- Progress bars for long operations

---

## 8. Error States

- Clear error message
- Recovery action
- Link to support

---

**END OF DESIGN SYSTEM**
