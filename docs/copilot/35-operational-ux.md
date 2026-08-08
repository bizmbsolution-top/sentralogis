# 35. Operational UX

## Trust and Explainability
For operators to trust an AI system over their classic data grids, the UX must prioritize explainability.
By surfacing exactly *why* an action was proposed (e.g., "The user requested to assign a driver") and *what* it resolved ("Budi Santoso mapped to DRIVER:123"), the user feels in control.

## Guardrails vs. Blocks
A core UX principle in Sentralogis Copilot is that **AI should not enforce business logic blocks unless structurally mandated**. 
- If a driver has too many jobs, the UI displays an Amber warning in the `GuardrailPanel`.
- It is up to the human operator (if they have the required permissions) to proceed with the `ActionProposalCard`.

## Context Persistence
Operations are rarely single-turn. The `CopilotSidebar` tracks "Recent Executions" and "Active Context". 
If the user just assigned a driver to WO-123, the Active Context remains WO-123. A follow up command like "Mark it as departed" implicitly knows the target entity without the user having to re-type it.
