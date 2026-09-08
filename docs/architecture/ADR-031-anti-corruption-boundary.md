# ADR-031 — Anti-Corruption Boundary Between Canonical Foundation and Operational Application

**Status:** RATIFIED (Architecture Gate, Phase 4B-0) · **Date:** 2026-08-25

## Context
Stage R deployed the canonical foundation (`md_tenants → commercial_work_orders → line_items → capability_bindings → svc_service_requests → shp_*/cus_*`). The live application still runs entirely on the legacy chain (`work_orders/wo_items/job_orders`), written by ~107 sites — many browser-direct under RLS, several service-role routes trusting body/header tenant. Two architectural generations must coexist for years without contaminating each other.

## Problem
How should the application layer address the canonical foundation so that legacy concepts (WO/JO/SBU-branch thinking, free-text statuses, inline prices) cannot leak into the canonical domain, while the legacy engine keeps operating?

## Options
1. Let canonical tables be queried/written directly from pages and legacy services (status quo direction).
2. Big-bang rewrite of UI/API/data access onto canonical schema.
3. **Anti-Corruption Layer: thin application-service + adapter seam between route handlers and domain services.**

## Decision
**Option 3.** Composition chosen from repository reality:
- **Application API** = `/api/v1` handlers (auth, validation, shaping only);
- **Application Services** = use-case functions (new `lib/application/**`) owning authorization + tenant context;
- **Domain Services** = existing `lib/domain/*`;
- **ACL Adapters** (`lib/adapters/**`): `EngagementBridgeAdapter` (legacy WO ⇄ engagement), `ExecutionLineageAdapter` (SR ⇒ domain job with lineage), `StatusTranslator`.
Rules: adapters are the ONLY code touching both generations; canonical services never import legacy table names; tenant context enters exclusively as a resolved value object; DTOs cross boundaries; row types stay in repositories.

## Consequences
✅ Incremental strangler; protected systems untouched; testable seams.
⚠ New small layer to maintain; import-boundary lint gates required (Backlog U-10).

## Rejected alternatives
Big-bang rewrite (violates continuity + risk profile); direct dual-writes without adapters (guarantees semantic contamination); database-level federation views as primary mechanism (insufficient for behavior).

## Migration impact
Defines 4B-1 wave structure (Gate §23): resolver hardening → bridge core → registry → lineage → fabricated-ID elimination.
