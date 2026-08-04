# Workflow Engine Architecture Blueprint

## 1. Problem Statement
The current JobOrder Aggregate implementation validates status transitions through hardcoded conditional blocks mapping directly to the `JobOrderStatus` enum. While this satisfies the Minimum Viable Operational Workflow for the Trucking bounded context, it is tightly coupled to a single SBU's lifecycle. As the SentraForge Enterprise Logistics platform expands to include Warehouse, Forwarding, Depot, Customs, and Cold Chain operations, a monolithic hardcoded status enum and rigid `if/else` transition checks will become unmaintainable and violate the Open-Closed Principle.

## 2. Current Workflow
The current verified Trucking Job Order lifecycle operates as follows:
`PENDING_ASSIGNMENT` → `ASSIGNED` → `DRIVER_ACCEPTED` → `IN_PROGRESS` → `DELIVERED` → `POD_SUBMITTED` → `COMPLETED`

**Evidence of implementation coupling:**
```typescript
public startMission(): Result<void> {
  if (this.props.status !== JobOrderStatus.DRIVER_ACCEPTED) {
    return Result.fail<void>('JobOrder must be DRIVER_ACCEPTED to start mission.');
  }
  this.props.status = JobOrderStatus.IN_PROGRESS;
  return Result.ok<void>();
}
```

## 3. Identified Limitations
- **Tight Coupling:** The Aggregate is intrinsically tied to a specific sequence of states (`JobOrderStatus`).
- **SBU Inflexibility:** Different SBUs require completely different workflows (e.g., Warehouse requires `Receiving` → `Putaway`, Depot requires `Gate In` → `Stacking`). A unified Aggregate cannot realistically hardcode all possible SBU transitions without becoming a God Object.
- **Dynamic Transition Rules:** Hardcoded blocks cannot easily support dynamic business rules (e.g., skipping `POD_SUBMITTED` for internal fleet transfers, or requiring conditional approval steps).

## 4. Proposed Architecture
A generic **Workflow Engine** pattern should be introduced to decouple the Aggregate from the specific state machine topology.

### Target Interfaces
```typescript
interface WorkflowState {
  code: string;
  name: string;
}

interface TransitionPolicy {
  isSatisfiedBy(aggregate: AggregateRoot): boolean;
}

interface WorkflowTransition {
  from: WorkflowState;
  to: WorkflowState;
  policies: TransitionPolicy[];
}

interface WorkflowDefinition {
  domain: string; // e.g., 'trucking', 'warehouse'
  transitions: WorkflowTransition[];
  
  canTransition(currentState: string, targetState: string, aggregate: AggregateRoot): Result<void>;
}
```

### Future Aggregate Interaction
Instead of hardcoded rules, the Aggregate delegates transition validation to the injected or referenced `WorkflowEngine`:

```typescript
public transitionTo(targetState: string, engine: WorkflowEngine): Result<void> {
  const result = engine.canTransition(this.props.status, targetState, this);
  if (result.isFailure) return result;
  
  this.props.status = targetState;
  return Result.ok<void>();
}
```

## 5. Migration Strategy
1. **Define SBU Workflows:** Create specific `WorkflowDefinition` configurations for Trucking, Warehouse, etc.
2. **Abstract Current Enum:** Refactor `JobOrderStatus` into a more generic state representation (e.g., string or a value object).
3. **Deprecate Hardcoded Methods:** Gradually replace specific methods (`acceptByDriver()`, `startMission()`) with a generic, domain-event-emitting transition method (`transitionTo(newState)`).
4. **Implement Transition Policies:** Extract existing validation logic (e.g., "Must have driver assigned to accept") into isolated `TransitionPolicy` classes.

## 6. Backward Compatibility & Risks
- **Backward Compatibility:** The migration can be done in a non-breaking way by leaving the existing `JobOrder` methods intact but internally having them call the `WorkflowEngine` to evaluate the transition. Once stabilized, the legacy methods can be safely deprecated.
- **Risks:** 
  - Over-engineering: If only Trucking is migrated, the engine adds unnecessary abstraction. It should only be prioritized when a second complex SBU (like Warehouse or Forwarding) is brought onto the same aggregate root (or a shared `Mission` aggregate).
  - Database Mapping: Legacy read-models that depend on specific enum string values in the database must be carefully managed when state values become dynamic.
