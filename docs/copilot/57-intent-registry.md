# 57. Intent Registry

The `IntentRegistry` eliminates the need for hardcoded `if/switch` blocks in the Copilot orchestration layer.

## Why Registry-Based Validation?
Previously, the `BusinessValidationBridge` contained logic like `if (intent === 'ASSIGN_DRIVER') { checkJobOrder(); }`. This was turning the Copilot into a secondary repository of business rules, violating the SentraForge Constitution.

Now, all intents are registered as generic configuration objects:
```ts
{
  name: 'ASSIGN_DRIVER',
  requiredEntities: ['JobOrder', 'Driver'],
  requiredPermissions: ['JobOrder.Update']
}
```

The Copilot simply reads this configuration and performs structural validation (e.g. checking that the required entities exist in the resolved list), ensuring no business domain logic leaks into the AI Orchestration layer.
