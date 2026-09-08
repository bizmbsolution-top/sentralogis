# SENTRALOGIS — PHASE 3D-6D-3 DISCOVERY & ARCHITECTURE REPORT
## High-Performance PPJK Item / SKU Grid Workspace
**Document Version:** 1.0.0-PHASE3D6D3-DISCOVERY  
**Date:** 26 August 2026  
**Status:** DISCOVERY COMPLETED — EXECUTING IMPLEMENTATION  
**Classification:** Internal Technical Architecture  
**Author:** Principal Software Architect & Senior Indonesian Customs/PPJK Domain Expert  

---

# 1. EXECUTIVE SUMMARY

Phase 3D-6D-3 implements the **High-Performance PPJK Item / SKU Grid** workspace inside `/sbu/clearance/declarations/[id]?tab=items`.
The core design philosophy is:
> **"ENTER ONCE → VALIDATE ONCE → REUSE MANY TIMES"**  
> Transforming slow manual data entry into high-throughput ingestion, instant SKU intelligence matching, exception-first review, and atomic batch persistence for declarations containing 100 to 5,000+ SKU lines.

---

# 2. VIRTUALIZATION & PERFORMANCE ARCHITECTURE

### 2.1 DOM Virtualization Strategy
- A custom high-performance React virtualization engine (`useVirtualGrid`) calculates visible slice boundaries based on container `scrollTop`, viewport height, and row height (48px) with a 10-row overscan buffer.
- **DOM Node Invariant:** For datasets of 1,000 to 10,000 lines, only ~25-35 DOM table rows exist at any time. Memory consumption and DOM layout recalculation remain constant $O(1)$.

### 2.2 Batch Processing & Zero N+1 API Calls
- **Single Batch Fetch:** Item lines, tax totals, and validation diagnostics are loaded via `GET /api/v1/customs/declarations/[id]`.
- **Single Batch Update:** Dirty cell modifications are queued in local state and committed using `PATCH /api/v1/customs/declarations/[id]/items/bulk`.
- **Batch SKU Intelligence:** Master catalog queries are pre-fetched or debounced, avoiding per-keystroke API floods.

---

# 3. KEYBOARD-FIRST MODEL & INLINE EDITING

### 3.1 Keyboard Navigation Map
- `ArrowUp` / `ArrowDown`: Move active row focus.
- `Tab` / `Shift + Tab`: Move active cell focus horizontally across editable columns.
- `Enter`: Commit active cell edit and move down to the same column in the next row (optimized for fast column-wise entry).
- `Escape`: Cancel active edit and revert to draft value.

### 3.2 Controlled Draft & Dirty State
- Modifications update a local `dirtyMap`. Unsaved changes are visually highlighted with a dirty indicator and a global action bar (`X unsaved changes` $\rightarrow$ `[Save Changes]` / `[Discard]`).

---

# 4. SKU INTELLIGENCE & HUMAN-IN-THE-LOOP HS LOOKUP

### 4.1 Intelligence Suggestion Engine
- Matches entered SKU codes against canonical product memory (`cus_sku_intelligence`) with confidence hierarchy (`EXACT_SKU`: 100%, `SKU_MANUFACTURER`: 95%, `SKU_SUPPLIER`: 90%, `FINGERPRINT`: 85%).
- **Strict Human-in-the-Loop Rule:** Suggestions are displayed with confidence scores and historical evidence; the operator must explicitly click `[Apply Suggestion]` or confirm via shortcut. No silent overwrites.

### 4.2 BTKI 8-Digit HS Lookup
- Debounced lookup via `GET /api/v1/customs/hs-lookup?q=...` searching HS codes and Indonesian/English descriptions without loading the entire national tariff table into client memory.

---

# 5. WORKSPACE COMPONENT TOPOLOGY

```
/sbu/clearance/declarations/[id]?tab=items
  │
  ├── PpjkItemGridToolbar (Search, Quick Filters, Bulk Actions, Import/Paste, Save/Discard)
  ├── PpjkItemGridFilters (ALL, ERRORS, WARNINGS, MISSING HS, PRICE ANOMALY, LARTAS, DIRTY)
  ├── PpjkItemGrid (Desktop: Virtualized Spreadsheet Grid / Mobile: Operational Cards)
  │     ├── PpjkItemGridRow (Keyboard Focus, Inline Cell Editors, Status & Tax Badges)
  │     ├── SkuIntelligenceSuggestion (Popover / Inline Suggestion Badge)
  │     └── HsLookupPopover (Fast Bilingual 8-digit BTKI Search)
  ├── PpjkItemDetailDrawer (Deep-dive on SKU History, Valuation Variance, Lartas Permits)
  └── BulkImportDialog (Excel/CSV upload & Clipboard Tab-Separated Paste with Preview)
```

---

# 6. EXACT FILES TO CREATE / MODIFY

### Files to Create:
1. `lib/hooks/useVirtualGrid.ts` — Virtualization hook for high-density tables.
2. `components/workspaces/customs/PpjkItemGrid.tsx` — Main virtualized spreadsheet grid container.
3. `components/workspaces/customs/PpjkItemGridRow.tsx` — Individual virtualized row with inline editing and keyboard handling.
4. `components/workspaces/customs/PpjkItemGridToolbar.tsx` — Operational toolbar with search, quick filters, bulk actions, and save bar.
5. `components/workspaces/customs/PpjkItemDetailDrawer.tsx` — SKU intelligence and compliance detail drawer.
6. `components/workspaces/customs/SkuIntelligenceSuggestion.tsx` — Product memory suggestion popover.
7. `components/workspaces/customs/HsLookupPopover.tsx` — BTKI 8-digit tariff lookup popover.
8. `components/workspaces/customs/BulkImportDialog.tsx` — Excel / CSV upload and Clipboard paste wizard.
9. `lib/domain/customs/__tests__/ppjk-item-grid.test.ts` — Acceptance & performance test suite (40+ scenarios).
10. `docs/architecture/SENTRALOGIS_PHASE3D6D3_DISCOVERY_REPORT.md` — This report.
11. `docs/architecture/SENTRALOGIS_PHASE3D6D3_IMPLEMENTATION_REPORT.md` — Final implementation report.

### Files to Modify:
1. `app/(dashboard)/sbu/clearance/declarations/[id]/page.tsx` — Wire `PpjkItemGrid` into the `items` tab.
2. `scratch/run-tests.ts` — Register Phase 3D-6D-3 test suite.

---

# 7. ACCEPTANCE TEST PLAN (40+ SCENARIOS)

- **Test 1–5:** Grid rendering, empty state, 100 / 1,000 / 5,000 / 10,000 row architectural scaling without DOM bloat.
- **Test 6–11:** Virtualization slice computation, keyboard navigation (`ArrowUp`, `ArrowDown`, `Tab`, `Enter`, `Escape`).
- **Test 12–16:** Inline cell editing, dirty row tracking, save changes batch mutation, discard changes.
- **Test 17–21:** Multi-row selection, bulk field updates (UOM, Country of Origin, Invoice).
- **Test 22–27:** Exception-first filters (Missing HS, Errors, Warnings, Lartas, Price Anomaly).
- **Test 28–32:** SKU intelligence matching, confidence badge, HS suggestion application with human-in-the-loop confirmation.
- **Test 33–37:** Fast BTKI HS lookup, clipboard tab-separated paste parsing, import preview.
- **Test 38–42:** Zero browser direct `supabase.from` calls, zero trucking mutations, zero CEISA scraping, mobile card fallback.

---
*Discovery complete. Executing implementation.*
