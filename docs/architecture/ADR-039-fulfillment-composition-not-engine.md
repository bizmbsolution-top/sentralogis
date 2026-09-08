# ADR-039 — Fulfillment is a Composition, Not an Engine

**Status:** RATIFIED (U-14A architectural ratification, 2026-08-28) · **Date:** 2026-08-28 **Depends on:** ADR-018 (engagement), ADR-020 (capability binding), ADR-033 (SR command), ADR-036 (fulfillment boundary), ADR-037 (SO → WO cardinality), ADR-038 (shipment → SO)

## Context
U-14 established that Fulfillment is the explicit boundary between a Sales Order (commercial commitment) and operational execution, but the exact nature of that boundary must be fixed so it never becomes a competing engine. The repository already has composable, authoritative operational mechanisms: capability bindings (ADR-020), service requests (ADR-033), guarded work orders (ADR-037), and shipments (ADR-038). The risk is that a "Fulfillment" object is built as another operational/assignment/dispatch/JO engine that duplicates or shadows these.

## Decision
**Fulfillment is a deliberately lightweight, composition-only, per-Sales-Order aggregate. It is NOT an operational engine.**

- Fulfillment = the per-SO plan/container that **scopes capability allocations** and **tracks progress** (planned/allocated/delivered) against the SO's commercial commitment.
- Fulfillment **MUST NOT** re-implement existing canonical domains: it does not create WOs, does not create JOs, does not assign drivers, does not dispatch trucks, does not own shipment internals, does not re-implement customs, does not replace capability vocabulary.
- Every execution payload stays in the mechanism that owns it and is delegated through the existing canonical boundary:
  - capability bindings → WHAT capabilities are included (ADR-020)
  - shipment → forwarding HOW (ADR-038)
  - service requests → cross-domain dispatch command (ADR-033)
  - guarded WO → operational commitment (ADR-037)
- The Fulfillment aggregate is the **scoping/accounting/state seam** between the SO header and those mechanisms; it holds references and plans, not operational payloads.

## Rules
1. Fulfillment may add per-SO allocation and progress accounting on TOP of existing mechanisms, but never replace them.
2. Fulfillment MUST NOT directly write `work_orders`, `wo_items`, `job_orders`, `shp_shipments`, `cus_declarations`, or `svc_service_requests` in an implementation that bypasses their governing services/adapters.
3. Fulfillment MUST NOT create a parallel capability registry, dispatcher, assignment engine, or JO generator.

## Consequences
✓ A single, explicit, thin seam carries per-SO decomposition and progress.
✓ No second operational engine is created; all ratified authority (ADR-020/033/037/038) stays sovereign.
⚠ Requires discipline: Fulfillment adapters must delegate, never duplicate. A static gate MUST verify Fulfillment does not import any operational write table directly.

## Rejected alternatives
A second fulfillment/task engine that duplicates ADR-020+SR+shipment machinery (rejected by ADR-036 and U-14 §16); treating Fulfillment as an alias for WO or JO (collapses the composition into the operational engine).
