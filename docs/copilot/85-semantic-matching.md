# 85. Semantic Intent Matching

`SemanticIntentMatcher.ts` performs the deterministic evaluation of a user's natural language input against the registered knowledge base.

## Workflow
1. Input is normalized (lowercased, punctuation stripped, tokenized).
2. The matcher iterates through every registered Intent.
3. It weights keyword matches lightly (0.2).
4. It weights semantic aliases and phrases heavily (0.6 - 0.8).
5. It returns a sorted array of candidate intents.

It relies strictly on configuration. There are no hardcoded logic branches matching string variables.
