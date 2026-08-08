# 125. Pipeline Stages

The pipeline executes through a sequence of `PipelineStage` objects.

## Active Stages
1. **IntentStage**: Wraps `IntentResolver`. Resolves semantic meaning or halts with `REQUIRES_CLARIFICATION`.
2. **ContextStage**: Wraps `ContextEnricher`. Looks up active job states to inject operational timelines.
3. **ValidationStage**: Wraps `BusinessValidationBridge`. Halts with `BLOCKED` if preconditions fail.
4. **PlanningStage**: Determines risk levels and execution permissions.
5. **ExplainabilityStage**: Wraps `ExplainabilityDirector`. Generates safe, immutable explanations.
6. **ResponseStage**: Constructs the final `CopilotResponse` payload.

Each stage is completely independent and communicates only through the `PipelineContext`.
