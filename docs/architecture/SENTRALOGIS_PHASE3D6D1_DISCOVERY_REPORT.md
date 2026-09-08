# SENTRALOGIS — PHASE 3D-6D-1 DISCOVERY & ARCHITECTURE REPORT
## Customs Control Center & Declaration Directory Workspace
**Document Version:** 1.0.0-PHASE3D6D1-DISCOVERY  
**Date:** 26 August 2026  
**Status:** DISCOVERY COMPLETED — WAITING FOR USER AUTHORIZATION  
**Classification:** Internal Technical Architecture  
**Author:** Principal Software Architect & Senior Indonesian Customs/PPJK Domain Expert  

---

# 1. EXECUTIVE SUMMARY

Phase 3D-6A (Schema), Phase 3D-6B (Domain Intelligence Engines), and Phase 3D-6C (REST API Gateway) are complete and validated with **185 / 185 tests passing**.

Sub-Phase **3D-6D-1** initiates the frontend implementation of the **Standalone Customs Control Center** (`/sbu/clearance`) and **Declaration Directory** (`/sbu/clearance/declarations`).

---

# 2. AUDIT OF REUSABLE ASSETS & APIS

### 2.1 Reusable UI Component Primitives
- `components/ui/Card.tsx` & `components/ui/GlassCard.tsx`: Operational containers and high-density metric widgets.
- `components/ui/Badge.tsx` & `components/ui/StatusBadge.tsx`: Customs channels (Green, Yellow, Red) and status tags.
- `components/ui/Button.tsx` & `components/ui/GradientButton.tsx`: Contextual action triggers.
- `components/ui/Input.tsx` & `components/ui/GlassInput.tsx`: Search and filter inputs.
- `components/ui/SearchableSelect.tsx`: Importer, status, and customs office filters.
- `components/ui/ProgressBar.tsx`: Declaration readiness progress indicator.
- `lucide-react` icons: `ShieldAlert`, `FileText`, `CheckCircle2`, `AlertTriangle`, `Search`, `Filter`, `ArrowUpRight`, `Download`, `RefreshCw`, `Layers`, `ExternalLink`.

### 2.2 Available Backend REST APIs
- `GET /api/v1/customs/declarations`: Lists declarations with status, channel, importer, and limit filters.
- `GET /api/v1/customs/declarations/[id]`: Complete declaration aggregate with item lines, tax totals, and channel state.
- `POST /api/v1/customs/declarations/[id]/validate`: Pre-submission diagnostic validation returning readiness matrix and issue lists.
- `GET /api/v1/customs/declarations/[id]/ceisa-preview`: Canonical CEISA 4.0 preparation dataset compiler.
- `GET /api/v1/customs/declarations/[id]/documents`: List of attached supporting documents.
- `GET /api/v1/customs/sku-intelligence`: Importer-scoped SKU master memory catalog.
- `GET /api/v1/customs/hs-lookup`: BTKI 8-digit tariff reference search.

---

# 3. ARCHITECTURAL INVARIANTS & SECURITY BOUNDARIES

1. **Zero Browser Direct Database Access:** UI components must consume REST APIs (`/api/v1/customs/*`) via `fetch`. No `supabase.from(...)` in workspace components.
2. **Server-Derived Identity:** Tenant identity is resolved strictly server-side by `resolveCustomsAuthContext`. Client payload tenant overrides are ignored.
3. **CEISA 4.0 Compliance Invariant:** Sentralogis is the PPJK Operational Intelligence & Preparation Layer. It contains **zero scraping, zero browser botting, and zero unauthorized submission automation**.
4. **Protected Domains:** Production trucking tables (`job_orders`, `job_routes`, `job_tracking`), Driver PWA, Android GPS service, and legacy Forwarding (`/sbu/forwarding/wo/*`) remain 100% untouched.

---

# 4. COMPONENT BLUEPRINT FOR SUB-PHASE 3D-6D-1

```
/sbu/clearance (Customs Control Center)
  ├── CustomsControlHeader (Title, Tenant Identity, Quick Actions, Refresh)
  ├── CustomsKpiGrid (Active, Draft, Errors, Warnings, Waiting Docs, Waiting Classification, Ready, Released)
  ├── CustomsAttentionPanel (Interactive Priority Queue: Missing HS, Price Anomalies, Lartas Flags, Missing Docs)
  └── QuickActionStrip ("Open Directory", "New Declaration", "Import Batch")

/sbu/clearance/declarations (Declaration Directory)
  ├── DeclarationDirectoryHeader (Title, Total Count, Search, Quick Filters)
  ├── DeclarationDirectoryTable (High-Density Table: AJU, Importer, Type, Items, Channel, Tax, Status, Next Action)
  ├── DeclarationStatusBadge (Color-coded badges for Customs Lifecycle & Channels)
  └── DeclarationCard (Responsive card view for tablet / mobile viewports)
```

---

# 5. EXACT FILES TO CREATE / MODIFY IN SUB-PHASE 3D-6D-1

### Files to Create:
1. `components/workspaces/customs/CustomsControlHeader.tsx`
2. `components/workspaces/customs/CustomsKpiGrid.tsx`
3. `components/workspaces/customs/CustomsAttentionPanel.tsx`
4. `components/workspaces/customs/DeclarationStatusBadge.tsx`
5. `components/workspaces/customs/DeclarationDirectoryTable.tsx`
6. `components/workspaces/customs/DeclarationCard.tsx`
7. `app/(dashboard)/sbu/clearance/page.tsx` (Replaces placeholder with live Customs Control Center)
8. `app/(dashboard)/sbu/clearance/declarations/page.tsx` (High-density Declaration Directory)
9. `lib/domain/customs/__tests__/customs-control-center-ui.test.ts` (Acceptance test suite)
10. `docs/architecture/SENTRALOGIS_PHASE3D6D1_DISCOVERY_REPORT.md` (This document)

### Files to Modify:
1. `components/layout/Sidebar.tsx` (Ensure SBU Clearance navigation links are active for relevant roles)
2. `scratch/run-tests.ts` (Register Phase 3D-6D-1 test suite)

---

# 6. ACCEPTANCE TEST PLAN (15 SCENARIOS)

- **Test 1:** Customs Control Center loads aggregate operational KPI metrics.
- **Test 2:** Attention Queue categorizes actionable items by severity.
- **Test 3:** Attention item click applies target filter to declaration directory.
- **Test 4:** Declaration Directory renders high-density columns.
- **Test 5:** Status filter correctly filters declarations.
- **Test 6:** Channel filter isolates GREEN, YELLOW, RED channels.
- **Test 7:** Search filter queries by AJU number and importer name.
- **Test 8:** Contextual "Open Workbench" CTA navigates to `/sbu/clearance/declarations/[id]`.
- **Test 9:** Responsive layout degrades gracefully on tablet and mobile viewports.
- **Test 10:** Zero direct `supabase.from(...)` browser access in all created components.
- **Test 11:** Multi-tenant boundary verified on all declaration queries.
- **Test 12:** Tax amounts formatted in Indonesian Rupiah (IDR).
- **Test 13:** Empty state renders helpful onboarding guide.
- **Test 14:** Error banner handles network/server failures cleanly.
- **Test 15:** Protected trucking and driver domains remain 100% frozen.

---
*Discovery complete. Architecture is verified and ready for execution upon user authorization.*
