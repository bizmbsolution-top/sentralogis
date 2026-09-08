# ADR-056 — Handoff Idempotency, Retry, & Compensation Governance

**Status:** RATIFIED (U-17A architectural ratification, 2026-08-28)  
**Date:** 2026-08-28  
**Depends on:** ADR-033 (SR Command), ADR-043 (Fulfillment State & Events), ADR-044 (Amendment vs Replanning), ADR-050 (Replanning Isolation), ADR-051 (Operational Handoff Contract)  

---

## 1. Context

Cross-domain operational handoffs are subject to transient network failures, domain rejections, mid-transit disruptions, and operational replanning. A robust, deterministic governance model is required to separate retries, replans, domain rejections, and commercial amendments.

## 2. Decision

**Operational handoffs enforce strict separation between duplicate submission, retry, domain rejection, replanning, and commercial amendment.**

$$\text{Duplicate Submission} \ne \text{Retry} \ne \text{Domain Rejection} \ne \text{Operational Replanning} \ne \text{Commercial Amendment}$$

### 2.1 Governance Dimensions:

1. **Duplicate Submission (Idempotency):**
   - Commands carrying an identical `(tenant_id, idempotency_key)` resolve to the existing `OperationalHandoff` record via PostgreSQL 23505 catch.
   - Zero duplicate operational domain aggregates or jobs are created.

2. **Network Timeout & Retry:**
   - Client retries with the same `idempotency_key` safely return the existing handoff state.

3. **Domain Rejection:**
   - If an operational domain rejects a handoff (e.g. invalid port, expired customs permit, armada unavailability), the handoff transitions to `REJECTED`.
   - The parent commercial Sales Order remains `CONFIRMED` and unchanged.
   - The adapter emits a compensation event to unblock or replan the allocation.

4. **Operational Failure Mid-Transit:**
   - Local disruptions (e.g. vehicle breakdown, customs red line) are resolved within the operational domain without corrupting commercial truth.

5. **Operational Replanning vs Revision:**
   - Replanning creates a new Fulfillment revision (`revision_no = N + 1`, `version_no = N + 1`).
   - Historical revisions and obsolete handoffs remain immutable for complete auditability (ADR-050).

6. **Commercial Amendment:**
   - Commercial changes (price, customer, total quantity) mutate the Sales Order under ADR-044 and trigger versioned fulfillment replanning.

---

## 3. Invariants

1. **No Accidental Commercial Mutation:** Operational disruptions NEVER automatically modify Sales Order terms or prices.
2. **Deterministic Retry:** Idempotency keys protect every operational handoff command.
3. **Audit Immutability:** Historical handoff records remain permanently queryable.
