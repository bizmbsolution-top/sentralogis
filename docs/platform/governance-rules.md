# SentraForge Engineering Constitution

## Architecture Rules
1. **SOLID**: Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion.
2. **Clean Architecture**: Presentation -> Application -> Domain -> Platform -> Shared Kernel.
3. **CQRS**: Commands alter state, Queries read state. Never mix them.

## Dependency Rules
- UI MUST NEVER depend on Database or Infrastructure directly.
- Platform MUST NEVER depend on Business Domains.

## Coding Rules
- Strictly typed TypeScript. No `any`, `unknown`, or `ts-ignore`.
- Domain validation MUST use `Result<T>` and NEVER `throw new Error()`.

## DDD Rules
- **Aggregates**: Define transaction boundaries. State mutations emit Domain Events.
- **Entities**: Mutable only via controlled domain methods. Identified by Unique ID.
- **Value Objects**: Strictly immutable (readonly properties, no setters).

## Naming & Folder Rules
- Folders: `kebab-case`
- Classes: `PascalCase`
- Interfaces: Prefixed with `I` (e.g., `IStateMachine`)
- Methods: `camelCase`

## Testing Rules
- NOT VERIFIED. (Awaiting Phase execution).

## Code Review Checklist
- Does it breach dependency flows?
- Are exceptions used for business logic?
- Are objects mutated directly instead of via `Result<T>` methods?
