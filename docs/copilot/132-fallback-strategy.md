# 132. Fault Tolerance & Fallback Strategy

LLMs are inherently probabilistic APIs subject to timeouts, rate limits, or occasional malformed JSON formatting.

The `IntentResolver` protects the core pipeline with a robust synchronous fallback mechanism:
1. `GeminiIntentAdapter` attempts extraction.
2. If the API throws, times out, or fails JSON parsing, it is caught natively.
3. Execution safely falls back to the local `SemanticIntentMatcher` (keyword regex logic).

This ensures the user's intent is ALWAYS parsed, guaranteeing zero downtime.
