# 84. Intent Knowledge Base

The `IntentKnowledge.ts` model defines the semantic signature of a Copilot Intent.

## Structure
Every `IntentKnowledge` configuration holds everything needed for the AI to understand it contextually:
- `keywords`
- `multilingualSupport` (aliases and phrases mapped to specific locales)
- `positiveExamples` and `negativeExamples`
- `promptHint`
- Required execution constraints (`requiredEntities`, `riskLevel`)

By isolating this data from the engine, any new operational use-case can be taught to the Copilot by simply supplying a new JSON configuration object.
