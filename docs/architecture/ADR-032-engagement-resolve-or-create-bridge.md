# ADR-032 — Canonical Engagement Resolve-or-Create Bridge (Legacy WO Shadowing)

**Status:** RATIFIED (Phase 4B-0 gate; implementation unit U-03/U-04) · **Date:** 2026-08-25

## Context
`commercial_work_orders` is the ratified engagement root (ADR-018) and is now deployed in production, but no application path creates it. The live commercial record is the legacy `work_orders`/`wo_items` chain, which conflates commercial intent with execution configuration. Legacy WO cannot simply be renamed or promoted: it embeds operational behavior (assignment cascades, execution slots, SLA/billing flags).

## Problem
Establish ONE canonical commercial identity without breaking the legacy engine — and without letting the legacy table become a second commercial authority.

## Options
1. Rewrite all writers to insert `commercial_work_orders` directly (big-bang).
2. Keep legacy as authority forever; canonical stays decorative.
3. **Resolve-or-create bridge: every operational case file is shadowed by exactly one engagement, created lazily through a domain service, mapped via an additive side-table (`legacy_wo_bridge`).**

## Decision
**Option 3.**
- New domain service creates engagements idempotently keyed by natural key (tenant + customer + business key), initializing lifecycle DRAFT and enforcing tenant/customer association.
- A side mapping table records `legacy_work_order_id ↔ engagement_id`; the engagement is the commercial truth from creation onward; the legacy row remains the protected operational artifact.
- Routes: `/api/v1/commercial/work-orders` (POST create/resolve, GET list/detail) gated by hardened resolver + role checks.
- No fake identifiers: the relaxed nullable `service_scope_id` (Stage R R-P1) removes the fabrication pressure; scope semantics move to future activations.

## Consequences
✅ Foundation becomes runtime-writable without touching protected execution.
✅ Historical rows can be shadowed opportunistically (backfill later, not required for correctness).
⚠ Two rows describe one customer relationship during transition — mitigated because the bridge table makes correspondence explicit and queryable.
⚠ Requires discipline: new features must engage through the bridge, never insert legacy WOs directly (lint/test gates).

## Rejected alternatives
Promoting legacy `work_orders` to canonical root (violates ADR-018/LAW-1); dual-authority federation (LAW-2); requiring seeded `commercial_service_scopes` merely to satisfy an obsolete NOT NULL (fabrication pressure — removed instead).

## Migration impact
Unblocks U-04 routes → U-07 lineage repair → all subsequent waves. Backfill of 100 historical WOs is optional and independent (bridge supports late binding).
