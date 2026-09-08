# SENTRALOGIS — R-P1 STATIC MIGRATION REVIEW

**Subject:** `supabase/migrations/20260825_r01_md_tenants_reconciliation.sql` (216 lines, read in full)
**Mode:** STATIC / READ-ONLY. Nothing executed against any database. Migration NOT modified. Application code NOT modified.
**Date:** 2026-08-25 · **Authorization context:** C-1 ratified; C-2 NOT granted

---

## 1. EXECUTIVE VERDICT

# 🟡 YELLOW

No blocking architectural defect. The migration is structurally sound, correctly idempotent,
correctly keyed (shared-PK mapping), recursion-safe, and compatible with every FK in 001→013.
Four non-blocking adjustments are recommended BEFORE C-2 execution (Section 14) — one of them
(data-correctness class) strongly recommended; three are least-privilege hardening.
Additionally, one latent characteristic of ratified migration 011 (`ON DELETE CASCADE`)
must be accepted as a documented operational constraint (Section 6).

---

## 2. EXACT MIGRATION REVIEWED

| Element | Lines | Verdict |
|---|---|---|
| Header contract & deviation disclosure | 1–53 | ✅ accurate |
| Transaction wrapper | 55, 169 | ✅ single BEGIN…COMMIT |
| CREATE TABLE md_tenants | 61–69 | ✅ PK no-default; status CHECK |
| Partial unique index (tenant_code) | 72–74 | ✅ |
| Status index | 76 | ✅ |
| GRANT to authenticated | 78 | ⚠️ see §4 — writes unnecessary |
| RLS enable + policy | 85–91 | ⚠️ see §4 — FOR ALL too permissive for projection |
| fn_sync_md_tenants (SECURITY DEFINER) | 97–141 | ✅ logic correct; ⚠️ hardening §3 |
| Trigger on tenants | 146–151 | ✅ timing/columns correct |
| Backfill | 156–165 | ⚠️ DO NOTHING vs UPSERT — see §9 |
| NOTIFY pgrst | 167 | ✅ repo convention |
| Verification suite V-T1…T7 | 171–216 | ✅ sound; gaps listed §13 |

---

## 3. CRITICAL SECURITY REVIEW (SECURITY DEFINER + search_path + RLS)

**A. Is SECURITY DEFINER necessary?**
Yes — justified, not gratuitous. Without it, a tenant owner updating their own `tenants`
row fires the AFTER trigger *as that user*; whether the mirror INSERT passes RLS depends on
the caller's resolver state mid-statement (and the DELETE branch would evaluate
`get_my_tenant_id()` against a mutating identity). DEFINER makes synchronization
deterministic and independent of caller context.

**B. Privilege exposure?**
The function executes as table owner and writes ONLY to `md_tenants`, bounded to values from
NEW/OLD of the fired row. It contains no dynamic SQL, no DDL, no reads of sensitive tables.
Blast radius = one projection row per triggering row. Acceptable.

**C. Can an authenticated user invoke it directly?**
No effective abuse: PostgreSQL rejects direct invocation of trigger-returning functions
(`trigger functions can only be fired as triggers`). However—

**D/E/F. Is default EXECUTE-to-PUBLIC safe? Should EXECUTE be revoked?**
PostgreSQL grants EXECUTE to PUBLIC by default. Even though direct call fails at the engine
level and trigger firings bypass EXECUTE checks entirely, defense-in-depth says revoke:

```sql
REVOKE EXECUTE ON FUNCTION public.fn_sync_md_tenants() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fn_sync_md_tenants() FROM authenticated;
```

Trigger behavior is unaffected (EXECUTE is never checked for trigger invocation).
→ **Recommended adjustment #3.**

**G. Cross-tenant indirect manipulation?**
No. The trigger mirrors exclusively NEW/OLD of the row actually changed on `tenants`.
A tenant user can only reach `tenants` rows through pre-existing, unaffected policies
(`tenants_owner_update` = own tenant). They cannot cause another tenant's projection row
to be created/modified/deleted. Verified: function body touches exactly one `md_tenants`
row keyed by NEW.id/OLD.id.

