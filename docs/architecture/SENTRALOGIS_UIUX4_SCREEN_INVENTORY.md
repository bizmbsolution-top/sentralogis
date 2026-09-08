# SENTRALOGIS — PHASE UI/UX-4
# SCREEN INVENTORY

**Date:** 2026-09-02  

---

| Screen | Persona | Business Object | Lifecycle | Current State | Action | Authority | Recommendation |
| ------ | ------- | --------------- | --------- | ------------- | ------ | --------- | -------------- |
| Command Center | All | Cross-domain | All | EXISTS | EVOLVE | All | Attention-centric redesign |
| My Work Queue | All | Work | Assigned | PARTIAL | EVOLUE | All | Cross-SBU aggregation |
| Sales Order List | Commercial | Sales Order | All | EXISTS | KEEP | commercial:read | Minor refinements |
| Sales Order Detail | Commercial | Sales Order | Confirmed | EXISTS | KEEP | commercial:read | Add fulfillment tab |
| Sales Order Create | Commercial | Sales Order | DRAFT | EXISTS | KEEP | commercial:manage | Add direct order flow |
| Quote List | Commercial | Quote | All | EXISTS | KEEP | commercial:read | Minor refinements |
| Quote Builder | Commercial | Quote | DRAFT | EXISTS | KEEP | commercial:manage | Minor refinements |
| Fulfillment List | Commercial | Fulfillment | All | EXISTS | KEEP | commercial:read | Minor refinements |
| Fulfillment Detail | Commercial | Fulfillment | Active | EXISTS | EVOLVE | commercial:read | Add allocation view |
| Fulfillment Create | Commercial | Fulfillment | PLANNED | EXISTS | KEEP | commercial:manage | Add capability selection |
| Shipment List | Operations | Shipment | All | EXISTS | EVOLVE | shipment:read | Unify forwarding/trucking |
| Shipment Detail | Operations | Shipment | In Transit | EXISTS | REDESIGN | shipment:read | Unified workspace |
| Shipment Create | Operations | Shipment | DRAFT | PARTIAL | EVOLVE | shipment:manage | Service scope selection |
| Work Order List | Operations | Work Order | All | EXISTS | EVOLVE | job_order:read | Cross-SBU view |
| Work Order Detail | Operations | Work Order | Active | EXISTS | KEEP | job_order:read | Add execution context |
| Job Order List | Operations | Job Order | All | EXISTS | EVOLVE | job_order:read | Assignment view |
| Job Order Detail | Operations | Job Order | Assigned | EXISTS | KEEP | job_order:read | Add completion flow |
| Assignment Modal | Operations | Assignment | Assigned | EXISTS | KEEP | job_order:assign | Minor refinements |
| Exception List | All | Exception | Open | PARTIAL | REDESIGN | All | First-class experience |
| Exception Detail | All | Exception | Open | PARTIAL | REDESIGN | All | Impact + resolution |
| Customer Directory | Commercial | Customer | Active | EXISTS | KEEP | commercial:read | Minor refinements |
| Customer 360 | Commercial | Customer | Active | PARTIAL | REDESIGN | commercial:read | Full lifecycle view |
| Invoice List | Finance | Invoice | All | EXISTS | KEEP | finance:read | Minor refinements |
| Invoice Detail | Finance | Invoice | Sent | EXISTS | KEEP | finance:read | Add payment tracking |
| AR Aging | Finance | Receivable | Outstanding | PARTIAL | REDESIGN | finance:read | Aging matrix |
| Payment Record | Finance | Payment | Pending | PARTIAL | EVOLVE | finance:manage | Allocation workflow |
| Settlement List | Finance | Settlement | All | PARTIAL | EVOLVE | finance:read | Add reconciliation |
| Tracking (Public) | Customer | Shipment | In Transit | EXISTS | KEEP | Public | Token-based access |
| Customer Portal | Customer | Order | All | PARTIAL | REDESIGN | Customer | Order → Fulfillment → Shipment |
| Vendor Portal | Vendor | Assignment | All | PARTIAL | REDESIGN | Vendor | Assignments → Execute → POD |
| Copilot Chat | All | Cross-domain | All | EXISTS | EVOLVE | All | Operational decision layer |
| Token Economics Admin | Super Admin | Token | Config | PARTIAL | REDESIGN | Super Admin | Value + rates + rules |
| User Management | Admin | User | Active | EXISTS | KEEP | tenant:manage | Minor refinements |
| Role Management | Admin | Role | Active | PARTIAL | EVOLVE | tenant:manage | Permission matrix |
| Tenant Config | Super Admin | Tenant | Active | EXISTS | KEEP | tenant:manage | Minor refinements |
| Intelligence Dashboard | Mgmt | Cross-domain | All | PARTIAL | REDESIGN | intelligence:read | Unified analytics |
| Risk Dashboard | Mgmt | Risk | Active | PARTIAL | REDESIGN | intelligence:read | Customer/Vendor/Operational |
| Mobile Operations | Ops | Execution | Active | POOR | REDESIGN | job_order:update | Action-oriented |

---

**Legend:**
- **KEEP:** Existing screen, minor refinements only
- **EVOLVE:** Existing screen, significant improvements
- **REDESIGN:** New screen or major redesign
- **DEPRECATE:** Remove in favor of another screen
- **NEW:** Screen does not exist yet

---

**END OF SCREEN INVENTORY**
