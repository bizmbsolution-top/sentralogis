# 67. SLA Risk

The `SLARiskAnalyzer.ts` assesses the threat to service level agreements.

## Risk Assessment
While a `MISSING_POD` requires `ATTENTION` health-wise, it poses a `LOW` SLA risk since the actual delivery likely occurred. However, `WAITING_UNLOADING` poses a `HIGH` SLA risk because detention time is actively accumulating against the customer's free-time quota.
