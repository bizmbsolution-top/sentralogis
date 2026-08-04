# Platform Contracts

## Canonical Interfaces
The platform provides universal generic interfaces defining boundaries for business domains:
- `IStateMachine<TStatus, TEntity>`
- `IAttachmentProvider<TEntity>`
- `ITimelineProvider<TEntity, TPayload>`
- `ITrackingProvider<TEntity>`
- `IAssignmentProvider<TEntity>`
- `IApprovalProvider<TTarget>`
- `INotificationProvider<TTarget>`
- `IAuditProvider<TEntity>`

These are implemented by AggregateRoots within the platform and depend only on the Shared Kernel.

## Responsibilities & Expected Implementations
These interfaces must be implemented by Platform Aggregates.

## Dependency Direction
`Application -> Domain -> Platform -> Shared Kernel`

## Extension Strategy
Interfaces are open to extension via Decorators or Strategy injections, but closed to modification.

## Versioning Policy
Breaking changes to these interfaces require a major version bump in the internal architecture semver.