# 135. Memory Resolver (Pronoun Disambiguation)

To prevent LLM hallucination and ensure strict deterministic control over contextual queries, the `MemoryResolver` intercepts all natural language input *before* it is passed to the LLM or regex matchers.

It identifies pronouns ("him", "that driver", "the delayed job") and directly substitutes them with explicit Entity IDs drawn from the read-only Memory tiers.

**Example**:
- Input: `"cancel that job"`
- Memory: `WorkspaceContext.activeJob = 'JO-123'`
- Output to LLM: `"cancel JO-123"`

This completely removes the burden of context tracking from the LLM, reducing tokens and enforcing structural certainty.
