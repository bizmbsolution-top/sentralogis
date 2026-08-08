# 61. Context Engine

The `OperationalContextEngine.ts` bridges raw operational data (Timeline, GPS tracking) into semantic operational meaning.

## How it Works
It takes raw arrays of `TimelineEvent` objects and evaluates them against hardcoded threshold rules. For example, if the latest event is `ARRIVED`, and `4 hours` have passed without a `POD`, it outputs the `WAITING_UNLOADING` situation.

Crucially, this is executed purely via TypeScript logic, not by sending the timeline to an LLM for interpretation. This guarantees zero hallucinations when analyzing operational bottlenecks.
