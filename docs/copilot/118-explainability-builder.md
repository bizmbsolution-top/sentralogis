# 118. Explainability Builder

The `ExplainabilityBuilder` safely orchestrates the creation of `ExplainabilityData` payloads.

## Why it Exists
Prior to the builder, the `ExplainabilityGenerator` manually manipulated arrays (e.g. `warnings.push(...)`). This violated immutability principles and made the generator highly prone to side-effects and mutation bugs.

## Usage
The builder enforces a fluent, immutable pipeline.

```typescript
const builder = ExplainabilityBuilder.create()
  .setProposedReason('You requested a cancellation')
  .addWarning('No active job found.')
  .addBlockingErrors(['Invalid Intent']);

const explanation = builder.build();
```

All arrays are strictly cloned on output, ensuring that the resulting `ExplainabilityData` is perfectly safe to pass to React UI threads.
