# 121. Explainability Director

The `ExplainabilityDirector` acts as the master coordinator for the Explainability Runtime.

## Why it Exists
While the `ExplainabilityBuilder` safely manages the construction of the DTO, it does not know *how* or *in what order* explainability data should be logically assembled. 

The Director enforces this assembly logic. It accepts raw AI core outputs (Intent, Validations, Resolvers) and orchestrates the builder step-by-step.

## Pattern
This encapsulates the classic **Builder-Director** design pattern. The Generator acts simply as a facade that delegates immediately to the Director.
