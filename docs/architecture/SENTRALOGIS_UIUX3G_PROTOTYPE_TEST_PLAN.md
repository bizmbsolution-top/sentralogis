# SENTRALOGIS — UI/UX-3G
# PROTOTYPE TEST PLAN

**Date:** 2026-09-01  

---

## 1. Commercial Scenario Tests

### Scenario A — Quote-Based Order
```
Login as CS → Create Engagement → Create Quote → Add lines → Set pricing → Send → Customer approves → Convert to SO → Create Fulfillment → Verify
```

### Scenario B — Direct Order
```
Login as CS → Create Engagement → Create Direct Order → Select capabilities → Add lines → Confirm → Verify
```

### Scenario C — Multi-Capability Order
```
Login as CS → Create SO → Add forwarding + customs + trucking lines → Confirm → Create fulfillment → Verify allocations
```

### Scenario D — Pricing Override
```
Login as CS → Open SO line → Request override → Enter reason → Submit for approval → Manager approves → Verify committed price
```

---

## 2. Operations Scenario Tests

### Scenario E — Shipment Tracking
```
Login as Ops → Open work queue → Open shipment → View timeline → Update status → Add document → Verify
```

### Scenario F — Driver Assignment
```
Login as Ops → Open JO → Assign driver + fleet → Confirm → Driver notified → Verify
```

### Scenario G — Exception Handling
```
Login as Ops → View exceptions → Open shipment → Report delay → Add reason → Escalate → Verify
```

---

## 3. Finance Scenario Tests

### Scenario H — Invoice Creation
```
Login as Finance → Open SO → Create invoice → Add lines → Set tax → Send → Verify
```

### Scenario I — Payment Recording
```
Login as Finance → Record payment → Allocate to invoices → Confirm → Verify AR balance
```

### Scenario J — Reconciliation
```
Login as Finance → Receive external statement → Match to payment → Confirm → Verify
```

---

## 4. Customer Success Scenario Tests

### Scenario K — Customer Health
```
Login as CS → View customer portfolio → Open customer 360 → View active orders → View exceptions → Contact customer → Verify
```

---

## 5. Control Tower Scenario Tests

### Scenario L — Operational Health
```
Login as Mgmt → View Control Tower → Check operational health → View exceptions → Drill into shipment → View Copilot recommendations → Verify
```

---

## 6. Customer Portal Scenario Tests

### Scenario M — Order Tracking
```
Login as Customer → View my orders → Open order → Track shipment → View documents → Download invoice → Verify
```

### Scenario N — Quote Approval
```
Login as Customer → Receive quote → View details → Approve/Reject → Verify
```

---

## 7. Vendor Portal Scenario Tests

### Scenario O — Assignment View
```
Login as Vendor → View assignments → Open job → View pickup/delivery → Update status → Upload POD → Verify
```

---

## 8. Copilot Scenario Tests

### Scenario P — Global Search
```
Press ⌘K → Type "Show delayed shipments" → View results → Select shipment → Verify navigation
```

### Scenario Q — Contextual Explanation
```
Open SO → Ask Copilot "Explain this margin" → View explanation → Verify
```

### Scenario R — Action Preparation
```
Open SO → Ask Copilot "Create fulfillment" → View proposal → Confirm → Verify fulfillment created
```

### Scenario S — Authorization Boundary
```
Ask Copilot to perform action without permission → View authorization required message → Verify
```

---

## 9. Mobile Scenario Tests

### Scenario T — Mobile Tracking
```
Access on mobile → View shipments → Track shipment → View milestones → Verify
```

### Scenario U — Mobile Approval
```
Access on mobile → View approvals → Approve override → Verify
```

---

## 10. Accessibility Scenario Tests

### Scenario V — Keyboard Navigation
```
Tab through all interactive elements → Verify logical order → Activate actions with keyboard → Verify
```

### Scenario W — Screen Reader
```
Use screen reader → Verify ARIA labels announced → Navigate workspace → Verify
```

---

## 11. Authorization Tests

### Scenario X — Cross-Tenant Isolation
```
Tenant A user tries to access Tenant B data → Verify denied → Verify no data leakage
```

### Scenario Y — Permission Visibility
```
User without permission views workspace → Verify action hidden → Verify server enforcement
```

---

**END OF PROTOTYPE TEST PLAN**
