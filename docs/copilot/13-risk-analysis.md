# Sentralogis Copilot MVP - Risk Analysis

## 1. Architecture Risks
- **Risk**: Hallucinated entity IDs bypassing domain validation.
- **Evidence**: LLMs frequently guess missing JSON values. If an LLM guesses `driver_id: "123"`, the DB might throw a foreign key error or accidentally assign the job to the wrong user.
- **Mitigation**: The Orchestrator MUST execute a validation query against the Read Model (`DriverPortalQuery.getJobOrderData()`) to verify the entity before suggesting the action to the user.

## 2. Security Risks
- **Risk**: Privilege Escalation via AI.
- **Evidence**: If the AI uses a master service account to execute `JobOrderService`, it could bypass tenant restrictions.
- **Mitigation**: The Copilot API endpoint MUST pass the specific user's `IRequestContext` (including tenant ID) directly into `JobOrderService`. The AI layer has no database credentials of its own.

## 3. Operational Risks
- **Risk**: User blindly clicking "Confirm" on AI suggestions without checking.
- **Evidence**: Common UX fatigue in confirmation dialogs.
- **Mitigation**: Ensure UI Action Cards highlight the "Before & After" state clearly (e.g., in bold red/green diff text) so errors are highly visible before execution.

## 4. Performance Risks
- **Risk**: LLM timeout causing UI lockups.
- **Evidence**: Third-party LLM APIs can take 5-10 seconds during peak loads.
- **Mitigation**: Implement strict timeouts on the Orchestrator. The UI must show a typing/skeleton loader. If timeout occurs, fallback to standard UI actions.
