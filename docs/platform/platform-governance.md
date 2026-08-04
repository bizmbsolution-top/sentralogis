# Enterprise Constitution (Platform Governance)

## Architecture Rules
1. **SOLID**: Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion.
2. **Clean Architecture**: Entities at the core, Infrastructure at the edge.
3. **DDD**: Aggregate Roots dictate transaction boundaries.
4. **CQRS**: Commands alter state, Queries return DTOs.
5. **Dependency Injection**: Dependencies are injected via constructor.

## Naming & Folders
- Folders: `kebab-case`
- Classes: `PascalCase`
- Methods: `camelCase`

## Breaking Change Policy
Backward compatibility must be preserved via Shims or versioned APIs. Deprecation requires a 2-phase release cycle.

## AI Development Rules
Cursor, Codex, ChatGPT must NOT bypass strict typing. `any`, `ts-ignore`, and `eslint-disable` are banned.