# 54. Execution Engine

The Copilot does not have its own business logic. 

## Action Bridge
`ActionBridge` maps a semantic `intent` to the correct Application Service method.
`ExecutionEngine.ts` calls that service.

The Copilot does not execute raw SQL. It is simply an orchestrator for the existing Domain Layer.
