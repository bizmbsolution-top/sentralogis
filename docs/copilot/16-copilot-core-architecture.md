# Sentralogis Copilot Core Architecture

## 1. Overview
The Copilot Core Architecture acts as an intelligent, deterministic bridge between natural human language and the strict Domain-Driven Design (DDD) Application Layer of Sentralogis. 

**The fundamental rule:** The LLM does NOT execute business logic. It acts purely as a translator from Natural Language into a strongly-typed `CopilotIntent`.

## 2. Core Flow
The architecture is designed as a pipeline that progressively adds structure and validation to an unstructured input.

1. **User Input**: A user types a command or uploads a photo in the Copilot UI.
2. **Copilot API**: The Next.js API receives the payload and passes it to the Orchestrator along with the user's `IRequestContext`.
3. **Intent Parser (LLM)**: An LLM analyzes the text/image and outputs a strict JSON representation of the `CopilotIntent`.
4. **Intent Validator**: Checks the structured intent for completeness, entity existence (via Read Models), and user permissions (via `PermissionEngine`).
5. **Intent Resolver**: Maps the validated intent into the exact arguments required by the corresponding Application Service command.
6. **Application Service**: Existing services (e.g., `JobOrderService`) execute the command, applying all DDD Aggregate invariants.
7. **Repository & Database**: The state is persisted.

## 3. Guiding Principles
- **No LLM SQL**: The LLM will never generate or execute SQL.
- **No Bypassing Validation**: All actions must flow through the Application Service and Aggregate layers.
- **Deterministic Outcomes**: If the LLM produces a hallucinatory intent (e.g., a missing Job ID), the Intent Validator will deterministically fail the operation before any Application Service is invoked.
- **Thin Orchestrator**: The Orchestrator simply coordinates the pipeline; it contains no domain logic itself.

## 4. Integration with Existing Architecture
The Copilot module relies exclusively on existing implementations:
- `PermissionEngine` for security.
- `JobOrderService`, `TrackingService` for mutations.
- `DriverPortalQuery` (and similar Read Models) for entity validation.
- `Result` and `Aggregate` patterns for standardizing success/failure pathways.
