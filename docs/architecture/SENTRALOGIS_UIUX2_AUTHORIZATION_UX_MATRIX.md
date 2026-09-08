# SENTRALOGIS — UI/UX-2
# AUTHORIZATION UX MATRIX

**Date:** 2026-09-01  

---

## 1. Permission-to-UI Mapping

| Permission | UI Element | Visibility |
|------------|------------|------------|
| `commercial:read` | Commercial nav group | Visible |
| `commercial:manage` | Create buttons, Edit actions | Visible |
| `commercial:read` | SO list, SO detail | Visible |
| `commercial:manage` | Create SO, Amend, Cancel | Visible |
| `commercial:read` | Quote list, Quote detail | Visible |
| `commercial:manage` | Create Quote, Edit, Send | Visible |
| `pricing:read` | Pricing nav group | Visible |
| `pricing:manage` | Rate master CRUD | Visible |
| `pricing:override` | Override button | Visible |
| `pricing:approve` | Approve override | Visible |
| `financial:read` | Financial nav group | Visible |
| `financial:manage` | Create invoice, Record payment | Visible |
| `job_order:read` | Operations work queue | Visible |
| `job_order:assign` | Assign button | Visible |

---

## 2. Action Authorization Matrix

| Action | Permission | UI Enforcement | Server Enforcement |
|--------|------------|---------------|-------------------|
| Create Engagement | `commercial:manage` | Button visible | assertPermission |
| Create Quote | `commercial:manage` | Button visible | assertPermission |
| Create SO | `commercial:manage` | Button visible | assertPermission |
| Amend SO | `commercial:manage` | Button visible | assertPermission |
| Cancel SO | `commercial:manage` | Button + confirm | assertPermission |
| Create Fulfillment | `commercial:manage` | Button visible | assertPermission |
| Create Invoice | `commercial:manage` | Button visible | assertPermission |
| Record Payment | `commercial:manage` | Button visible | assertPermission |
| Override Price | `pricing:override` | Button visible | assertPermission |
| Approve Override | `pricing:approve` | Button visible | assertPermission |
| Assign JO | `job_order:assign` | Button visible | assertPermission |
| View Margin | `commercial:read` | Section visible | RLS |

---

## 3. Role-Based UI

| Role | Primary Workspace | Visible Modules |
|------|-------------------|-----------------|
| CS | Commercial | Customers, Engagements, Quotes, SO |
| Sales | Commercial | Pipeline, Quotes, SO |
| SBU Operator | Operations | Work queue, Execution |
| Finance | Financial | Invoices, AR/AP, Payments |
| Pricing Manager | Pricing | Rate masters, Overrides |
| Management | Intelligence | All (read) |

---

## 4. Security Rules

1. **Never rely on UI hiding alone** — server must enforce
2. **Client tenant_id is never trusted** — always from IdentityContext
3. **Browser Supabase writes are prohibited** — all mutations via server
4. **RLS is the final enforcement layer** — independent of UI

---

**END OF AUTHORIZATION UX MATRIX**
