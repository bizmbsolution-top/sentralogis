# 53. Entity Resolution

The `EntityResolver` is the first guardrail against LLM hallucinations.

## Resolution
If the LLM says the driver is "Budi Santoso", the `EntityResolver` queries the database. 
If "Budi Santoso" does not exist in this tenant's directory, the resolution marks the entity as `valid: false`.

The `BusinessValidationBridge` will immediately intercept this and abort the operation. The LLM cannot invent entities.
