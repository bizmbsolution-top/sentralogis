# Sentralogis Copilot MVP - Phase 4A Implementation Backlog

## Epic 1: Orchestration & Infrastructure
- [ ] Implement `CopilotOrchestrator` base class.
- [ ] Connect LLM SDK (Gemini/OpenAI) with structured JSON output enforcing `CopilotIntent` schemas.
- [ ] Implement Vision API connector for OCR extraction.
- [ ] Build API Route `app/api/copilot/route.ts` to handle generic text/image payloads.

## Epic 2: Copilot UI (Smart Workspace)
- [ ] Create `app/(dashboard)/copilot/page.tsx`.
- [ ] Implement `ChatFeed` component to render conversational history.
- [ ] Implement `CopilotInputBar` with file upload capability and WhatsApp text paste support.
- [ ] Implement `ActionSuggestionCard` component (Generic confirmation UI).
- [ ] Implement `ExecutionResultCard` (Success/Error feedback).

## Epic 3: Action Execution Integration (The "Bridge")
- [ ] Map `ProposeJobAssignmentCommand` -> `JobOrderService.assignDriver()`.
- [ ] Map `ProposeJobDataUpdateCommand` -> `JobOrderService.updateContainer()`.
- [ ] Map `ProposeJobCancellationCommand` -> `JobOrderService.cancelJob()`.
- [ ] Map `ExecuteStatusQueryCommand` -> `DriverPortalQuery`.
- [ ] Map `ProposeWorkOrderDraftCommand` -> Redirect payload to existing Work Order creation UI modal.

## Epic 4: Validation & Tuning
- [ ] Write Integration Tests mapping raw text inputs to final DB state mutations.
- [ ] Optimize LLM Prompts to reduce token usage and improve latency (< 3000ms).
- [ ] Implement hallucination guardrails (verifying entities exist in the database before proposing action).