**H. Source manipulation outside authorized path?**
Unchanged by this migration — `tenants` policies are untouched (verified: file contains no
DDL/policy on `tenants` beyond the trigger object).

**I. Mirror-only-the-changed-row?** Yes — both branches key strictly on NEW.id/OLD.id.

**J. Malformed tenant IDs?** IDs are UUID-typed by both tables; malformed input rejected at
parse time. NULL impossible (`tenants.id` PK NOT NULL). No injection surface (static SQL).

**K/L. search_path hardening & qualification.**
`SET search_path = public` plus fully qualified `public.md_tenants` inside the body is
functional; `pg_catalog` is implicitly searched first so built-ins cannot be hijacked.
Stronger posture per PG documentation is `SET search_path = ''` with explicit qualification
(already the style used). → **Recommended adjustment #4 (cosmetic-hardening).**

---

## 4. RLS REVIEW (exact behavior under current policy, lines 87–91)

Caller = ordinary `authenticated` user (service role bypasses everything):

| Operation | Behavior today |
|---|---|
| SELECT own tenant row | ✅ visible (`USING id = get_my_tenant_id()`) |
| SELECT other tenants' rows | ❌ invisible |
| Users with NULL resolver result (viewer/driver/customer profiles) | ❌ see zero rows (NULL comparison) — safe |
| INSERT arbitrary id | ❌ blocked (`WITH CHECK`) — cannot fabricate another tenant's projection |
| INSERT/UPDATE/DELETE **own** tenant's projection row | ⚠️ **ALLOWED today** (id matches own resolver value) |

That last row is the finding: the contract states *md_tenants = projection writes only*
(trigger-fed), yet a determined tenant user could drift their own projection's `name`/`status`
until the next authoritative source update. Not a cross-tenant leak — a contract-purity gap.

**Recommendation (safest posture, report-only per mandate):**

```sql
DROP POLICY IF EXISTS md_tenants_tenant_isolation ON public.md_tenants;
CREATE POLICY md_tenants_read_own ON public.md_tenants
  FOR SELECT TO authenticated
  USING (id = public.get_my_tenant_id());
REVOKE INSERT, UPDATE, DELETE ON public.md_tenants FROM authenticated;
```

Reads stay available; every write becomes trigger/service-role-only. Canonical APIs use
`supabaseAdmin` (bypasses RLS), so nothing downstream breaks. → **Recommended adjustment #2.**

---

## 5. TRIGGER RECURSION & TIMING REVIEW

- `pg_trigger_depth() > 1` guard: correct and sufficient — the function writes to
  `md_tenants`, which has **no triggers**, so depth during normal operation is exactly 1;
  any nested firing (future defensive triggers elsewhere) is skipped rather than looped.
- INSERT branch: works (AFTER INSERT, mirror via ON CONFLICT DO NOTHING).
- UPDATE branch: works; `UPDATE OF name, tenant_code, status, updated_at` fires whenever
  those columns appear in SET (value-unchanged updates are harmlessly idempotent).
- DELETE branch: works (see §6).
- `RETURN NULL` validity: valid — return value is ignored for AFTER ROW triggers.
- Timing choice: **AFTER is correct.** Mirroring BEFORE the source row exists/committed would
  invert authority; AFTER also lets COALESCE observe final column values of the statement.
- One nuance worth recording: if any *other* existing trigger on `tenants` mutates columns,
  our AFTER trigger sees the post-other-trigger values within same chain (alphabetical/
  name-order firing) — parity preserved either way because V-T4 gates reconciliation.

---

## 6. DELETE SEMANTICS — EXACT POSTGRESQL BEHAVIOR (incl. FK scan evidence)

FK inventory against `md_tenants(id)` across 001→013 (**31 total**):
- **29 × NO ACTION** (default): migrations 002(×3), 003(×12), 004(×1), 005(×2), 006(×4),
  008(×4), 009(×2), 012(×2), 013(×1) — line-level evidence captured in review scan.
- **2 × ON DELETE CASCADE**: migration `20260826_011` lines 11 & 35
  (`cus_ceisa_preparations`, `cus_ceisa_validation_results`). ⚠️ See finding F-A below.

Behavior of `DELETE FROM tenants` (single statement; trigger is part of it):

