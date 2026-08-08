# 80. Advisory Engine

The `DecisionAdvisoryEngine.ts` coordinates policy evaluation.

## Workflow
1. It passes the current `OperationalInsight` and the requested `intent` to the `DecisionPolicyEvaluator`.
2. The evaluator scans the Registry to see if the action is `REJECTED` or raises a `WARNING` based on the timeline.
3. If an issue is found, the engine queries the `AlternativeRecommendationEngine` and `ConsequenceEngine` to build a complete `DecisionAdvisoryOutput`.
4. This payload is embedded into the Copilot's `explainability` node.
