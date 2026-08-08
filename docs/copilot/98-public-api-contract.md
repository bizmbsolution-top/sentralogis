# Public API Contract (v1.0)

The Sentralogis Copilot exposes its intelligence through the following public interfaces:

## 1. Copilot Engine

```typescript
class CopilotEngine {
  static async processCommand(
    userInput: string,
    context: OperationalContext
  ): Promise<CopilotResponse>;
}
```
**Rule**: Never pass individual string IDs (like `userId` or `tenantId`) into the engine. All environment and conversation state must be encapsulated within the `OperationalContext`.

## 2. Intent Resolution

```typescript
class IntentResolver {
  static async resolve(
    userInput: string, 
    context: OperationalContext
  ): Promise<ResolvedIntent>;
}
```

## 3. Entity Resolution

```typescript
class EntityExtractionEngine {
  static async extract(
    intentId: string, 
    userInput: string, 
    context: OperationalContext
  ): Promise<EntityResolutionResult>;
}
```

## Immutable Data Structures

* `ResolvedIntent`: The only format returned by the intent layer.
* `EntityResolutionResult`: The only format returned by the extraction layer.
* `StructuralValidationResult`: The only format returned by the validation layer.
* `ExplainabilityData`: The only format returned by the explainability layer.
