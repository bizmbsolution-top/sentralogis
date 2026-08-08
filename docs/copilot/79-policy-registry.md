# 79. Policy Registry

The `DecisionPolicyRegistry.ts` acts as the single source of truth for all advisory configurations.

## Architecture Rule
As mandated by the SentraForge Constitution, the Copilot must not hardcode conditional logic (`if intent === X`) inside its engines. The Policy Registry externalizes this logic. If a new trucking action is added, developers merely add a new `DecisionPolicy` object to the registry without touching the core engine.
