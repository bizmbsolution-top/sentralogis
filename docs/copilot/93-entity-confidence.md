# 93. Entity Confidence

Confidence modeling for entities ensures the Copilot operates safely.

## Confidence Attributes
Every extracted entity generates a confidence score based on its match method:
- **EXACT**: Exact ID matches (e.g., `JO-12345`). High confidence.
- **DATABASE**: Verified against a domain repository. High confidence.
- **ALIAS / PARTIAL**: Fuzzy string matching or synonyms. Medium confidence.

If a critical intent requires high confidence entities, the validation pipeline can reject the action if entity confidence is too low.
