# 131. Intent Schema & Dynamic Knowledge

To prevent hallucination, the `GeminiIntentAdapter` dynamically injects the entire `IntentKnowledgeRegistry` into its system prompt. The LLM only has visibility over the explicitly registered `intent` IDs.

Because the system prompt defines the exact bounds of available intents, Gemini functions as a highly accurate intent router, fully bypassing legacy keyword overlaps while ensuring no "hallucinated" intents can ever enter the pipeline.
