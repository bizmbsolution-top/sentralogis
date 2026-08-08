# 34. User Flow

## 1. Intent Capture
- User types natural language, clicks a Quick Command, or uploads a document (e.g., WhatsApp screenshot).
- `CopilotInput` disables and shows `ThinkingIndicator` in the chat feed.

## 2. Plan Generation
- Backend processes Intent -> Context -> Planner.
- A structurally sound `ExecutionPlan` is returned to the frontend.

## 3. Proposal Rendering
- Frontend renders an `ActionProposalCard` inside a `ConversationBubble`.
- It displays the `ExplainabilityPanel` and `GuardrailPanel` immediately below it.
- Execution is **paused**. The Copilot *never* executes autonomously.

## 4. Human Confirmation
- User reviews the risk, entities, and warnings.
- User clicks **Confirm**. (If they click Edit, they are taken to a classic form or asked clarifying questions).

## 5. Execution & Result
- Backend Execution Engine performs the action.
- Frontend renders an `ExecutionResultCard` showing success/failure and the specific database records updated (Timeline).
