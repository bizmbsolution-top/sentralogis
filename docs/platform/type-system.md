# Type System

## Eradication of Any
The entire platform layer uses `TEntity`, `TStatus`, `TPayload`, and `TTarget` generics.

## Result Pattern
Exceptions are banned for domain validation. All platform operations return `Result<T>` or `Result<void>` from `src/shared/kernel/Result.ts`.

## Value Objects, Entities, Aggregate Roots
All state must be encapsulated within these 3 primitives from the Shared Kernel.
- **Value Objects**: Immutable, compared by value.
- **Entities**: Mutable (controlled), compared by ID.
- **Aggregate Roots**: Transaction boundaries.

## Strict Typing Rules
No `any`. No `unknown`. No mutable collections (arrays, sets, maps).