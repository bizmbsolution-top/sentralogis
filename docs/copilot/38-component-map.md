# 38. Component Map

The Phase 4A.4.1 Cockpit introduces several new contextual components.

## Layout
- **`app/(dashboard)/copilot/page.tsx`**: The orchestrator. Holds the main layout flexbox.

## Workspace (Left)
- **`ConversationWorkspace`**: The scrolling container for messages.
- **`CopilotHeader`**: Modified to show System Status and Refresh indicator.
- **`CopilotInput`**: Modified with a "voice-ready" placeholder and file attachment thumbnails via `UploadPreviewCard`.
- **`TimelineCard`**: A chronological display of operational events for a specific job order.
- **`UploadPreviewCard`**: A mini thumbnail component for files pending upload inside the input area.

## Context (Right)
- **`OperationalContextPanel`**: The vertical sidebar container.
- **`ActiveContextCard`**: Displays the currently focused entity (Job Order).
- **`RecentExecutionCard`**: A list of recently executed `ExecutionPlan`s (e.g., "Assigned Driver Budi - 2m ago").
- **`PinnedJobsCard`**: A manual list of Job Orders the operator wants to keep an eye on.
- **`AlertPanel`**: Displays systemic alerts (e.g., "GPS offline for 2 fleets").

## Existing Components (Retained from 4A.4)
- `ActionProposalCard`, `ExecutionResultCard`, `ExplainabilityPanel`, `GuardrailPanel`, `ConfidenceBadge`, `ConversationBubble`, `ThinkingIndicator`, `QuickCommandPanel`.
