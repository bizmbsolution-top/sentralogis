# SENTRALOGIS — UI/UX-3D
# PROTOTYPE TEST PLAN

**Date:** 2026-09-01  

---

## 1. Persona Switching Tests

| Test | Steps | Expected |
|------|-------|----------|
| Switch to Commercial | Click workspace switcher → Commercial | Commercial nav visible |
| Switch to Operations | Click workspace switcher → Operations | Operations nav visible |
| Switch to Finance | Click workspace switcher → Finance | Finance nav visible |
| Unauthorized workspace | User without permission tries to access | Workspace hidden/inaccessible |
| Multi-persona user | User with multiple roles sees multiple workspaces | All authorized workspaces visible |

---

## 2. Navigation Tests

| Test | Steps | Expected |
|------|-------|----------|
| Global search | ⌘K → Type "BYD" | Customer results appear |
| Navigate via command | Select "Sales Orders" | Navigates to SO list |
| Context tabs | Open SO → Click "Fulfillment" | Fulfillment tab content loads |
| Back navigation | Click breadcrumb | Returns to previous level |
| Mobile drawer | Click hamburger → Select item | Navigates + closes drawer |

---

## 3. Customer Visibility Tests

| Test | Steps | Expected |
|------|-------|----------|
| Customer sees own orders | Login as customer → Orders | Only own orders visible |
| Customer cannot see other customers | Try to access other customer's order | Access denied |
| Customer cannot see margins | View SO detail | Margin column hidden |
| Token-based tracking | Access `/track/[token]` | Tracking page loads |

---

## 4. Vendor Visibility Tests

| Test | Steps | Expected |
|------|-------|----------|
| Vendor sees own assignments | Login as vendor → Assignments | Only own assignments visible |
| Vendor cannot see other vendors | Try to access other vendor's assignments | Access denied |
| Vendor cannot see internal costs | View assignment detail | Cost/margin hidden |

---

## 5. Authorization Tests

| Test | Steps | Expected |
|------|-------|----------|
| Unauthorized action | User without permission tries to create SO | Action hidden/disabled |
| Server enforcement | Attempt to bypass UI (API call) | Server rejects |
| Permission visibility | View pricing page without `pricing:read` | Page hidden |

---

## 6. Copilot Tests

| Test | Steps | Expected |
|------|-------|----------|
| Global Copilot | ⌘K → "Show delayed shipments" | Results displayed |
| Contextual Copilot | Inside SO → "Explain margin" | Explanation displayed |
| Action confirmation | Copilot proposes consequential action | Confirmation dialog shown |
| Authorization boundary | Copilot proposes action without permission | Authorization required message |
| Explainability | Copilot provides recommendation | Explanation + confidence shown |

---

## 7. Action Confirmation Tests

| Test | Steps | Expected |
|------|-------|----------|
| Informational | Copilot provides info | No confirmation needed |
| Suggestion | Copilot recommends | Review + apply option |
| Prepared action | Copilot constructs action | Confirm/cancel option |
| Consequential action | Copilot proposes high-impact action | Explicit confirmation required |
| Authorization required | User lacks permission | Request approval option |

---

## 8. Mobile Tests

| Test | Steps | Expected |
|------|-------|----------|
| Mobile navigation | Access on mobile | Bottom nav + drawer visible |
| Mobile search | Tap search icon | Full-screen search |
| Mobile actions | Open SO on mobile | Action bar at bottom |
| Responsive tables | View table on mobile | Cards instead of table |
| Touch targets | Tap buttons | Min 44x44px |

---

## 9. Accessibility Tests

| Test | Steps | Expected |
|------|-------|----------|
| Keyboard navigation | Tab through all interactive elements | Logical order |
| Screen reader | Use screen reader | ARIA labels announced |
| Focus state | Tab to element | Visible focus ring |
| Contrast | Check color contrast | WCAG AA minimum |
| Reduced motion | Enable prefers-reduced-motion | Animations reduced |

---

## 10. Regression Tests

| Suite | Baseline |
|-------|----------|
| Full regression | 1255/1255 PASS |

---

**END OF PROTOTYPE TEST PLAN**
