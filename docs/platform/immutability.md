# Immutability

## Readonly Enforcements
1. Collections return `ReadonlyArray<T>`.
2. Entity and Aggregate properties use the `readonly` modifier.
3. ValueObjects are fully immutable without setters.
4. Constructors are private; instantiation uses `static create()` and `static restore()` methods.

## Controlled Mutations & Aggregate Consistency
State changes must only occur through domain methods (e.g., `engine.transition()`) which evaluate invariants before mutating internal state and emitting a Domain Event. Public setters are strictly prohibited.