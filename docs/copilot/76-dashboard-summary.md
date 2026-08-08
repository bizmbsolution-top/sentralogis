# 76. Dashboard Summary

The `OperationalDashboardSummary.ts` aggregates all priorities across the tenant network.

## Aggregation
It returns simple metrics: `totalActiveJobs`, `delayedJobs`, `criticalJobs`, `missingPod`, and `jobsAwaitingAttention`. This allows the `CopilotEngine` to generate highly contextual morning greetings (e.g., "Good morning. Today there are 28 active Job Orders, and 1 critical job requiring immediate attention.") the moment the dispatcher opens the Smart Workspace.
