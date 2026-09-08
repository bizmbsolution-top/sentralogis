# ADR-033 — Service Request is a Command, Not a Job (SR ≠ JO)

**Status:** RATIFIED (Phase 4B-0 gate; forensic evidence complete) · **Date:** 2026-08-25

## Context
`svc_service_requests` carries message semantics: idempotency keys, correlation/causation ids, an ISSUED→ACCEPTED→FULFILLED state machine, SLA targets, polymorphic payload JSONB, and a deliberately loose pointer `assigned_domain_job_id UUID` (no FK) documented as "trk_job_orders.id, cus_declarations.id, etc.". Runtime behavior today (`issueRequest(autoDispatch=true)` → adapter executes immediately → dispatcher writes back the domain job id) resembles a synchronous 1:1 creator-wrapper.

## Problem
Is a Service Request the same concept as a Job Order / domain execution object? Mapping them 1:1 would collapse orchestration semantics into execution semantics.

## Decision
**Service Request = independent cross-domain COMMAND MESSAGE. The domain job (JO, declaration, …) is its RESULT.**

Rules established:
1. SR owns request identity, idempotency, SLA, correlation; the domain job owns operational lifecycle inside its SBU.
2. Binding between them is the loose pointer plus (for customs) the forward `service_request_id`; it must remain polymorphic — never FK to one concrete table.
3. One SR may produce at most one primary domain job today; the model does not promise 1:1 forever (multi-job fulfillment may be introduced without schema change via additional pointers/events).
4. Adapters must preserve lineage: a created domain job MUST reference its originating engagement/case lineage (trucking adapter repair, U-07) — this ADR mandates lineage correctness as part of "command produces result".
5. Compensation semantics stay with adapters (cancel/reject on dispatch failure).

## Consequences
✅ Orchestrators (forwarding execution plans, future commercial activations) command SBUs uniformly.
✅ Customs remains sovereign while being commanded.
⚠ Adapter discipline required: every new target domain must implement execute + compensate + lineage write-back.

## Rejected alternatives
Treating SR as a JO subtype/alias (collapses two lifecycles); making SR rows themselves executable (violates SBU sovereignty); FK from SR to legacy `work_orders` (violates ADR-018/LAW-3).
