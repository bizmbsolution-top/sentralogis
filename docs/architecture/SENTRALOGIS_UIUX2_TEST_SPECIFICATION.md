# SENTRALOGIS — UI/UX-2
# TEST SPECIFICATION

**Date:** 2026-09-01  

---

## 1. Engagement Tests

| Test | Steps | Expected |
|------|-------|----------|
| Create Engagement | Navigate → New → Fill → Submit | Engagement created without Quote |
| View Engagement | Click engagement from list | Workspace loads with tabs |
| Engagement → Quote | Click "New Quote" | Quote builder opens |
| Engagement → Direct Order | Click "Direct Order" | SO create opens |

---

## 2. Quote Tests

| Test | Steps | Expected |
|------|-------|----------|
| Create Quote | Engagement → New Quote → Add lines → Save | Quote in DRAFT |
| Send Quote | Open quote → Send | Status → SENT |
| Approve Quote | Customer approves | Status → APPROVED |
| Convert to SO | Click "Convert to SO" | SO created from quote |

---

## 3. Direct Order Tests

| Test | Steps | Expected |
|------|-------|----------|
| Create Direct Order | Engagement → Direct Order → Select capabilities → Confirm | SO created |
| Add SO Lines | Add line items with pricing | Lines visible |
| Confirm SO | Click "Confirm" | Status → CONFIRMED |

---

## 4. Regular Order Tests

| Test | Steps | Expected |
|------|-------|----------|
| Create Regular Order | Engagement → Regular Order → Select template → Confirm | SO created |
| Duplicate Order | Click "Duplicate" | New SO from template |

---

## 5. Multi-Capability Tests

| Test | Steps | Expected |
|------|-------|----------|
| Create Multi-Line SO | Add lines for FWD + Customs + Trucking | All capabilities visible |
| Create Fulfillment | SO → Create Fulfillment → Select allocations | Fulfillment created |
| Track Progress | View Control Tower | All capabilities tracked |

---

## 6. Pricing Tests

| Test | Steps | Expected |
|------|-------|----------|
| Rate Selection | SO line → Select rate | Rate details shown |
| Calculation | Enter quantity | Amount calculated |
| Override | Click "Override" → Enter reason | Override pending approval |
| Approve Override | Manager approves | Price committed |

---

## 7. Fulfillment Tests

| Test | Steps | Expected |
|------|-------|----------|
| Create Fulfillment | SO → Create Fulfillment | Composition workspace |
| Add Allocation | Select capability | Allocation added |
| Update Progress | Mark allocation complete | Progress updates |

---

## 8. Financial Tests

| Test | Steps | Expected |
|------|-------|----------|
| Create Invoice | SO → Create Invoice | Invoice in DRAFT |
| Send Invoice | Click "Send" | Status → SENT |
| Record Payment | Invoice → Record Payment | Payment allocated |
| View AR | Financial → AR | Outstanding receivables |

---

## 9. Security Tests

| Test | Steps | Expected |
|------|-------|----------|
| Cross-tenant access | Tenant A tries to access Tenant B order | DENIED |
| Unauthorized mutation | User without permission tries to edit | DENIED |
| Client tenant spoofing | Send fake tenant_id | IGNORED |

---

## 10. Regression Tests

| Suite | Baseline |
|-------|----------|
| Full regression | 1255/1255 PASS |

---

**END OF TEST SPECIFICATION**
