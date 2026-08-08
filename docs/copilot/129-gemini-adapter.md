# 129. Gemini Native Intelligence Adapter

The `GeminiIntentAdapter` serves as the primary gateway for language understanding within the Copilot Intelligence Pipeline. By passing raw text through a deterministic LLM, we can handle complex semantic ambiguity (e.g., misspellings, multiple entities, complex conversational contexts) that legacy keyword regex matching could not resolve.

Crucially, **the LLM executes zero business logic**. It simply maps unstructured text to our pre-defined structured `GeminiIntentResponse` JSON schema.
