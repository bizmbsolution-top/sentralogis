# 64. Context Enrichment

The `ContextEnricher.ts` is the middleware that wires the Knowledge layer into the main orchestration flow.

## Interception
Before the Copilot generates an `action_proposal` or evaluates explainability, `CopilotEngine.ts` calls the `ContextEnricher`. The enricher pulls timeline/tracking data for the implicitly resolved entities (e.g., the JobOrder stored in memory) and injects the resulting `OperationalSituation` and `OperationalRecommendation` directly into the final `CopilotResponse`.

This allows the SentraBot UI to immediately render Situation Cards alongside the chat without the user explicitly asking "What is the status of the job?".
