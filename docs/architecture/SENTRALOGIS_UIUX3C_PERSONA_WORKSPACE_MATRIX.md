# SENTRALOGIS — UI/UX-3C
# PERSONA WORKSPACE MATRIX

**Date:** 2026-09-01  

---

| Persona | Workspace | Primary Navigation | Copilot Capability | Key Entities | Entry Points |
|---------|-----------|-------------------|-------------------|--------------|--------------|
| Commercial / Sales | Commercial | Customers, Engagements, Quotes, SO | Quote analysis, Customer insights, Pricing recommendations | `md_entities`, `commercial_work_orders`, `crm_quotations`, `sales_orders` | Sidebar → Commercial |
| Customer Success | Customer Success | Customers, Engagements, Orders, Exceptions | Order status, Exception management, SLA tracking | `sales_orders`, `shp_shipments`, Control Tower | Sidebar → Customer Success |
| Operations | Operations | Work Queue, Forwarding, Trucking, Customs, Warehouse | Shipment tracking, Execution status, Resource assignment | `shp_shipments`, `job_orders`, `fw_*`, `cus_declarations`, `wh_*` | Sidebar → Operations |
| Finance | Financial | Invoices, AR, AP, Payments, Settlements | Invoice status, Payment matching, Reconciliation | `fin_invoices`, `fin_ar_ap`, `fin_payments`, `fin_settlements` | Sidebar → Finance |
| Control Tower | Intelligence | Operational Health, Financial Health, Exceptions, SLA | Cross-domain visibility, Exception prioritization | Aggregates from all domains | Sidebar → Intelligence |
| Customer | Customer Portal | Orders, Shipments, Tracking, Documents, Invoices | Order tracking, Document access, Support | Own orders/shipments only | `/portal/customer` |
| Vendor / Partner | Partner Portal | Assignments, Jobs, Shipments, Documents, Performance | Assignment status, POD submission, Performance | Own assignments/jobs only | `/portal/partner` |
| Driver / Field | Driver Portal | Today's Tasks, Active Job, Route, POD | Task guidance, Route optimization, Incident reporting | Own JOs only | `/driver/portal` |
| Admin | Administration | Users, Roles, Tenants, Settings | User management, Configuration | `tenant_users`, `md_tenants` | Sidebar → Administration |

---

## Workspace Composition

### Commercial Workspace
```
Dashboard
├── My Work (pending approvals, active quotes)
├── Customers (list, 360)
├── Engagements (list, detail, create)
├── Quotes (list, builder, convert)
├── Sales Orders (list, detail, create)
└── Pricing (rate masters, overrides)
```

### Operations Workspace
```
Dashboard
├── My Work (assigned jobs, exceptions)
├── Work Queue (cross-SBU)
├── Forwarding (shipments, consolidations)
├── Trucking (work orders, assignments, fleet)
├── Customs (declarations)
└── Warehouse (inbound, outbound, inventory)
```

### Financial Workspace
```
Dashboard
├── My Work (pending approvals, overdue invoices)
├── Invoices (customer, vendor)
├── AR (receivables, aging)
├── AP (payables, cost audit)
├── Payments (record, allocate)
├── Settlements (allocation, status)
└── Reconciliation (matching, exceptions)
```

---

**END OF PERSONA WORKSPACE MATRIX**
