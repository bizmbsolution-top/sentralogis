# Sentralogis Copilot MVP - Architecture Roadmap

## 1. Phase 4A.1: Orchestration Core
- Implement `CopilotOrchestrator` inside `src/application/copilot/`.
- Integrate LLM SDK for Intent Parsing (JSON Schema enforcement).
- Define `CopilotIntent` interfaces based on Catalog.

## 2. Phase 4A.2: UI Development
- Create `/copilot` page in Next.js.
- Build chat interface components (`CopilotMessage`, `ActionSuggestionCard`).
- Wire UI to Orchestrator API endpoint.

## 3. Phase 4A.3: Command Handlers (Read-Only)
- Implement Handlers for `ExecuteStatusQueryCommand` and `ExecuteFindEntityQueryCommand`.
- Connect Orchestrator to `DriverPortalQuery` to resolve entities.
- Validate read-only journeys.

## 4. Phase 4A.4: Command Handlers (Mutations)
- Implement Handlers for `ProposeJobAssignmentCommand` and `ProposeJobDataUpdateCommand`.
- Connect to `JobOrderService`.
- Implement user confirmation loop (UI prompt -> Approve -> API Execution).

## 5. Phase 4A.5: OCR Integration
- Integrate Vision API (e.g., Google Cloud Vision or Gemini Pro Vision).
- Map extracted bounding boxes/text to OCR regex validators.
- Wire to `ExtractOperationalDataIntent`.
