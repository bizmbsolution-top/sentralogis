# 37. Active Context

## Concept
In a typical chatbot, context is implicitly derived from chat history. For operational systems, this is dangerously opaque. The **Active Context** forces the AI's internal state into the UI.

## Mechanics
1. When a user asks "Assign driver Budi to JO-223", the Copilot resolves two entities: `Driver` and `JobOrder`.
2. The `JobOrder: JO-223` becomes the **Active Context**.
3. The `ActiveContextCard` in the right panel immediately updates to show JO-223's details (Customer, Vehicle, Origin, Destination, ETA).
4. If the user's next message is simply "Cancel the assignment", the Copilot *knows* they mean JO-223 because it is in the Active Context.

## Lifecycle
- **Acquisition**: Inferred from natural language, or explicitly set by clicking a pinned job.
- **Persistence**: Survives across conversation turns until explicitly replaced.
- **Clearing**: The user can manually clear the Active Context via an 'X' button on the card.
- **Replacement**: Mentioning a new Job Order immediately overwrites the current Active Context.
