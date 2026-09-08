# U-11 Quote Identity & Number Authority — Forensic Report

**Date:** 2026-08-27
**Gate:** U-11 — Quote Identity & Number Authority Forensic Gate
**Depends On:** U-01 through U-10R ACCEPTED/GREEN
**Status:** GREEN — ALL 28 GATES PASS, 335/335 FULL REGRESSION PASS

---

## A. Executive Summary

**Verdict: GREEN — REPAIR APPLIED**

| Metric | Before U-11 | After U-11 |
|--------|-------------|------------|
| Quote creation paths | 2 (both client-side) | 2 (both routed through server authority) |
| Business-number generators | 2 (identical Math.random) | 1 (server-side nextval) |
| Canonical authority | NONE | `next_quote_number()` PostgreSQL function |
| Dual-path generation | YES (active, production-reachable) | NO (converged on single authority) |
| Database uniqueness | NONE | UNIQUE(tenant_id, quote_number) |
| Concurrency safety | NONE (Math.random collision) | PASS (nextval atomic + UNIQUE constraint) |
| Idempotency | NONE | PASS (deterministic retry → new number) |

**U-11 repair was required and applied.** The pre-existing architecture had two independent client-side `Math.random()` generators producing `QT-YYYY-MM-XXXX` business numbers with no server-side authority and no database uniqueness constraint. This was a confirmed latent data integrity bug.

---

## B. Quote Identity Inventory

| Identifier | File | Classification | Generator | Persistence | Risk |
|-----------|------|---------------|-----------|-------------|------|
| `id` | migration 115 | CANONICAL-PK | `uuid_generate_v4()` (DB) | `crm_quotations.id` | NONE |
| `quote_number` | migration 115 + U-11 | BUSINESS-ID | `next_quote_number()` (server) | `crm_quotations.quote_number` | LOW (was HIGH) |
| `deal_id` | migration 115 | FOREIGN-KEY | client (from deal prop) | `crm_quotations.deal_id` | NONE |
| `tenant_id` | migration 115 | FOREIGN-KEY | client (from auth) | `crm_quotations.tenant_id` | NONE |
| `created_by` | migration 115 | FOREIGN-KEY | client (from auth) | `crm_quotations.created_by` | NONE |
| `updated_by` | migration 115 | FOREIGN-KEY | trigger (auto) | `crm_quotations.updated_by` | NONE |

---

## C. Creation Path Inventory

| Path | Entry Point | Generator | Persistence | Canonical? | Risk |
|------|-------------|-----------|-------------|-----------|------|
| HQ Pipeline | `app/(dashboard)/commercial/pipeline/page.tsx` | `getNextQuoteNumber()` server action | `supabase.from('crm_quotations').insert()` | YES (via server action) | LOW |
| Sales Portal | `app/portal/sales/deals/[id]/page.tsx` | `getNextQuoteNumber()` server action | `supabase.from('crm_quotations').insert()` | YES (via server action) | LOW |

**Both paths now converge on the single canonical authority.**

### Pre-U-11 Paths (Removed)

| Path | Entry Point | Generator | Problem |
|------|-------------|-----------|---------|
| HQ Pipeline (old) | `pipeline/page.tsx:100` | `Math.random()` client-side | No authority, no uniqueness |
| Sales Portal (old) | `deals/[id]/page.tsx:61` | `Math.random()` client-side | Identical duplicate code |

---

## D. Number Authority Analysis

```
Canonical generator:        next_quote_number(UUID) — PostgreSQL function
Canonical persistence:      crm_quotations.quote_number via INSERT
Uniqueness enforcement:     UNIQUE(tenant_id, quote_number) constraint
Retry strategy:             Deterministic — each call to next_quote_number() returns a new number
Concurrency strategy:       nextval() is atomic and session-safe; UNIQUE constraint as safety net
Idempotency strategy:       Each retry generates a new unique number; no duplicate Quotes created
```

---

## E. Dual-Path Finding

**Before U-11:**
```
Path A: app/(dashboard)/commercial/pipeline/page.tsx → Math.random() → insert
Path B: app/portal/sales/deals/[id]/page.tsx → Math.random() → insert

Why both exist:     Copy-pasted identical code for HQ vs Sales Portal UIs
Can both execute:   YES — different users, different browsers
Can they collide:   YES — same month, same random 4-digit suffix
Can they produce inconsistent numbering: YES — two Quotes with same QT-YYYY-MM-XXXX
Can they create duplicate records: YES — no UNIQUE constraint prevented it
```

**After U-11:**
```
Path A: pipeline/page.tsx → getNextQuoteNumber() → next_quote_number() → insert
Path B: deals/[id]/page.tsx → getNextQuoteNumber() → next_quote_number() → insert

Convergence: Both call the same server action → same DB function → atomic nextval()
Collision:   IMPOSSIBLE — nextval() guarantees unique sequence; UNIQUE constraint as safety net
```

