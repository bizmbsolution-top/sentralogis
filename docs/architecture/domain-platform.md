# Enterprise Domain Platform Architecture

## Overview
The Enterprise Domain Platform extends the base Kernel to provide a robust CQRS, Event-Driven, and Repository abstraction layer. This platform ensures all future SBUs (Forwarding, Trucking, etc.) share identical architectural patterns and dependency graphs.

## Folder Structure
```text
src/
├── application/           # Application Services, CQRS, Mappers, DTOs
│   ├── commands/
│   ├── queries/
│   ├── handlers/
│   └── interfaces/
├── domains/
│   └── shared/            # Shared Domain Contracts
│       ├── events/
│       ├── factories/
│       ├── policies/
│       ├── repositories/
│       ├── specifications/
│       └── validators/
└── infrastructure/        # Infrastructure implementations
    ├── cache/
    ├── events/
    ├── persistence/
    └── repositories/
```

## Layer Rules & Dependency Rules
- **Domain Layer (`src/domains`)**: The absolute center. Depends on NOTHING external. Contains Entities, Value Objects, and abstract contracts (Interfaces).
- **Application Layer (`src/application`)**: Orchestrates use cases. Depends ONLY on the Domain layer. Uses CQRS patterns to divide reads (Queries) and writes (Commands).
- **Infrastructure Layer (`src/infrastructure`)**: The outermost layer. Implements the contracts defined by Domain and Application layers. Depends on everything.

## Patterns Implemented

### CQRS Flow
Command Query Responsibility Segregation (CQRS) splits the application into `ICommand` (state mutations) and `IQuery` (read operations). Handlers (`ICommandHandler`, `IQueryHandler`) execute these operations, allowing independent scaling and optimization of read vs write paths.

### Event Flow
Domain events are broadcast via `IDomainEventBus` for internal service reactions. Integration events (for external systems) are dispatched via `IIntegrationEventBus`. This architecture is heavily decoupled and ready for Kafka or AWS EventBridge.

### Repository & Mapper Pattern
- `IRepository`, `IReadRepository`, and `IWriteRepository` abstract data persistence.
- `AbstractRepository` provides a base implementation.
- Mappers (`DomainToPersistenceMapper`, `DomainToDtoMapper`) ensure that database schemas and API DTOs never leak into the pure domain entities.

### Factory, Specification, and Policy Patterns
- **Factories**: `AggregateFactory` encapsulates complex entity creation logic.
- **Specifications**: `ISpecification` allows complex boolean rules (e.g., `isSatisfiedBy`) to be chained (`And`, `Or`, `Not`) to prevent spaghetti code.
- **Policies**: `BusinessPolicy` allows the encapsulation of broad enterprise rules that span multiple aggregates or external systems.
