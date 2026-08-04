# Sentralogis Copilot MVP - AI Orchestration

## 1. The Copilot Orchestrator
The Copilot Orchestrator is the central nervous system of the Copilot module. It lives purely in the Application Layer (or an API Gateway layer specifically designed for AI).

**Responsibilities:**
- Receives HTTP payload (text or image) from the UI.
- Routes payload to an external LLM / OCR provider (e.g., Google Vertex AI, Gemini Vision).
- Receives a strongly-typed JSON schema back from the LLM (The Intent).
- Cross-references extracted entities against Read Models (e.g., validating that "Budi" resolves to `driver_id: uuid-1234`).
- Returns the `ProposeCommand` back to the UI.

## 2. Intent Parsing (LLM Configuration)
The LLM must be configured strictly as an **Intent Parser**, not an agentic database manipulator.
- **System Prompt**: Defines the available intents (CreateWorkOrder, AssignJob, etc.).
- **Response Format**: `application/json`.
- **Function Calling**: The LLM will output a "Tool Call" corresponding to the Intent, filling out parameters like `job_order_id` or `container_number`.

## 3. Grounding & Hallucination Prevention
The Orchestrator must prevent hallucinated entities from reaching the Application Service.
- If the AI parses `Assign JO999 to Driver X`, the Orchestrator runs `JobOrderQueryService.find("JO999")`.
- If it returns `null`, the Orchestrator changes the response to: *"I could not find JO999 in the system."*
- The AI intent parser NEVER executes business logic. It only outputs JSON structures.

## 4. OCR Orchestration
- When an image is uploaded, it is routed to a Vision model.
- Prompt: *"Extract Container Number (format XXXX1234567), Seal Number, and Document Type from this logistics photo. Output JSON."*
- Orchestrator validates the extracted container number format before proposing the update command.
