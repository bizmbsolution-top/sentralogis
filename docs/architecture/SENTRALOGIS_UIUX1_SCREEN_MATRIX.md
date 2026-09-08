# SENTRALOGIS — PHASE UI/UX-1
# SCREEN MATRIX

**Date:** 2026-09-01  

---

| Screen | Domain | Current Route | Target Route | Action | Priority |
| ------ | ------ | ------------- | ------------ | ------ | -------- |
| Sales Pipeline | Commercial | `/commercial/pipeline` | `/commercial/engagements` | REDESIGN | HIGH |
| Leads | Commercial | `/commercial/leads` | `/commercial/customers` | REUSE | MEDIUM |
| Quotes | Commercial | `/commercial/quotations/[id]` | `/commercial/quotes/[id]` | REUSE | HIGH |
| Quote List | Commercial | MISSING | `/commercial/quotes` | CREATE | HIGH |
| SO List | Commercial | `/commercial/sales-orders` | `/commercial/sales-orders` | REUSE | HIGH |
| SO Create | Commercial | `/commercial/sales-orders/create` | `/commercial/sales-orders/create` | ENHANCE | HIGH |
| SO Detail | Commercial | `/commercial/sales-orders/[id]` | `/commercial/sales-orders/[id]` | ENHANCE | HIGH |
| SO Fulfillment | Commercial | `/commercial/sales-orders/[id]/fulfillment` | `/commercial/sales-orders/[id]/fulfillment` | REUSE | HIGH |
| Engagement | Commercial | MISSING | `/commercial/engagements` | CREATE | CRITICAL |
| Control Tower | Commercial | `/commercial/control-tower` | `/commercial/control-tower` | REUSE | MEDIUM |
| FWD Work Queue | Operations | `/sbu/forwarding/work-queue` | `/operations/forwarding` | REUSE | HIGH |
| FWD WO List | Operations | `/sbu/forwarding/wo` | RETIRE | RETIRE | LOW |
| FWD Shipments | Operations | `/sbu/forwarding/shipments` | `/operations/forwarding/shipments` | REUSE | HIGH |
| FWD Consol | Operations | `/sbu/forwarding/consol` | `/operations/forwarding/consolidations` | REUSE | MEDIUM |
| FWD Pricing | Operations | `/sbu/forwarding/master/price` | `/pricing/rate-masters` | MOVE | MEDIUM |
| FWD Finances | Financial | `/sbu/forwarding/finances` | `/financial/invoices` | REPLACE | LOW |
| Truck WO List | Operations | `/sbu/trucking/work-orders` | `/operations/trucking` | REUSE | HIGH |
| Truck Assign | Operations | `/sbu/trucking/assignments` | `/operations/trucking/assignments` | REUSE | MEDIUM |
| Truck Fleet | Operations | `/sbu/trucking/fleet` | `/operations/trucking/fleet` | REUSE | MEDIUM |
| Truck Finance | Financial | `/sbu/trucking/finances` | `/financial/invoices` | REPLACE | LOW |
| Customs Decl | Operations | `/sbu/clearance/declarations` | `/operations/customs` | REUSE | HIGH |
| WH Inbound | Operations | `/sbu/warehouse/inbound` | `/operations/warehouse/inbound` | REUSE | HIGH |
| WH Outbound | Operations | `/sbu/warehouse/outbound` | `/operations/warehouse/outbound` | REUSE | HIGH |
| WH Inventory | Operations | `/sbu/warehouse/inventory-report` | `/operations/warehouse/inventory` | REUSE | MEDIUM |
| WH Finance | Financial | `/sbu/warehouse/finances` | `/financial/invoices` | REPLACE | LOW |
| Finance Summary | Financial | `/hq/finance/summary` | `/financial/overview` | MOVE | MEDIUM |
| Cost Audit | Financial | `/hq/finance/cost-audit` | `/financial/cost-audit` | REUSE | HIGH |
| Cust Invoice | Financial | `/hq/invoice-customer` | `/financial/invoices/customer` | MOVE | MEDIUM |
| Vend Invoice | Financial | `/hq/invoice-vendor` | `/financial/invoices/vendor` | MOVE | MEDIUM |
| Ledger | Financial | `/hq/finance/ledger` | `/financial/ledger` | MOVE | LOW |
| Payroll | Financial | `/hq/finance/payroll` | `/financial/payroll` | MOVE | LOW |
| COA | Financial | `/hq/finance/coa` | `/pricing/coa` | MOVE | LOW |
| Tax | Financial | `/hq/finance/tax-management` | `/financial/tax` | MOVE | LOW |
| Contracts | Financial | `/hq/warehouse/billing` | `/pricing/contracts` | MOVE | MEDIUM |

---

**END OF SCREEN MATRIX**
