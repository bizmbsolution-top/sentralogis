# 65. Operational Insight

The `OperationalInsightEngine.ts` is the facade for the decision support layer.

## Immutable Insights
It consumes an `OperationalSituation` and generates an `OperationalInsight` object. This object contains Health, Risk, Impact, and Recommendations. It is completely immutable and read-only. It exists solely to educate the human operator via the SentraBot Explainability panel.
