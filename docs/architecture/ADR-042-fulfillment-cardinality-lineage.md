# ADR-042 — Fulfillment Cardinality & Lineage

**Status:** RATIFIED (U-14A architectural ratification, 2026-08-28) · **Date:** 2026-08-28 **Depends on:** ADR-034 (Engagement → SO 1:N), ADR-037 (SO → WO 1:N; many SO → 1 WO FORBIDDEN), ADR-038 (SO → many Shipments), ADR-020 (capability binding), ADR-033 (SR)

## Context
The Fulfillment aggregate sits between the SO and the operational mechanisms. Its cardinalities and lineage must be pinned so the composition never creates a shared-ownership vector (many SO → 1 WO) or a precondition that breaks partial/split/multi-SBU fulfillment.

## Decision
**SO → Fulfillment is 1:N (one SO → many Fulfillment revisions over its lifecycle). Fulfillment → capability allocation is 1:N.** Lineage is deterministic forward and backward; Fulfillment MUST NOT merge or co-own operational objects across SOs.

- **SO → Fulfillment: 1:N revisions.** A single SO progresses through one active composition with versioned revisions (see ADR-043/044 for state and revision semantics); historical revisions remain traceable. This preserves one-SO-per-commercial-commitment and allows replanning without changing the SO.
- **Fulfillment → capability allocation: 1:N.** One composition decomposes into per-capability allocations (FORWARDING, CUSTOMS, TRUCKING, WAREHOUSE) — multi-SBU (ADR-020 relationship; one SO, not one per SBU, unless separate commercial commitments genuinely exist).
- **Fulfillment → Shipment: 1:N** (forwarding allocations), consistent with ADR-038 (SO → many Shipments).
- **Fulfillment → Service Request: 1:N** (via existing dispatch), consistent with ADR-033.
- **Fulfillment → WO: handoff/composition relationship; SO → WO 1:N (ADR-037).**

## Critical constraints (unchanged, absolute)
- **Many SO → One WO is FORBIDDEN** (ADR-037). Fulfillment MUST NOT co-own a WO across two SOs.
- **SO → JO is never allowed** — no direct SO/composition shortcut to job orders. Execution is committed only via the guarded WO path (ADR-036/ADR-037).

## Lineage
- **Forward** (deterministic): `SO → Fulfillment (revision) → capability allocation → (shipment / declaration / SR / WO) → (WO-item) / JO`. Each child reference (`sales_order_id`, `work_order_id`, `shipment_id`, `execution_leg_id`) lets you walk back to the allocation and SO.
- **Backward** (deterministic): from any operational artifact (JO, WO, shipment, declaration) follow the refs to the allocation, Fulfillment, and SO — unique SO ancestry.
- **Many SO → 1 WO**: never allowed; the composition fans OUT from one SO, it never merges two SOs into one WO.
- **External references** (PO, booking, BL, container, declaration, WO, JO) are never canonical PKs on the SO/Fulfillment — they live on operational objects or as non-authoritative text refs.

## Consequences
✓ Partial fulfillment, split shipment, multi-SBU, and replanning are structurally supported (per-SO per-revision accounting).
✓ No shared-WO vector; no SO → JO shortcut.
⚠ Requires the future Fulfillment service to enforce single-SO lineage; a static gate MUST keep ADR-037 absolute.