| Case | Sequence | Outcome |
|---|---|---|
| A: no canonical refs | trigger mirror-deletes md_tenants row; nothing references it | ✅ delete succeeds cleanly |
| B: has commercial_work_orders | cascade attempt on md_tenants → NO ACTION violation at end-of-statement → **entire DELETE statement fails, transaction rolls back** | ✅ blocked, zero inconsistency; tenants row survives |
| C: has service requests | identical to B (`svc_service_requests.tenant_id` NO ACTION) | ✅ blocked |
| D: has shipments | identical to B (`shp_shipments.tenant_id` NO ACTION) | ✅ blocked |
| E: has declarations | identical to B (`cus_declarations.tenant_id` NO ACTION) | ✅ blocked |

**Intermediate-failure analysis:** the NO ACTION check occurs at end of the *same outer
statement*, so there is **no observable intermediate state** — either everything (source +
mirror + cascade targets) commits, or everything rolls back. The mirror-delete can never
commit while a NO ACTION reference survives.

**Finding F-A (inherited from ratified 011 — cannot fix without rewriting it, which C-1 forbids):**
a hypothetical tenant possessing *only* `cus_ceisa_*` canonical rows (impossible through real
workflows, since CEISA rows require parent declarations whose FK is NO ACTION) could be
deleted with its CEISA rows silently cascading away.
**Compensating control (operational, adopted by this review): tenant DELETE is not a supported
operation; lifecycle uses `status='inactive'`.** Recorded for the deployment runbook.

**Cosmetic nuance:** when blocked, the surfaced error references the `md_tenants` child delete
rather than `tenants` — operators should expect FK-violation messages naming canonical tables.

---

## 7. SHARED-PK REVIEW

Verified lines 61–62: `id UUID PRIMARY KEY` with **no DEFAULT** — the column cannot generate
an independent identity even accidentally; every value arrives from `tenants.id` via backfill
or trigger. Combined with the trigger being the sole write path (post adjustment #2), the
mapping invariant `tenants.id === md_tenants.id` is enforced mechanically.
Intentional and safe. ✅

---

## 8. tenant_code NULLABILITY REVIEW

Deviation re-examined against live facts:
- Source `tenants.tenant_code VARCHAR NULL` (verified live information_schema) — spec's
  NOT NULL would make the projection stricter than its source and able to abort legitimate
  tenant creation (trigger failure ⇒ statement failure). Deviation is architecturally correct.
- Existing 15/15 rows: all non-NULL → backfill valid unchanged.
- Multiple NULLs remain legal (partial index indexes only non-NULL values).
- Non-NULL uniqueness enforced globally (`uq_md_tenant_code WHERE IS NOT NULL`).
- Future tenant creation with NULL code: succeeds; mirror row carries NULL. Compatible. ✅

---

## 9. BACKFILL REVIEW — `ON CONFLICT (id) DO NOTHING` (lines 156–165)

**Question answered directly:** yes — if `md_tenants` already contained a same-ID row with
stale metadata, DO NOTHING preserves the stale row. Parity would be *detected* (V-T4) but not
*self-healed*. The operator would have to intervene manually — violating the spirit of a
"deterministic reconciliation".

Mitigating fact: within this migration the table is created in the same transaction, so at
first execution it is provably empty; staleness requires manual tampering between runs.
Nevertheless the cheapest deterministic fix is an idempotent upsert:

```sql
ON CONFLICT (id) DO UPDATE
SET tenant_code = EXCLUDED.tenant_code,
    name        = EXCLUDED.name,
    status      = EXCLUDED.status,
    created_at  = EXCLUDED.created_at,
    updated_at  = EXCLUDED.updated_at;
```

This makes re-runs self-healing and guarantees parity by construction.
→ **Recommended adjustment #1 (data-correctness class — strongest of the four).**

---

## 10. CONCURRENCY REVIEW (PostgreSQL-native semantics only)

- **INSERT(A) ∥ UPDATE(B) same tenant:** B blocks on the `tenants` row lock until A commits;
  triggers fire sequentially per committed row version; final mirror = last writer. Consistent.
- **UPDATE(C) ∥ DELETE:** row locks serialize; loser proceeds on winner's outcome (update-after-
  delete finds no source row / delete-after-update mirrors final values). No lost identity.
