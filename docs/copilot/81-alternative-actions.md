# 81. Alternative Actions

The `AlternativeRecommendationEngine.ts` retrieves operational pivots when a user's initial idea is flawed.

## Example
If an operator requests "Cancel Job" but the job is `MISSING_POD` (meaning the delivery has actually happened, just the paperwork is delayed), the engine advises:
- Request POD via WhatsApp
- Escalate to Field Coordinator

This guides the operator back to the correct operational SOP.
