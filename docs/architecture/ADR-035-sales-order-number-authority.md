# ADR-035 — Sales Order Number Authority

**Status:** RATIFIED (U-12A-R architectural ratification, 2026-08-28) **Date:** 2026-08-28

## Context
U-11 established the canonical `next_quote_number()` as the sole authority for Quote business numbers (atomic `nextval`, tenant-scoped, `UNIQUE(tenant_id, quote_number)`, client-side `Math.random()` generation outlawed). The Sales Order needs an equivalent, non-colliding business identity.

## Decision
**Sales Order business numbers are database-authoritative. The canonical allocator is a `next_sales_order()` PostgreSQL function.**

Requirements:
- database-generated (atomic `nextval`)
- concurrency-safe
- tenant-safe and unique within tenant (`UNIQUE(tenant_id, so_number)`)
- no client-generated canonical numbers

Canonical invariant:
> Client-side code MUST NOT generate canonical Sales Order numbers.

The SO primary key and SO business number are separate identities:
- **Primary key:** database-generated UUID (never client-generated)
- **Business identity:** SO number (allocated only by `next_sales_order()`)

## Consequences
`next_sales_order()` mirrors the ratified U-11 `next_quote_number()` pattern. The exact format is defined by the U-12A/U-13 implementation package; do not invent a new format if an existing architecture decision already defines one.

## Rejected alternatives
Client-side `Math.random()` SO numbers (no authority, collisions, U-11 forensic finding); purely application-generated numbers (no tenant-safe atomicity guarantee); reusing Quote numbers for SOs (confuses two distinct commercial objects).
