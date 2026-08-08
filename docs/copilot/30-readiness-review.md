# 30 - Readiness Review

## Pre-flight Checklist for Copilot Intent Execution

Before the Business Context Engine allows a `CopilotIntent` to proceed to the Intent Resolver, the following strict conditions MUST be met:

### 1. Entity Completeness
- [x] All entities required by the intent have been resolved to a valid UUID.
- [x] There are no `NOT_FOUND` entities.

### 2. Ambiguity Resolution
- [x] There are no `AMBIGUOUS` entities.
- [x] If soft matches occurred, a `ContextWarning` is attached to the payload (which may trigger a confirmation dialog in the UI).

### 3. Tenant Boundary Integrity
- [x] Every resolved entity explicitly belongs to `IRequestContext.tenantId`.
- [x] No `TENANT_MISMATCH` errors occurred.

### 4. Payload Structure
- [x] The `ResolvedBusinessContext` object is fully formed.
- [x] The `executionPayload` contains a strict mapping of parameter keys and resolved UUIDs, ready to be consumed by the specific Application Service command.

If ALL checks pass, the Business Context Engine emits `Result.ok(ResolvedBusinessContext)`, and the pipeline proceeds to the Application Layer.
