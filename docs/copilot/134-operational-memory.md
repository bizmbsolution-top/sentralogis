# 134. Operational Memory

The Copilot introduces three independent memory abstractions:

1. **`SessionMemory`**: Bound to the active `ConversationContext`. Remembers user inferences and active intents across multi-turn interactions.
2. **`WorkspaceMemory`**: Bound to the active `WorkspaceContext`. Tracks the active UI selections (pinned jobs, drivers, vehicles) and active dashboards.
3. **`OperationalMemory`**: Bound to real-time fleet state. Provides lookups for delayed jobs, geofence breaches, and waiting PODs.

## Strict Immutability
All memory abstractions are **read-only wrappers**. They expose deterministic query accessors but contain absolutely zero mutation capability, ensuring the LLM cannot directly alter system state.
