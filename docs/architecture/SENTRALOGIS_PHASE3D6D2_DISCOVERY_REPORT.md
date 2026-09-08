# SENTRALOGIS — PHASE 3D-6D-2 DISCOVERY & ARCHITECTURE REPORT
## PPJK Workbench Shell & Declaration Summary
**Document Version:** 1.0.0-PHASE3D6D2-DISCOVERY  
**Date:** 26 August 2026  
**Status:** DISCOVERY COMPLETED — EXECUTING IMPLEMENTATION  
**Classification:** Internal Technical Architecture  
**Author:** Principal Software Architect & Senior Indonesian Customs/PPJK Domain Expert  

---

# 1. EXECUTIVE SUMMARY

Phase 3D-6D-2 implements the operational shell and summary workspace for the PPJK Workbench at `/sbu/clearance/declarations/[id]`.
The core philosophy is:
> **"ONE DECLARATION = ONE OPERATIONAL WORKSPACE"**  
> An operational cockpit providing immediate situational awareness on customs declaration identity, health, cargo volume, valuation/tax liabilities, readiness %, and blocking exception issues.

---

# 2. AUDIT OF BACKEND CONTRACTS & CONSUMED APIS

### 2.1 Consumed REST Endpoints
1. `GET /api/v1/customs/declarations/[id]` — Retrieves `CustomsAggregate` containing header entity, classification lines, attached documents, and aggregated financial summary (`total_lines`, `total_cif_usd`, `total_bm_idr`, `total_ppn_idr`, `total_pph_idr`, `total_tax_payable_idr`, `channel`, `is_released`).
2. `POST /api/v1/customs/declarations/[id]/validate` — Executes pre-submission compliance validation and returns `DeclarationValidationReport` with 8/10-category readiness matrix and prioritized issue diagnostics (`ERROR`, `WARNING`, `INFO`).
3. `GET /api/v1/customs/declarations/[id]/documents` — Retrieves supporting customs attachments and verification statuses (`INVOICE`, `PACKING_LIST`, `BL_AWB`, `COO`, `PERMIT`).
4. `GET /api/v1/customs/declarations/[id]/ceisa-preview` — Compiles CEISA 4.0 preparation dataset.

---

# 3. WORKSPACE ARCHITECTURE & COMPONENT TOPOLOGY

```
/sbu/clearance/declarations/[id] (PPJK Workbench Shell)
  │
  ├── WorkbenchHeader
  │     ├── AJU / Declaration Number, Importer, Type, KPPBC
  │     ├── Channel Badge, Status Badge, SPPB Reference
  │     └── Contextual Primary Action (Continue / Validate / Prepare CEISA / View SPPB)
  │
  ├── DeclarationSummaryCard
  │     ├── Identity Block (AJU, Importer, Type, KPPBC, Billing Code)
  │     ├── Cargo Block (Total Lines, Quantity, CIF USD)
  │     ├── Financial Block (BM, PPN, PPh 22, Total Tax IDR)
  │     └── Status Block (Lifecycle, Channel, Readiness %)
  │
  ├── ReadinessCommandBar
  │     ├── Overall Readiness % Progress Bar
  │     └── 8-Category Readiness Grid (Classification, Valuation, Documents, Origin, Tax, Lartas, Transport, Parties)
  │
  ├── WorkbenchAttentionStrip
  │     └── Prioritized Actionable Alerts (🔴 Missing HS, 🔴 Missing Docs, 🟠 Price Anomaly, 🟠 Lartas)
  │
  ├── WorkbenchTabNav
  │     └── Horizontal Tabs (?tab=overview | items | classification | documents | valuation | lartas | ceisa | audit)
  │
  └── Active Tab Workspace
        ├── OverviewTabWorkspace (Operational Health, Breakdown, Recent Activity)
        └── Placeholder Workspaces for subsequent specialized sub-phases
```

---

# 4. FILES TO BE CREATED / MODIFIED

### Files to Create:
1. `components/workspaces/customs/WorkbenchHeader.tsx`
2. `components/workspaces/customs/DeclarationSummaryCard.tsx`
3. `components/workspaces/customs/ReadinessCommandBar.tsx`
4. `components/workspaces/customs/WorkbenchAttentionStrip.tsx`
5. `components/workspaces/customs/WorkbenchTabNav.tsx`
6. `components/workspaces/customs/OverviewTabWorkspace.tsx`
7. `app/(dashboard)/sbu/clearance/declarations/[id]/page.tsx`
8. `lib/domain/customs/__tests__/ppjk-workbench-shell.test.ts`
9. `docs/architecture/SENTRALOGIS_PHASE3D6D2_DISCOVERY_REPORT.md`
10. `docs/architecture/SENTRALOGIS_PHASE3D6D2_IMPLEMENTATION_REPORT.md`

### Files to Modify:
1. `scratch/run-tests.ts` (Register Phase 3D-6D-2 test suite)

### Protected Systems (100% Frozen & Untouched):
- `android/app/src/main/java/com/sentralogis/driver/*`
- `app/jo/[token]/page.tsx`
- `app/api/jo/*`
- `src/domains/trucking/*`
- Tabel produksi: `job_orders`, `job_routes`, `job_tracking`, `data_armada`, `data_driver`, `md_locations`, `md_entities`, `md_tenants`
- Legacy Forwarding UI (`/sbu/forwarding/wo/*`)

---

# 5. INVARIANTS & SECURITY SAFEGUARDS

1. **Zero Browser Direct Database Access:** 100% of data access is mediated through REST APIs (`/api/v1/customs/*`).
2. **Server-Enforced Tenant Isolation:** Session authentication context determines data access bounds; cross-tenant declarations return 403/404.
3. **Human-in-the-Loop CEISA Invariant:** Sentralogis is the PPJK Operational Intelligence & Preparation Layer. It contains zero scraping, botting, or automated submission to CEISA 4.0.

---
*Discovery complete. Executing implementation.*
