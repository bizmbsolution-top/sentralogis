# 58. Structural Validation

The `BusinessValidationBridge` now only performs generic validation based on registry metadata.

## Confidence Calculation
We no longer rely on the LLM's inherently untrustworthy confidence score. Confidence is now calculated deterministically:
1. Base score is `1.0`.
2. Missing a required entity? `Blocking Error` + Confidence drops by `0.5`.
3. Entity is ambiguous or missing optional payload? Confidence drops slightly.

## Explainability
The structural validator now returns a `whatWasChecked` array detailing every deterministic check that passed or failed (e.g., "Tenant boundary verified", "Required entities presence: JobOrder, Driver"). This directly feeds into the SentraBot Explainability Panel, giving human operators a completely transparent view of the AI's internal reasoning.
