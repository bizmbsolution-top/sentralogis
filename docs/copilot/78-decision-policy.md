# 78. Decision Policy Model

The `DecisionPolicy.ts` defines the immutable structure for an operational advisory rule.

## Structure
A single `DecisionPolicy` maps an `actionIntent` (e.g., `REPLACE_DRIVER`) to an array of `blockedSituations` and `warningSituations`. Crucially, it forces the configuration to include `alternativeActions`, `expectedBenefits`, and `possibleConsequences`. This ensures every rejected action comes with a constructive alternative rather than just a simple "No".
