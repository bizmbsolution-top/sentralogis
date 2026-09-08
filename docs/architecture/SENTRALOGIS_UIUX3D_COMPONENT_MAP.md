# SENTRALOGIS — UI/UX-3D
# COMPONENT MAP

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

---

## 2. New UI Components Required

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
| `CommandSurface` | Search + commands | Global |
| `AppGrid` | App launcher | Global |
| `MyWorkPanel` | Work aggregation | Global |
| `CopilotPanel` | AI assistant | Global |
| `ConfirmationDialog` | Action confirmation | Copilot |
| `ApprovalPanel` | Approval workflow | Approvals |
| `EmptyState` | No data | All |
| `LoadingState` | Loading | All |
| `ErrorState` | Error | All |
| `PermissionGate` | Authorization UI | All |

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

## 4. Screen-to-Component Mapping

| Screen | Components |
|--------|-----------|
| Commercial Dashboard | WorkspaceHeader, KPICard, AttentionCard, MyWorkPanel |
| Customer 360 | WorkspaceHeader, ContextTabs, Timeline, ActivityFeed |
| SO Detail | WorkspaceHeader, ContextTabs, FulfillmentPlanCard, ExceptionCard |
| Shipment Detail | WorkspaceHeader, ContextTabs, ExecutionHealthBar, Timeline |
| Invoice Detail | WorkspaceHeader, ContextTabs, Timeline, ActivityFeed |
| Work Queue | WorkspaceHeader, StatusBadge, AttentionCard |
| Control Tower | WorkspaceHeader, KPICard, ExceptionsPanel, OperationalTimeline |
| Customer Portal | WorkspaceHeader, CustomerProjectionView, StatusBadge |
| Vendor Portal | WorkspaceHeader, StatusBadge, Timeline |

---

**END OF COMPONENT MAP**
