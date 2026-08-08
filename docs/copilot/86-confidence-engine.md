# 86. Confidence Engine

`IntentConfidenceEngine.ts` enforces the confidence threshold.

## Rationale
Different intents have different risk levels. A query (`SHOW_TIMELINE`) might require only a 0.6 confidence score to resolve safely. A high-risk execution intent (`CANCEL_JOB`) requires a higher threshold (0.8+) to ensure we never accidentally initiate irreversible changes due to an ambiguous phrasing. 

The `ConfidenceEngine` evaluates the semantic match score against the intent's `baseConfidenceThreshold`. If it falls short, it blocks resolution.
