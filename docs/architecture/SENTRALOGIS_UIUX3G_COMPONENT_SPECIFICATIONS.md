# SENTRALOGIS — UI/UX-3G
# COMPONENT SPECIFICATIONS

**Date:** 2026-09-01  

---

## 1. Existing Components to Reuse

| Component | Location | Reuse In |
|-----------|----------|----------|
| `ControlTowerWorkspace` | `components/control-tower/` | Intelligence workspace |
| `ExecutionHealthBar` | `components/control-tower/` | Shipment detail |
| `FulfillmentPlanCard` | `components/control-tower/` | SO detail |
| `ExceptionsPanel` | `components/control-tower/` | Exceptions |
| `OperationalTimeline` | `components/control-tower/` | Timeline |
| `CustomerProjectionView` | `components/control-tower/` | Customer portal |
| `CommandActionDrawer` | `components/control-tower/` | Actions |
| `ContactFormModal` | `components/master/` | Customer create |
| `AddForwardingItemModal` | `components/hq/` | Forwarding items |
| `CommandCenter` | `components/layout/` | Global search |
| `AppLauncher` | `components/layout/` | App grid |
| `MyWork` | `components/layout/` | Work aggregation |
| `CopilotPanel` | `components/layout/` | AI assistant |
| `Sidebar` | `components/layout/` | Secondary nav |
| `TopBar` | `components/layout/` | Top navigation |

---

## 2. New Components Required

| Component | Purpose | Workspace |
|-----------|---------|-----------|
| `WorkspaceHeader` | Context header with status | All workspaces |
| `ContextTabs` | Entity context navigation | Entity detail |
| `StatusBadge` | Status indicator | All |
| `KPICard` | KPI display | Dashboards |
| `AttentionCard` | Attention item | My Work |
| `ExceptionCard` | Exception display | Exceptions |
| `Timeline` | Chronological events | Entity detail |
| `ActivityFeed` | Audit trail | Entity detail |
| `EntityNavigation` | Context tabs | Entity detail |
| `ConfirmationDialog` | Action confirmation | Copilot |
| `ApprovalPanel` | Approval workflow | Approvals |
| `EmptyState` | No data | All |
| `LoadingState` | Loading | All |
| `ErrorState` | Error | All |
| `PermissionGate` | Authorization UI | All |
| `SOLineEditor` | SO line item editor | SO detail |
| `PricingSummary` | BUY/SELL/Margin | Pricing |
| `OverridePanel` | Override workflow | Pricing |
| `PaymentAllocation` | Payment-to-invoice | Payments |
| `ReconciliationMatcher` | External matching | Reconciliation |

---

## 3. Components That Must NOT Be Duplicated

| Component | Reason |
|-----------|--------|
| `CopilotEngine` | Single source in `src/platforms/copilot/` |
| `PricingService` | Single source in `lib/pricing/` |
| `FinancialService` | Single source in `lib/financial/` |
| `PaymentService` | Single source in `lib/financial/` |
| `IdentityContext` | Single source in `lib/application/identity/` |
| `Authorization` | Single source in `lib/application/identity/` |

---

## 4. Design System Primitives

| Primitive | Usage |
|----------|-------|
| `Button` | Primary, secondary, danger, ghost |
| `Input` | Text, number, date, search |
| `Select` | Single, multi, async |
| `Badge` | Status, type, capability |
| `Card` | Container with header/content |
| `Table` | Sortable, filterable, paginated |
| `Dialog` | Modal, drawer, confirm |
| `Tabs` | Horizontal, vertical |
| `Skeleton` | Loading placeholder |
| `EmptyState` | No data + action |
| `ErrorState` | Error message + retry |

---

**END OF COMPONENT SPECIFICATIONS**
