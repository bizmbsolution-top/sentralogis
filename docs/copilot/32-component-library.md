# 32. Component Library

To maintain consistency and modularity, the Smart Workspace relies on a dedicated set of components located in `components/copilot/`.

## Key Components

- **`CopilotChat`**: The main scrolling viewport for the conversation.
- **`CopilotHeader`**: Persistent top bar showing tenant, user info, and quick KPIs (active jobs, online drivers).
- **`CopilotInput`**: Advanced text area supporting multi-line input, image paste (Ctrl+V), and drag-and-drop.
- **`CopilotSidebar`**: Optional right-hand panel displaying execution history and active entity focus.
- **`ConversationBubble`**: Wraps any message (user or assistant) ensuring proper alignment and avatar rendering.
- **`QuickCommandPanel`**: Displays contextual suggestions above the input bar.

### Action Components
- **`ActionProposalCard`**: Renders the `ExecutionPlan` from the backend, displaying risk, confidence, required permissions, and confirmation buttons.
- **`ExecutionResultCard`**: Displays the outcome of a confirmed action, including timeline updates and latency metrics.

### Advisory Components
- **`ExplainabilityPanel`**: Displays the `ExplainabilityMetadata` from the backend plan.
- **`GuardrailPanel`**: Displays non-blocking operational warnings (e.g., "Driver already has max active jobs").
- **`ConfidenceBadge`**: Color-coded badge (Green/Yellow/Red) indicating AI confidence.
- **`FilePreviewCard`**: Renders thumbnails and OCR extraction status for uploaded files (Images, PDF, Excel).
