# Enterprise Domain Kernel Architecture

## Purpose
The **Enterprise Domain Kernel** (located in `src/shared/`) is the foundational toolkit for all future business domains in SentraForge. It implements strict **Domain-Driven Design (DDD)** principles to decouple business logic from framework concerns (like Next.js or Supabase).

## DDD Primitives

### Aggregate Root & Entity Lifecycle
`AggregateRoot<T>` acts as the transactional boundary for a group of entities.
- **Why it exists**: It ensures that invariants (business rules) spanning multiple related entities are enforced synchronously.
- **Entity Lifecycle**: Entities extend `Entity<T>` which tracks unique identity and tenant awareness. Entities are born through Aggregate factories, mutated via encapsulation, and persisted exclusively through the Aggregate Root.

### Value Objects
`ValueObject<T>` defines immutable concepts whose equality is determined by their properties, not their identity.
- E.g., `TenantId`, `OrganizationId`. By making IDs Value Objects, we eliminate "Primitive Obsession", preventing bugs where a `UserId` string is accidentally passed as a `TenantId` string.

## Control Flow & Resilience Patterns

### Result Pattern
The `Result<T>` pattern eliminates `try/catch` exceptions for predictable domain failures. Business logic returns `Result.fail("reason")` instead of throwing, making control flow explicit and type-safe.

### Guard Pattern
The `Guard` utility centralizes defensive programming. It asserts preconditions (e.g., `againstNull`, `againstEmptyString`) before a Value Object or Entity can be constructed.

### Specification Pattern
The `Specification<T>` pattern encapsulates complex business rules into objects that can be chained using `and()`, `or()`, and `not()`. This prevents repetitive `if` statements across Use Cases.

## Infrastructure Abstractions

### Repository Pattern & Unit of Work
`IRepository<T>` defines how Aggregates are saved, completely agnostic of Supabase or Postgres. `IUnitOfWork` will allow us to coordinate multi-repository transactions safely once we implement advanced infrastructure layers.

## Event-Driven Architecture (EDA)

### Domain vs Integration Events
- **DomainEvents**: Fired *within* a microservice/domain to trigger side effects (e.g., Work Order created -> send internal notification). Managed directly by the `AggregateRoot`.
- **IntegrationEvents**: Abstracted via `IIntegrationEventPublisher`. Fired *across* boundaries to notify other systems.

### Future CQRS & Kafka Compatibility
Because all state mutations yield a `DomainEvent`, SentraForge is **Event Sourcing Ready**. 
The kernel interfaces (`IIntegrationEventPublisher`) guarantee that in the future, if SentraForge migrates from Supabase to a Kafka/EventBridge event streaming architecture, the Domain Layer will require **zero code changes**. We simply inject a Kafka implementation into the `IIntegrationEventPublisher` contract at the infrastructure layer.
