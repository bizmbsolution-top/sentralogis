# ADR-092 PHASE 4 ASSIGN_DRIVER PRODUCTION CONTROLLED ROLLOUT PLAN

**Date:** 2026-09-08  
**Status:** GREEN — PRODUCTION ROLLOUT PLAN READY  
**Scope:** ASSIGN_DRIVER production controlled rollout  
**Authorization:** I AUTHORIZE SENTRALOGIS ADR-092 PHASE 4 ASSIGN_DRIVER PRODUCTION CONTROLLED ROLLOUT.

---

## 1. Executive Summary

ADR-092 Phase 1-3 are complete and accepted:
- Phase 1: EXECUTE → canonical domain wiring (GREEN)
- Phase 2: Forensic readiness gate (GREEN — ASSIGN_DRIVER rollout ready)
- Phase 3: Integration/E2E acceptance (GREEN — INTEGRATION/E2E ACCEPTED)

Phase 4 prepares the controlled production rollout of `ASSIGN_DRIVER` with the feature flag `COPILOT_EXECUTE_ASSIGN_DRIVER`.

**Current state:** All flags OFF by default. Production has no behavioral change until the flag is explicitly enabled.

---

## 2. Rollout Strategy

### 2.1 Incremental Enablement

**Step 1 — Staging Validation**
- Set `COPILOT_EXECUTE_ASSIGN_DRIVER=true` in staging environment
- Run Phase 3 Integration/E2E suite against staging
- Monitor execution boundary for expected behavior
- Validate rollback by setting flag to `false`

**Step 2 — Production Canary**
- Enable `COPILOT_EXECUTE_ASSIGN_DRIVER=true` in production
- Monitor for 7 days with feature flag enabled
- Track: execution success rate, domain mutation success rate, audit trail completeness, failure propagation

**Step 3 — Full Production**
- If canary is successful, maintain flag enabled
- If issues detected, rollback by unsetting flag

### 2.2 Feature Flag Mechanism

The feature flag is implemented in `lib/copilot/feature-flags.ts`:
```typescript
export function isCopilotActionEnabled(action: keyof typeof COPILOT_FEATURE_FLAGS): boolean {
  const flag = COPILOT_FEATURE_FLAGS[action];
  if (!flag) return false;
  return isFeatureEnabled(flag.envVar);
}
```

When `COPILOT_EXECUTE_ASSIGN_DRIVER` is unset or not `'true'/'1'/'yes'`, the EXECUTE boundary returns:
```
Error: Copilot action ASSIGN_DRIVER is not enabled. Set COPILOT_EXECUTE_ASSIGN_DRIVER=true to enable.
```

This ensures zero domain mutations occur when disabled.

---

## 3. Environment Configuration

### 3.1 Current State

```text
ASSIGN_DRIVER: OFF (default; env var COPILOT_EXECUTE_ASSIGN_DRIVER unset)
CANCEL_JOB: OFF (default; env var COPILOT_EXECUTE_CANCEL_JOB unset)
REPLACE_DRIVER: OFF (default; env var COPILOT_EXECUTE_REPLACE_DRIVER unset)
```

### 3.2 Staging Configuration

```text
COPILOT_EXECUTE_ASSIGN_DRIVER=true
COPILOT_EXECUTE_CANCEL_JOB=false
COPILOT_EXECUTE_REPLACE_DRIVER=false
```

### 3.3 Production Configuration (Post-Rollout)

```text
COPILOT_EXECUTE_ASSIGN_DRIVER=true
COPILOT_EXECUTE_CANCEL_JOB=false
COPILOT_EXECUTE_REPLACE_DRIVER=false
```

### 3.4 Rollback Configuration

```text
COPILOT_EXECUTE_ASSIGN_DRIVER=false
# or unset the variable
```

---

## 4. Deployment Checklist

### 4.1 Pre-Deployment

- [ ] Phase 3 Integration/E2E suite passes: 10/10 PASS
- [ ] Full regression baseline verified: 1541/1549 PASS, 8 FAIL (0 new failures)
- [ ] Staging environment configured with `COPILOT_EXECUTE_ASSIGN_DRIVER=true`
- [ ] Rollback procedure documented and tested
- [ ] Monitoring/alerting configured for:
  - EXECUTE success/failure rate
  - Domain mutation success/failure rate
  - Feature flag state changes
  - Audit trail completeness

### 4.2 Deployment Steps

1. **Deploy code to staging**
   - Code changes are already committed (Phase 1-3)
   - No new code changes required for flag enablement

