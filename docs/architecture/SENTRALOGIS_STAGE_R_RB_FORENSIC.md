# SENTRALOGIS — STAGE R / 012 REMEDIATION · R-B FORENSIC CONFIRMATION

**Mode:** READ-ONLY forensic analysis. Production NOT contacted. Migration 012 NOT edited. No new migration created.
**Subject:** `supabase/migrations/20260826_012_customs_audit_decision_schema.sql` (86 lines, read completely)

---

## 1. md_users REFERENCE INVENTORY (exact)

| # | Line | Policy Object | Clause | Current (broken) Predicate |
|---|------|---------------|--------|----------------------------|
| 1 | 79 | `cus_audit_events_tenant_isolation` ON `cus_declaration_audit_events` | `USING` | `tenant_id = (SELECT tenant_id FROM public.md_users WHERE id = auth.uid())` |
| 2 | 80 | `cus_audit_events_tenant_isolation` ON `cus_declaration_audit_events` | `WITH CHECK` | *(identical to #1)* |
| 3 | 85 | `cus_decisions_tenant_isolation` ON `cus_customs_decisions` | `USING` | *(identical to #1)* |
| 4 | 86 | `cus_decisions_tenant_isolation` ON `cus_customs_decisions` | `WITH CHECK` | *(identical to #1)* |

**Total md_users references: 4 — exactly as anticipated, no others exist in the file (lines 1–76 verified clean).**

## 2. AFFECTED POLICIES (exact list)

1. `cus_audit_events_tenant_isolation` → table `public.cus_declaration_audit_events`
2. `cus_decisions_tenant_isolation` → table `public.cus_customs_decisions`

Both are pure **tenancy-isolation** policies (`FOR ALL TO authenticated`). Neither carries any
non-tenancy semantic (no role branching, no conditional exposure) — the ONLY defect is the
phantom-table lookup inside the predicate.

## 3. INTENDED REPLACEMENT (R-B)

```sql
-- current (both clauses, both policies)
tenant_id = (SELECT tenant_id FROM public.md_users WHERE id = auth.uid())
-- replacement
tenant_id = public.get_my_tenant_id()
```

## 4. SEMANTIC COMPATIBILITY vs SIBLING CONVENTION — PASS

| Evidence | Detail |
|---|---|
| Sibling usage of `get_my_tenant_id()` | 002 ×6 · 003 ×1 · 004 ×2 · 005 ×4 · 006 ×8 · 008 ×8 · 009 ×4 · 013 ×2 · R-P1 ×2 — **every other tenancy predicate in the canonical family** |
| Exact replacement form precedent | Migration 013 lines 65–68 use the *character-for-character identical* pattern: `USING (tenant_id = public.get_my_tenant_id()) WITH CHECK (tenant_id = public.get_my_tenant_id())` |
| Intent equivalence | Old predicate resolves "caller's tenant from auth.uid()" — `get_my_tenant_id()` performs precisely that resolution (staff branch via `tenant_users`, owner branch via `tenants.user_id`), proven live in production RLS today |
| NULL behavior preserved | Resolver returns NULL for non-tenant identities (viewer/driver/customer profiles) → comparison yields NULL → rows hidden / writes rejected. Identical protective semantics to the intended md_users lookup |
| Resolver safety | `get_my_tenant_id()` is `STABLE SECURITY DEFINER SET search_path='public'` — already relied upon by all live canonical RLS |

## 5. SCOPE-OF-CHANGE ISOLATION — CONFIRMED

Rewriting only these four predicate expressions does NOT touch:
table definitions ✅ · columns ✅ · indexes (lines 60–66) ✅ · constraints (30–31, 57) ✅ ·
foreign keys (10, 11, 37–38, 49–52) ✅ · triggers (none exist in 012) ✅ · functions ✅ ·
grants (69–70) ✅ · non-tenancy RLS semantics (none exist beyond the two isolation policies) ✅

## 6. PHANTOM-TABLE VERIFICATION — CONFIRMED

- Repository-wide grep across **all** migrations: `md_users` appears ONLY in 012 (4 hits).
- No CREATE TABLE/VIEW for `md_users` anywhere in the repository.
- Live database: `md_users` absent (Stage R discovery §4 + deployment halt evidence).
- Conclusion: invalid authoring artifact with **zero valid architectural dependency**.

## 7. MIGRATION 013 COMPATIBILITY — PASS

013 contains zero `md_users` references; its own isolation policy already uses
`get_my_tenant_id()`. Applying R-B creates no conflict; 013 remains applicable verbatim
after corrected 012. (013's FK/CHECK surface unchanged per prior audits.)

---

# R-B FORENSIC VERDICT

```text
md_users references found: 4 (lines 79, 80, 85, 86)
Affected policies: cus_audit_events_tenant_isolation (cus_declaration_audit_events),
                   cus_decisions_tenant_isolation (cus_customs_decisions)

R-B replacement:
  tenant_id = (SELECT tenant_id FROM public.md_users WHERE id = auth.uid())
→
  tenant_id = public.get_my_tenant_id()
  (applied identically to USING and WITH CHECK in both policies)

Semantic compatibility:        PASS
Migration 013 compatibility:   PASS
New identity projection required: NO
Production modified:           NO
```

## RECOMMENDATION

**PROCEED TO R-B REVISION** — apply the four-predicate erratum to migration 012 (documented
in-file as a controlled erratum per owner decision R-B), then execute 012→013 under the same
halt-on-failure discipline used for 001→011, followed by the V-block re-run and smoke tests.

*STOPPED after producing this confirmation. No production write, no file modification.*