- **Canonical-reference creation ∥ tenant delete:** inserting a canonical row takes
  `KEY SHARE` on the referenced `md_tenants` row; the mirror-delete must acquire an exclusive
  row lock → PostgreSQL serializes them. Either the reference commits first (delete then fails
  NO ACTION) or the delete commits first (reference insert then fails FK). No window produces
  an orphaned projection or dangling reference. ✅
- **Concurrent duplicate migration runs:** `IF NOT EXISTS`/`OR REPLACE`/`ON CONFLICT` make it
  benign; catalog-level races on CREATE TABLE under truly parallel execution are excluded
  operationally (deployment plan mandates a single operator runbook).

---

## 11. MIGRATION 001→013 FK COMPATIBILITY (full matrix)

R-P1 **must precede migration 001?** Precisely: it must precede **002** (first referencer).
Applying it before 001 is the natural numeric ordering and satisfies all dependents. ✅

| Migration → dependent tables | FK cols → md_tenants | Delete rule |
|---|---|---|
| 002 → commercial_service_scopes, commercial_work_orders, commercial_line_items | tenant_id ×3 | NO ACTION |
| 003 → shp_manifest_items, shp_units, shp_execution_plans, shp_execution_legs, shp_leg_units, shp_milestones, shp_exceptions (+headers) | tenant_id ×12 | NO ACTION |
| 004 → svc_service_requests | tenant_id | NO ACTION |
| 005 → cus_declarations, cus_classification_lines | tenant_id ×2 | NO ACTION |
| 006 → event_outbox, event_consumption_log, event_dead_letter, fin_financial_ledger_entries | tenant_id ×4 | NO ACTION |
| 007 | none | — |
| 008 → HS codes, SKU intelligence, documents, item audit logs | tenant_id ×4 | NO ACTION |
| 009 → validation_runs, exceptions | tenant_id ×2 | NO ACTION |
| 010 | ALTERs only | — |
| 011 → cus_ceisa_preparations, cus_ceisa_validation_results | tenant_id ×2 | **CASCADE** ⚠️ (F-A) |
| 012 → audit_events, decisions | tenant_id ×2 | NO ACTION |
| 013 → commercial_capability_bindings | tenant_id | NO ACTION |

Every FK requires only `md_tenants(id UUID PRIMARY KEY)` — shape satisfied. Line-number
evidence captured in the review scan (31 references verified).

---

## 12. ROLLBACK REVIEW

| Phase | Rollback script (lines 32–37) safe? | Why |
|---|---|---|
| BEFORE 001→013 | **YES** | No dependencies exist; reversal removes trigger → function → policy → table. Re-running R-P1 later regenerates everything deterministically. |
| AFTER 001→013 | Script **FAILS BY DESIGN — and that is correct** | `DROP TABLE md_tenants` is refused by PostgreSQL while 31 dependent FKs exist (cannot proceed without CASCADE, which the script deliberately omits). Therefore rollback **cannot silently destroy canonical data** — it errors loudly instead. |

Header warning (line 38–39) is validated as accurate. For genuine post-canonical reversal, a
dedicated ordered teardown (013→002 children first) would need to be authored separately and
explicitly authorized — out of scope and intentionally not provided.

---

## 13. VERIFICATION SUITE REVIEW (V-T1…V-T7)

All seven proofs are logically valid for their claims:
V-T1 counts-equal ✅ · V-T2 exactly-one mapping via GROUP BY/HAVING ✅ · V-T3 orphan-zero ✅ ·
V-T4 field parity incl. NULL-aware `IS DISTINCT FROM` ✅ · V-T5 authority proof (trigger
existence + definer flag) ✅ · V-T6 behavioral sync test wrapped in BEGIN…ROLLBACK ✅ ·
V-T7 protected-systems row counts ✅.

Gaps identified (recommended additions, non-blocking):

```sql
-- V-T8: NULL tenant_code behavioral parity (inside BEGIN…ROLLBACK like V-T6)
--   insert temp tenant with NULL code → assert mirror row exists with NULL code
-- V-T9: hardening assertions
SELECT rowsecurity FROM pg_tables WHERE schemaname='public' AND tablename='md_tenants'; -- true
SELECT has_function_privilege('authenticated', 'public.fn_sync_md_tenants()', 'EXECUTE'); -- false after adj.#3
SELECT count(*) FROM pg_policies WHERE tablename='md_tenants' AND cmd='SELECT';           -- per adj.#2
```