2. **Enable flag in staging**
   - Set `COPILOT_EXECUTE_ASSIGN_DRIVER=true` in staging environment
   - Verify with Phase 3 test suite
   - Monitor for 24-48 hours

3. **Staging validation**
   - Run happy-path ASSIGN_DRIVER execution
   - Verify feature flag OFF blocks mutation
   - Verify authorization enforcement
   - Verify tenant isolation
   - Verify audit/lineage

4. **Production rollout**
   - Deploy same code to production (already committed)
   - Set `COPILOT_EXECUTE_ASSIGN_DRIVER=true` in production environment
   - Monitor canary for 7 days

5. **Post-rollout validation**
   - Confirm production executions succeed
   - Confirm no unexpected failures
   - Confirm audit trail completeness

### 4.3 Rollback Procedure

If issues are detected:

1. Set `COPILOT_EXECUTE_ASSIGN_DRIVER=false` or unset
2. EXECUTE boundary will return `FAILED` with clear error message
3. Zero domain mutations occur
4. No code changes required
5. No schema changes required
6. No data repair required

---

## 5. Monitoring Requirements

### 5.1 Key Metrics

| Metric | Threshold | Action |
|--------|-----------|--------|
| EXECUTE success rate | < 95% | Investigate immediately |
| Domain mutation success rate | < 95% | Investigate immediately |
| Feature flag state | Unexpected changes | Alert on flag changes |
| Audit trail completeness | Missing records | Investigate immediately |
| Cross-tenant attempts | Any detected | Investigate immediately |

### 5.2 Log Fields to Monitor

```text
executionId
status (SUCCESS/FAILED/DENIED)
intent (ASSIGN_DRIVER)
actorUserId
actorTenantId
proposalId
domainError (if FAILED)
domainErrorCode (if FAILED)
```

---

## 6. Risk Assessment

### 6.1 Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Feature flag accidentally enabled prematurely | Low | Medium | Flag defaults to OFF; requires explicit env var |
| Domain mutation failure | Low | High | Canonical service has validation; EXECUTE propagates failure |
| Authorization bypass | Very Low | Critical | Two-layer auth enforced; canonical service validates |
| Cross-tenant mutation | Very Low | Critical | Tenant isolation enforced at domain layer |
| Audit trail loss | Low | Medium | Domain service records tracking; EXECUTE records audit |

### 6.2 Mitigations

- Feature flag OFF by default prevents accidental activation
- Two-layer authorization ensures both Copilot and domain checks
- Tenant isolation enforced at domain layer (`fetchJoById(context.tenantId, ...)`)
- Domain service records `job_tracking` for every mutation
- EXECUTE boundary records `audit.log` for every execution
- Rollback is immediate by unsetting flag

---

## 7. Authorization Boundary

### 7.1 Authorized by Phase 4

- Enable `COPILOT_EXECUTE_ASSIGN_DRIVER=true` in staging
- Enable `COPILOT_EXECUTE_ASSIGN_DRIVER=true` in production
- Monitor production executions
- Rollback by unsetting flag

### 7.2 NOT Authorized by Phase 4

- D-02 ContextEnricher identity fix
- PROPOSE MockVisionAdapter removal
- CANCEL_JOB rollout
- REPLACE_DRIVER rollout
- Schema changes
- Migration changes
- Production code changes beyond flag enablement

---

## 8. Acceptance Criteria

Phase 4 is GREEN when:

### A1 — Staging Validation Passes
Phase 3 Integration/E2E suite passes in staging environment.

### A2 — Production Canary Successful
7-day canary with no critical issues.

### A3 — Rollback Tested
Rollback procedure verified in staging.

### A4 — Monitoring Active
All key metrics are being collected and alerting is configured.

### A5 — Documentation Complete
This rollout plan is approved and accessible to operations team.

---

## 9. Next Steps

1. **Operations team** to set `COPILOT_EXECUTE_ASSIGN_DRIVER=true` in staging environment
2. **QA team** to validate Phase 3 suite in staging
3. **Operations team** to set `COPILOT_EXECUTE_ASSIGN_DRIVER=true` in production after staging validation
4. **Monitoring team** to watch key metrics for 7 days
5. **Architecture team** to prepare Phase 5 (CANCEL_JOB rollout) under separate authorization

---

## 10. Change Ledger

```text
Production code changes: 0 (all changes already committed in Phase 1-3)
Schema changes: 0
Migration changes: 0
Data changes: 0
Test changes: 0 (Phase 3 tests already committed)
E7 changes: 0
E9 changes: 0
ADR-090 changes: 0
ADR-091 changes: 0
Configuration changes: Pending (environment variable enablement)
```

---

**END OF PHASE 4 ROLLOUT PLAN**
