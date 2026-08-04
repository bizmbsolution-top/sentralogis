# Sentralogis Copilot MVP - Information Architecture

## 1. Application Navigation
Copilot acts as an auxiliary operational module running parallel to standard Dashboards.

```text
/app
 ├── /dashboard (Existing analytical charts)
 ├── /work-orders (Existing CRUD grids)
 ├── /job-orders (Existing CRUD grids)
 └── /copilot (NEW: Dedicated Smart Workspace)
```

## 2. Component Hierarchy (Copilot Page)

- **`CopilotLayout`**
  - **`CopilotHeader`**: Title, context toggle (e.g., Tenant selector).
  - **`CopilotHistory`**: Scrollable chat/feed history of interactions.
    - **`UserMessage`**: Plain text or thumbnail of uploaded file.
    - **`AiResponse`**: Conversational text.
    - **`ActionCard`**: The interactive "Suggestion" block.
    - **`ExecutionResultCard`**: Success/Failure status after action.
  - **`CopilotInputBar`**: 
    - Text Area (supports multi-line paste).
    - File Upload Button (Image, PDF, Excel).
    - Submit Button.

## 3. Data Flow Architecture

```mermaid
flowchart TD
    UI[Copilot UI] --> API[Copilot API Endpoint]
    API --> IntentParser[AI Intent Parser / LLM]
    IntentParser --> Orchestrator[Copilot Orchestrator]
    
    Orchestrator -- Validates Entities --> QueryService[Read Models]
    Orchestrator -- Proposes Action --> UI
    
    UI -- User Confirms Action --> Orchestrator
    Orchestrator -- Executes --> AppService[Application Services (JobOrder, WorkOrder)]
    AppService -- Validates Rules --> Aggregate[Domain Aggregate]
    Aggregate -- Mutates State --> Repository[Repository]
    Repository --> DB[(PostgreSQL)]
```