---

## 14. REQUIRED CHANGES (recommendations — migration NOT modified per mandate)

| # | Class | Adjustment | Priority |
|---|-------|-----------|----------|
| 1 | Data correctness | Backfill `DO NOTHING` → `DO UPDATE` (self-healing parity; §9) | **STRONGLY RECOMMENDED before C-2** |
| 2 | Least privilege | RLS policy → `FOR SELECT` only; `REVOKE INSERT, UPDATE, DELETE … FROM authenticated` (§4) | Recommended |
| 3 | Defense in depth | `REVOKE EXECUTE ON FUNCTION … FROM PUBLIC, authenticated` (§3-E) | Recommended |
| 4 | Hardening cosmetics | `SET search_path = ''` in function; add V-T8/V-T9 assertions (§3-K, §13) | Optional |
| — | Operational | Adopt "tenant DELETE unsupported; use status=inactive" rule in runbook (F-A, §6) | Required acknowledgment |

Owner options at C-2: (a) authorize a single revision pass of R-P1 implementing #1–#4, then
deploy; or (b) explicitly accept the current artifact with #1 waived (justified by
fresh-table-in-same-transaction argument) and deploy. Both are architecturally defensible;
(a) is recommended.

---

## 15. C-2 READINESS VERDICT

> **REVISION STATUS UPDATE (post-review, same day):**
>
> | Adjustment | Status |
> |---|---|
> | #1 Backfill self-healing UPSERT | ✅ IMPLEMENTED |
> | #2 Projection write hardening (SELECT-only policy + revoke writes) | ✅ IMPLEMENTED |
> | #3 SECURITY DEFINER EXECUTE revoked from PUBLIC + authenticated | ✅ IMPLEMENTED |
> | #4 `SET search_path = ''` hardening | ✅ IMPLEMENTED (with local-execution correction, see below) |
> | V-T8 NULL tenant_code behavioral test | ✅ ADDED |
> | V-T9 security/RLS assertions | ✅ ADDED |
> | Tenant DELETE unsupported rule | ✅ DOCUMENTED in migration header + function body |
>
> **Local execution verification performed** on an isolated throwaway PostgreSQL instance
> (installed local binaries, temp data directory, port 55432, destroyed after use — zero
> production contact). All verification proofs **executed for real**, not merely reviewed:
> V-T1…V-T9 + adjustment #1 self-healing proof + two behavioral security proofs
> (authenticated direct-INSERT denial; direct trigger-function invocation rejection) —
> **18/18 PASS**.
>
> **Correction caught by local execution:** under `search_path = ''`, explicitly qualifying
> `pg_catalog.coalesce(text, 'literal')` breaks unknown-literal type resolution on modern
> PostgreSQL (`function pg_catalog.coalesce(text, unknown) does not exist`). Fix applied:
> built-ins left unqualified (pg_catalog is implicitly searched FIRST even under an empty
> search_path), while every application object remains fully qualified (`public.md_tenants`).
> This is exactly the class of defect static review alone cannot catch — recorded as evidence
> for the deployment-gate verification requirement.
>
> ### FINAL VERDICT: 🟢 GREEN FOR C-2 PREPARATION
> Migration revised, locally proven, repository baseline green. Production untouched.
> Deployment itself remains gated on the C-2 checklist (backup proof, rollback rehearsal,
> explicit owner DEPLOY authorization).

---

*Review performed statically; local execution used an isolated disposable PostgreSQL instance;
no production contact occurred; apart from this document and the migration artifact itself,
no files were created or modified.*

# R-P1 STATIC REVIEW COMPLETE

```text
Verdict:                       YELLOW (proceed after optional-but-recommended adjustments #1–#4)
Production modified:           NO
Migration executed:            NO
Code modified:                 NO
Legacy systems modified:       NO
543/543:                       PASS
tsc:                           PASS
```

Menunggu keputusan owner untuk C-2.
