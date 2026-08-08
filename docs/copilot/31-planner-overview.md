# 31. Planner Overview

The **Planner Layer** acts as an orchestration preparation layer between the `Business Context Engine` and the underlying Trucking Application Services.

## Non-Workflow Constrains
The Planner is **NOT** a generic workflow engine. It strictly adheres to the following constraints:
- **Single Action Only**: An ExecutionPlan represents exactly one business action (e.g., `ASSIGN_DRIVER`).
- **No Business Rules**: The Planner does not evaluate domain rules (like "Is Driver Active?"). All business rules remain exclusively inside Application Services and Domain Aggregates.
- **No Dynamic Branching**: No state machines, graph nodes, or generic runtime activities exist in the planner.

## Architecture Flow
```
Intent -> Resolved Business Context -> Planner -> (Future) Application Service Execution
```

The Planner leverages a Registry/Strategy pattern (`ActionPlanner`) to map specific business intents (like `ASSIGN_DRIVER`) directly into a strictly validated `ExecutionPayload`.
