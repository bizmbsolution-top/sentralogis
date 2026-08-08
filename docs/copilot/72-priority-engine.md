# 72. Priority Engine

The `OperationalPriorityEngine.ts` deterministically scores the urgency of a job order based on its active operational insight.

## Deterministic Scoring
Instead of asking an LLM to guess which job is most important, the engine uses a static weight model. For example, a `LATE_DEPARTURE` situation adds a base score of 85, while `MISSING_POD` adds 30. Additional points are added for specific SLA risks.

The result is a priority level (`URGENT`, `HIGH`, `NORMAL`, `LOW`) and an explicit `requiresImmediateAttention` boolean flag, allowing the UI to confidently highlight critical jobs.
