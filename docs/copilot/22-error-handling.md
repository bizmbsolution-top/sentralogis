# Sentralogis Copilot Error Handling & Fallbacks

## 1. Low Confidence Fallback
If the LLM returns an intent with `confidence < 0.7`:
- **Action**: Do not execute validation or resolution.
- **Response**: Return a clarifying question to the user. *"I'm not quite sure I understood. Did you mean to assign a driver or update a container?"*

## 2. Invalid Entity Fallback (Hallucination)
If the Intent Validator fails to find an entity (e.g., `jobOrderId` does not exist in Read Model):
- **Action**: Abort pipeline.
- **Response**: Provide constructive feedback. *"I could not find Job Order JO999. Could you check the number and try again?"*

## 3. Permission Denied Fallback
If the Application Service or `PermissionEngine` returns a failure due to roles/permissions:
- **Action**: Abort pipeline.
- **Response**: Log the security event. Respond to user: *"You do not have the required permissions to perform this action."*

## 4. LLM Service Unavailability
If the external LLM API times out or returns 500:
- **Action**: Catch the exception in the Orchestrator.
- **Response**: *"The AI service is currently unavailable. Please use the standard dashboard to complete your task."*
