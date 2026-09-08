# ADR-041 — Fulfillment Number Authority

**Status:** RATIFIED (U-14A architectural ratification, 2026-08-28) · **Date:** 2026-08-28 **Depends on:** ADR-035 (SO number authority), ADR-011 (U-11 Quote number authority convention)

## Context
U-11 established `next_quote_number()` and ADR-035 established `next_sales_order()` as the only authorities for their business numbers (atomic `nextval`, tenant-safe, `UNIQUE(tenant_id, number)`, client-side `Math.random()` generation outlawed). Fulfillment, as a first-class per-SO aggregate with versioned revisions, needs an equivalent non-colliding business identity while keeping the SO number authority untouched.

## Decision
**Fulfillment business numbers are database-authoritative. The canonical allocator is a `next_fulfillment_number()` PostgreSQL function (conceptual contract for the future Fulfillment implementation).**

Requirements:
- database-generated (atomic `nextval`), concurrency-safe
- tenant-safe and unique within tenant (`UNIQUE(tenant_id, fulfillment_number)`)
- no client-generated canonical Fulfillment numbers
- the Fulfillment PK is a database-generated UUID (never client)

Canonical invariant:
> Client-side code MUST NOT generate canonical Fulfillment numbers.

The Fulfillment primary key and business identity are separate:
- **Primary key:** DB-generated UUID
- **Business identity:** Fulfillment number (allocated only by the canonical server allocator)

## Rules
1. A future Fulfillment implementation MUST provide the server-side allocator; no client path may invent a Fulfillment number.
2. Fulfillment numbers do NOT reuse or collide with Quote/Sales Order numbers; a distinct sequence/format applies.
3. This ADR defines the authority CONTRACT now (so Fulfillment cannot be built with a dual-path number later); it does not authorize creating the function or table in this gate.

## Consequences
✓ Mirrors the ratified ADR-035 / U-11 pattern and reserves the number-authority rule before implementation.
✓ No dual path, no collision with Quote/SO numbers.
⚠ Implementation (function/table) is DEFERRED to the Fulfillment Foundation phase; this ADR only ratifies the authority principle and naming to be used.

## Rejected alternatives
Client-side `Math.random()`/`Date.now()` Fulfillment numbers (no authority, collisions); reusing Quote/SO numbers for Fulfillment (identifies three distinct objects).
