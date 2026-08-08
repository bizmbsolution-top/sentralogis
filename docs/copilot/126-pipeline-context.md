# 126. Pipeline Context

The `PipelineContext` is the mutable state vessel passed between stages. 

## Mutability Rule
Unlike domain objects (`WorkspaceContext`, `ExplainabilityData`) which are strictly immutable, the `PipelineContext` is **intentionally mutable**. Its purpose is to accumulate state (intents, entities, validations) as the request propagates through the pipeline. 

Once a stage completes, its output becomes locked into the `PipelineContext`, but the context itself continues down the line. When execution completes, the context is discarded.
