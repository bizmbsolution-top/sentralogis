# SENTRALOGIS — STAGE R TENANCY RECONCILIATION

## Canonical Tenant Identity: `md_tenants` vs live `tenants`

**Date:** 2026-08-25 · **Companion to:** STAGE_R_DISCOVERY_REPORT.md · **Decision record:** ADR-030

---

## 1. THE DECISION (MANDATE §5)

Two options were evaluated against the verified evidence:

| Criterion | OPTION A — create `md_tenants`, backfill from `tenants` preserving IDs | OPTION B — rewrite canonical migrations to reference `tenants` |
|---|---|---|
| Data integrity | ✅ IDs preserved 1:1; zero remapping | ✅ equivalent |
| Migration complexity | ✅ ONE prerequisite migration + trigger sync | ❌ touch 13 ratified migration files across 4 phases |
| Backward compatibility | ✅ `tenants` untouched; all legacy FKs (`tenant_users`, `job_orders.vendor_tenant_id`, `driver_tenant_links`) keep working | ⚠️ legacy tables unaffected but canonical DDL diverges from published ADRs/docs |
| Future architecture | ✅ canonical layer keeps its designed vocabulary (`md_*` masters family already half-live: md_entities, md_locations…) | ❌ splits naming convention (`md_entities` vs `tenants`) permanently |
| RLS simplicity | ✅ `get_my_tenant_id()` works unchanged (returns `tenants.id` = `md_tenants.id`) | ✅ equivalent |
| API identity resolution | ✅ resolver returns one UUID valid in both worlds | ✅ equivalent |
| FK stability | ✅ stable forever (sync triggers prevent drift) | ✅ |
| Migration maintainability | ✅ canonical migrations applied verbatim as ratified | ❌ permanent fork from repository-of-record DDL |
| Risk to legacy operations | ✅ additive only | ⚠️ none direct, but rewrite risk |
| Multi-tenant SaaS future | ✅ preserves designed master/overlay catalog model (Phase 4B+) | ⚠️ weakens it |

### RECOMMENDATION: **OPTION A** — with an anti-divergence design

Rationale in one line: *the canonical architecture is already half-deployed by name
(`md_entities`, `md_locations` exist with rows); creating `md_tenants` completes the
family with one deterministic backfill, whereas Option B forks 13 ratified migrations
to accommodate a naming accident.*

## 2. ANTI-DUAL-AUTHORITY DESIGN (LAW 2 compliance)

Creating a second tenant table risks "dual tenant authority". This design makes that impossible:

1. **Single source of truth remains `tenants`** for tenant lifecycle (create/rename/status/subscription).
2. **`md_tenants` is a canonical identity PROJECTION**: created with identical primary keys,
   populated exclusively by database triggers from `tenants`.
   - `AFTER INSERT ON tenants` → INSERT mirror row into `md_tenants`.
   - `AFTER UPDATE OF name, tenant_code, status ON tenants` → UPDATE mirror.
   - `BEFORE DELETE ON tenants` → RESTRICT if canonical references exist (protect integrity),
     otherwise cascade-delete mirror.
3. **No application code may write `md_tenants` directly** (enforced socially now;
   optionally via REVOKE later once canonical APIs own writes).
4. Because PKs are identical, `get_my_tenant_id()` output is simultaneously a valid
   `md_tenants.id` — one UUID, two coordinated surfaces, zero mapping logic.

Result: exactly **one** tenant identity per business entity, expressed through one
operational table and one canonical projection that can never disagree.

## 3. DETERMINISTIC MAPPING

```
tenants.id (UUID, PK)  ──1:1──►  md_tenants.id (UUID, PK)   [IDENTICAL VALUES]
tenants.tenant_code    ────────►  md_tenants.tenant_code    [UNIQUE]
tenants.name           ────────►  md_tenants.name
tenants.status         ────────►  md_tenants.status         ['active'|'inactive']
tenants.created_at / updated_at   →  mirrored
```

- **Mapping type: PRIMARY-KEY PRESERVATION** (no translation table needed — the durable
  mapping *is* the shared key).
- Backfill: single idempotent `INSERT … SELECT … ON CONFLICT (id) DO NOTHING`.

### Reconciliation ledger (from discovery)

```
TENANCY RECONCILIATION
tenants total:            15
tenant_users total:       53
profiles total:           85 (auth.users: 86)
orphan tenant_users:      0
duplicate tenant_code:    0
multi-tenant users:       0 (DB-enforced via UNIQUE(user_id))
unresolved mappings:      0
flagged (mapped anyway):  7 tenants without staff access; 1 inactive (MBST01);
                          1 malformed tenant_code format (DIGITAL_20260501_03:26:28…);
                          12 owner-links relying on COALESCE owner branch;
                          20 profiles without tenant context (viewer/driver/customer roles);
                          1 auth user without profile row
```

Nothing was silently fixed; every anomaly above carries forward as-is.

## 4. PROPOSED `md_tenants` SHAPE (planning artifact — no migration written yet)

```sql
CREATE TABLE IF NOT EXISTS public.md_tenants (
  id          UUID PRIMARY KEY,               -- NO default: values come from tenants.id
  tenant_code VARCHAR(64) NOT NULL,
  name        TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_md_tenant_code UNIQUE (tenant_code)
);
-- RLS: authenticated read within own tenant (mirror of tenants policy semantics)
-- Sync triggers on public.tenants as specified in §2.
-- Backfill: INSERT INTO md_tenants(id, tenant_code, name, status, created_at, updated_at)
--           SELECT id, tenant_code, name, status, created_at, updated_at
--           FROM tenants ON CONFLICT (id) DO NOTHING;
```

Deliberately MINIMAL: no subscription/token/warehouse columns — those remain operational
concerns of `tenants`. The canonical layer needs identity, not billing.

## 5. IDENTITY RESOLUTION ARCHITECTURE FOR PHASE 4B-0 (recorded here, implemented later)

Verified chain for the hardened helper (D-2), reusing the proven production resolver:

```
session → auth.getUser() → user.id
   → get_my_tenant_id()            (existing SECURITY DEFINER fn — staff branch, then owner branch)
   → tenant UUID                    (valid for tenants AND md_tenants AND all canonical tables)
   → role: tenant_users.role_code (staff) | 'TENANT_OWNER' (owner branch)
   → authorization: commercial:read / commercial:manage
   → tenant-filtered query via supabaseAdmin
```

Users with NULL result (the 20 viewer/driver/customer profiles) are denied commercial
access cleanly — expected behavior, not an error.

---

*No migration file was created in Stage R planning. The SQL above is specification,
awaiting owner authorization per DEPLOYMENT_PLAN.md checkpoints.*
