# 56. Performance Metrics

Every request through `CopilotEngine.ts` is timed via `PerformanceMetrics.ts`.

## Tracked Phases
- `intentResolutionMs`: Time to extract semantic intent.
- `entityResolutionMs`: Time to query DB and validate entities.
- `validationMs`: Time to check business rules and permissions.
- `planningMs`: Time to construct the execution plan and explainability data.
- `totalResponseMs`: Total orchestration overhead.

These metrics are essential for scaling the Copilot and detecting bottlenecks in DB queries vs LLM generation.
