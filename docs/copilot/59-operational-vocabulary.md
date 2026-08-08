# 59. Operational Vocabulary

The `OperationalVocabulary.ts` introduces a strict, deterministic dictionary of logistics terms into the Copilot context.

## Why Do We Need This?
Large Language Models have generic understandings of words. In trucking, "Waiting" has a very specific meaning (e.g. idle at a depo), and "POD" refers to a specific legal document, not a "pod" of dolphins or a generic "proof".

By strictly typing the vocabulary and defining synonyms, we give the Copilot a fixed anchor. When generating explainability or parsing intent, the system maps the LLM's generic output to these strict `OperationalTerm` constants, preventing hallucinated jargon.
