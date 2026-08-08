# 122. Explainability Runtime Encapsulation

The Explainability tier of the Sentralogis Copilot guarantees completely safe, deterministic explanations that never manipulate state.

## Core Rules
1. **ExplainabilityData is Frozen**: The resulting payload `ExplainabilityData` is passed through `Object.freeze()`, ensuring both the parent object and all its internal arrays cannot be modified.
2. **Immutable Assembly**: `ExplainabilityBuilder` strictly clones arrays using the spread operator (`[...warnings]`) when assigning to its internal state, and again when building the output.
3. **No Generator Side-Effects**: `ExplainabilityGenerator` no longer pushes into mutable arrays. It merely delegates inputs to the `ExplainabilityDirector`.
