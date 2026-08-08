# 32. Execution Plan

The **Execution Plan** is a structural mapping artifact that represents exactly ONE business action.

## Strictly Typed Structure
- `intent`: The business action to execute (e.g., `ASSIGN_DRIVER`).
- `targetEntity`: The primary entity being operated on (if applicable).
- `relatedEntities`: Key-value pair of all resolved UUIDs necessary for the transaction.
- `validationStatus`: `PASS` if all structural payload requirements are met, otherwise `FAIL`.
- `requiredPermissions`: Permissions required for the execution.
- `riskLevel`: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`.
- `steps`: Descriptive (non-executing) sequence for UI display.
- `confirmationRequirements`: Any specific confirmations required from the user before execution.
- `executionPayload`: The strictly-typed object ready to be passed to the Application Service.
- `explainabilityMetadata`: Rich metadata explaining *why* the plan was formulated.
- `isReadyForExecution`: Boolean indicating if the plan structurally validates and is fully ready.

The execution plan represents the structural readiness of the intent, without attempting to enforce domain state.
