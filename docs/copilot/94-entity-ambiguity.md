# 94. Entity Ambiguity

The framework natively handles multiple candidates via the `AmbiguityResult` model.

When an extractor finds multiple matching records (e.g., multiple drivers named "Agus"), it returns `status: 'AMBIGUOUS'`.

This enables the Copilot UI to pause execution and prompt the user:
> "I found three drivers named Agus. Which one do you mean?"

This guarantees the AI never guesses or hallucinates an incorrect operational decision.
