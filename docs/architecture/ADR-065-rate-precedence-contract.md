# ADR-065 — Rate Precedence Contract

**Status:** RATIFIED (Phase 5C-2R, 2026-09-01)  
**Date:** 2026-09-01  
**Ratified by:** Human Architecture Gate, 2026-09-01  
**Depends on:** ADR-058 (Rate Master Model), ADR-059 (Rate Versioning)  

---

## 1. Context

Phase 5C-2 discovered that no authoritative rule exists for selecting among multiple matching rates. Legacy systems use manual selection (`crm_sbu_customer_rates`) or strict lane matching (`fw_price_master`), but no canonical precedence hierarchy exists.

## 2. Decision

**Explicit precedence hierarchy with specificity scoring and deterministic ambiguity detection.**

### 2.1 Precedence Hierarchy

| Priority | Match Level | Dimensions Required |
|----------|-------------|---------------------|
| 1 (highest) | Exact contract | rate_code + customer + route + service + container |
| 2 | Customer + route + service + container | customer + route + service + container |
| 3 | Customer + service + container | customer + service + container |
| 4 | Customer + service | customer + service |
| 5 | Route + service + container | route + service + container |
| 6 | Route + service | route + service |
| 7 (lowest) | Generic service | service only |

### 2.2 Candidate Eligibility

A rate version is eligible when:
1. `status = 'ACTIVE'`
2. `effective_from <= pricing_date`
3. `effective_to IS NULL OR pricing_date < effective_to`
4. `capability_type` matches the request capability
5. All defined applicability conditions match the context

### 2.3 Selection Rules

1. Filter all rate items to eligible candidates.
2. Group by precedence priority level.
3. Select the group with the highest priority (lowest number).
4. If multiple candidates remain in the same priority level, the one with the most specific dimension match wins.
5. If two candidates remain equally authoritative, return `PRICING_AMBIGUOUS` error.

### 2.4 Anti-Rules

1. **Never** use `ORDER BY created_at LIMIT 1` as a tie-breaker.
2. **Never** select arbitrarily among equally valid candidates.
3. **Never** use hidden database ordering for precedence.
4. **Never** allow client-selected rate version to bypass precedence.

## 3. Invariants

1. Rate selection is deterministic for identical inputs.
2. Ambiguity produces an error, not a silent choice.
3. Higher-priority rates always win over lower-priority rates.
4. Specificity resolves within the same priority level.

## 4. Security Implications

1. Precedence rules are server-side authority.
2. Clients cannot override precedence.
3. Selected rate version is recorded for audit.

## 5. Data Model Implications

1. Rate items must store all precedence dimensions (customer, route, service, container).
2. `applicability_conditions` JSONB may store additional matching criteria.
3. SO line items must store the selected `rate_version_id` for lineage.

## 6. Testing Requirements

1. Test each priority level produces the expected winner.
2. Test ambiguity detection when two candidates have equal precedence.
3. Test ineligible candidates (inactive, wrong effective date) are excluded.
4. Test deterministic output for repeated identical inputs.
