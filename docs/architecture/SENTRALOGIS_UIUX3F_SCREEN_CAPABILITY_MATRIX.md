# SENTRALOGIS — UI/UX-3F
# SCREEN-CAPABILITY MATRIX

**Date:** 2026-09-01  

---

| Workspace | Screen | User Persona | Action | Existing Capability | API/Service | Authorization | Lifecycle | Copilot | Missing? |
| --------- | ------ | ------------ | ------ | ------------------- | ----------- | ------------- | --------- | ------- | -------- |
| Commercial | Dashboard | CS/Sales | View stats | Aggregates | REST | `commercial:read` | N/A | Summary | No |
| Commercial | Customer list | CS/Sales | View customers | `md_entities` | REST | `commercial:read` | N/A | Find | No |
| Commercial | Engagement list | CS/Sales | View engagements | `commercial_work_orders` | REST | `commercial:read` | N/A | **YES (UI)** |
| Commercial | Engagement create | CS/Sales | Create engagement | `commercial_work_orders` | REST | `commercial:manage` | DRAFT | **YES (UI)** |
| Commercial | Quote list | CS/Sales | View quotes | `crm_quotations` | REST | `commercial:read` | N/A | Analyze | No |
| Commercial | Quote builder | CS/Sales | Create/edit quote | `crm_quotations` | REST | `commercial:manage` | DRAFT | Pricing | No |
| Commercial | Quote convert | CS/Sales | Convert to SO | `sales_orders` | REST | `commercial:manage` | APPROVED | **YES (UI)** |
| Commercial | SO list | CS/Sales | View SOs | `sales_orders` | REST | `commercial:read` | N/A | Find | No |
| Commercial | SO create | CS/Sales | Create SO | `sales_orders` | REST | `commercial:manage` | DRAFT | **YES (UI)** |
| Commercial | SO detail | CS/Sales | View SO | `sales_orders` | REST | `commercial:read` | N/A | Explain | No |
| Commercial | SO lines | CS/Sales | Edit lines | `sales_order_items` | Future | `commercial:manage` | DRAFT | **YES (backend)** |
| Commercial | Fulfillment create | CS/Sales | Create fulfillment | `fulfillments` | REST | `commercial:manage` | PLANNED | **YES (UI)** |
| Operations | Dashboard | Ops | View work | Aggregates | REST | `job_order:read` | N/A | Summary | No |
| Operations | Work queue | Ops | View work items | `shp_shipments`, `job_orders` | REST | `job_order:read` | N/A | Prioritize | No |
| Operations | Shipment detail | Ops | Track shipment | `shp_shipments` | REST | `job_order:read` | N/A | Explain delay | No |
| Operations | WO create | Ops | Create WO | `work_orders` | REST | `job_order:create` | DRAFT | **YES (UI)** |
| Operations | JO assign | Ops | Assign driver | `job_orders` | Future | `job_order:assign` | ASSIGNED | Prepare | **YES (backend)** |
| Finance | Dashboard | Finance | View financials | Aggregates | REST | `commercial:read` | N/A | Summary | No |
| Finance | Invoice list | Finance | View invoices | `fin_invoices` | REST | `commercial:read` | N/A | Find | No |
| Finance | Invoice create | Finance | Create invoice | `fin_invoices` | Future | `commercial:manage` | DRAFT | **YES (backend)** |
| Finance | Payment record | Finance | Record payment | `fin_payments` | Future | `commercial:manage` | PENDING | **YES (backend)** |
| Finance | AR aging | Finance | View receivables | `fin_ar_ap` | REST | `commercial:read` | N/A | **YES (backend)** |
| Intelligence | Dashboard | Mgmt | View health | Aggregates | REST | `commercial:read` | N/A | Summary | No |
| Intelligence | Exceptions | Mgmt | View exceptions | Control Tower | REST | `commercial:read` | N/A | Recommend | No |
| Customer | Orders | Customer | View own orders | `sales_orders` | Future | Customer scope | N/A | **YES (backend)** |
| Customer | Tracking | Customer | Track shipment | `shp_shipments` | Future | Token | N/A | **YES (backend)** |
| Vendor | Assignments | Vendor | View assignments | Future | Future | Vendor scope | N/A | **YES (backend)** |
| Vendor | Jobs | Vendor | View jobs | `job_orders` | Future | Vendor scope | N/A | **YES (backend)** |

---

**Legend:**
- **YES (UI)**: Backend exists, UI missing
- **YES (backend)**: UI exists, backend missing
- **NO**: Both exist

---

**END OF SCREEN-CAPABILITY MATRIX**
