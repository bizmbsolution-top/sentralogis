# 73. Focus Queue

The `FocusQueueEngine.ts` is responsible for sorting an array of `OperationalPriority` objects.

## Attention Filtering
By calling `getTopAttentionJobs`, the system filters out low-priority items and returns only jobs with `requiresImmediateAttention = true`, sorted strictly by `priorityScore` descending. This guarantees the operator always sees the single most critical failure mode in the network first.
