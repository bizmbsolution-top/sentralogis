# 88. Intent Analytics

`IntentAnalytics.ts` tracks usage and performance locally.

## What is tracked
- Total execution frequency of each intent.
- Average confidence score across all resolutions.
- `UNKNOWN` intent fallback rate.

This data allows operators to see where the AI struggles (low average confidence) and dynamically improve the `IntentKnowledgeRegistry` by adding the missed phrases to the configuration.