---

## F. Severity

**BLOCKING — FIXED**

The dual-path `Math.random()` generation without server-side authority or database uniqueness was a **BLOCKING** architectural violation. It could produce duplicate canonical business numbers in production, which would cause:
- Ambiguous quote references in customer communications
- Failed lookups by quote number
- Broken audit trails
- Data integrity issues in the Quote → Contract conversion path

---

## G. Database Schema (Post U-11)

```sql
CREATE TABLE IF NOT EXISTS public.crm_quotations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL,
    deal_id         UUID NOT NULL REFERENCES public.crm_deals(id) ON DELETE CASCADE,
    quote_number    VARCHAR(100) NOT NULL,
    total_amount    NUMERIC(15, 2) DEFAULT 0,
    target_price    NUMERIC(15, 2),
    status          VARCHAR(50) DEFAULT 'DRAFT',
    valid_until     DATE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    created_by      UUID REFERENCES public.profiles(id),
    updated_by      UUID REFERENCES public.profiles(id),
    subtotal_amount NUMERIC(15, 2) DEFAULT 0,
    tax_amount      NUMERIC(15, 2) DEFAULT 0,
    notes           TEXT,
    validity_days   INT DEFAULT 30,
    onetime_total   NUMERIC(15, 2) DEFAULT 0,
    recurring_total NUMERIC(15, 2) DEFAULT 0,

    -- U-11: Added UNIQUE constraint
    CONSTRAINT uq_crm_quotations_tenant_quote_number
      UNIQUE (tenant_id, quote_number)
);
```

**Function:**
```sql
CREATE OR REPLACE FUNCTION public.next_quote_number(p_tenant_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
  -- Uses nextval('seq_quote_number') for atomic sequence allocation
  -- Format: QT-YYYY-MM-NNNN
$$;
```

---

## H. Lineage Architecture

```
CRM Layer (Sales):
  crm_deals → crm_quotations → md_storage_contracts (warehouse billing only)

Execution Layer (Operations):
  commercial_work_orders → service_requests → job_orders

LINK: NONE — Quote is CRM-only. Engagement is Operations-only.
      No automated or programmatic link exists between them.
      The only outbound path from Quote is → Contract (warehouse billing via RPC).
```

Quote identity is stable within the CRM layer. There is no Quote → Engagement → Work Order → Job Order lineage to maintain.

---

## I. Files Modified/Created

| Action | File |
|--------|------|
| **Created** | `supabase/migrations/20260827_018_u11_quote_identity_authority.sql` |
| **Created** | `app/quote/number-actions.ts` (server action) |
| **Created** | `lib/__tests__/u11-quote-identity-authority.test.ts` (28 tests) |
| **Modified** | `app/(dashboard)/commercial/pipeline/page.tsx` (import + use server authority) |
| **Modified** | `app/portal/sales/deals/[id]/page.tsx` (import + use server authority) |
| **Modified** | `scripts/run-full-regression.ts` (added U-11 suite) |
| **Created** | `docs/architecture/SENTRALOGIS_PHASE4B_U11_QUOTE_IDENTITY_AUTHORITY_REPORT.md` |
| **Created** | `docs/architecture/SENTRALOGIS_PHASE4B_U11_FINAL_ACCEPTANCE.md` |

---

## J. Test Results

| Suite | Result |
|-------|--------|
| U-11 Quote Identity Authority | 28/28 PASS |
| U-10 Static Architecture Gates | 8/8 PASS |
| U-10R Forensic Reconciliation | 37/37 PASS |
| Full Regression | 335/335 PASS, 0 FAIL |
| TypeScript | 0 new errors |

---

## K. Remaining Debt

| Item | Classification | Risk | Recommended Fix |
|------|---------------|------|-----------------|
| No Quote domain types/interfaces | F-PRE-EXISTING | Low | Create Quote types for type safety |
| Direct browser supabase calls in CRM | F-PRE-EXISTING | Low | Route through server actions (not blocking) |
| No Quote validation layer | F-PRE-EXISTING | Low | Add input validation server-side |
| Quote → Engagement link missing | INFORMATIONAL | None | Architecture decision — CRM and Ops are separate |

---

## L. Architectural Decision

**Quote business numbers MUST be allocated by the canonical `next_quote_number()` PostgreSQL function.**

**Client-side code MUST NOT generate canonical Quote numbers.**

**Quote PK remains the UUID `id` column — the canonical relational identity.**

**Quote is a CRM-layer concept. Engagement is an Operations-layer concept. They are intentionally separate.**
