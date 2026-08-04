# Sentralogis Copilot MVP - Non-Functional Requirements

## 1. Performance
- **NFR-1.1 Intent Resolution Latency**: The system must resolve the user's intent and generate a suggestion within 3000ms.
- **NFR-1.2 OCR Latency**: OCR extraction from uploaded photos must complete within 5000ms.
- **NFR-1.3 Execution Latency**: Execution of a confirmed command must match the existing Application Service latency (generally < 500ms).

## 2. Security & Authorization
- **NFR-2.1 Context Passing**: The Copilot Orchestrator must pass the user's authenticated `IRequestContext` to the underlying Application Services.
- **NFR-2.2 No Privilege Escalation**: The Copilot layer must not have generic "Admin" access. It operates strictly within the permissions of the user initiating the command.
- **NFR-2.3 Tenant Isolation**: All queries executed on behalf of the AI must strictly append `tenant_id` filtering, leveraging existing read models.

## 3. Reliability & Fallbacks
- **NFR-3.1 Graceful Degradation**: If the AI parser fails to understand an intent, it must respond with a predefined fallback message (e.g., "I couldn't understand that command. Did you mean to assign a job?").
- **NFR-3.2 Hallucination Prevention**: The system must rely on strict entity extraction mapping against DB read models. If a user asks to "Assign JO999" and JO999 does not exist, the Copilot Orchestrator must validate existence before suggesting the action.

## 4. Maintainability & Architecture
- **NFR-4.1 Decoupling**: The AI intent parser must be completely decoupled from SentraForge business logic. It translates text to a strict Command JSON schema.
- **NFR-4.2 Code Reuse**: Copilot must exclusively use existing `JobOrderService`, `TrackingService`, and `DriverPortalQuery`. No duplicate database logic is permitted.
