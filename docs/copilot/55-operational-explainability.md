# 55. Operational Explainability

Before any mutation occurs, the UI must render an `ActionProposalCard` and `ExplainabilityPanel`.

## Requirements
The payload explicitly defines:
1. What the user asked for.
2. What database entities were resolved (with UUIDs).
3. What validations passed (e.g. Tenant, Permissions).
4. Why this action is risky or requires human confirmation.

If the user does not click "Confirm", the `ExecutionEngine` is never invoked.
