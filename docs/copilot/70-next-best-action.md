# 70. Next Best Action

The `NextBestActionEngine.ts` supersedes the basic recommendation array.

## Prioritized Actions
It groups actions logically (e.g., "Contact Customer Warehouse", "Verify Warehouse Readiness", "Escalate to Dispatcher") and assigns a `recommendedAttention` bucket (e.g., "Customer Service" vs "Dispatcher Intervention").
