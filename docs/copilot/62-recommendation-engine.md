# 62. Recommendation Engine

The `OperationalRecommendationEngine.ts` maps active situations to actionable dispatcher advice.

## Advisory Only
It translates a situation like `MISSING_POD` into specific steps: "Remind driver via WhatsApp to upload POD".

These recommendations are strictly advisory and are appended to the Copilot response payload. They feed the UI layers (e.g. `RecommendationCardModel`) so the operator can take action, but the Copilot **never executes these steps autonomously**.
