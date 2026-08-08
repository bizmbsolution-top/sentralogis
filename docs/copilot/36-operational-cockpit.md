# 36. Operational Cockpit

## Objective
The Operational Cockpit replaces the standard `/copilot` chat interface with a dedicated dual-panel layout. It transitions the Copilot from a generic chat assistant into a hyper-contextual "control center" for dispatchers, CS, and operations staff.

## The Dual-Panel Paradigm
1. **Conversation Workspace (Left, ~70% width)**
   - The primary interactive zone.
   - Handled by `ConversationWorkspace.tsx`.
   - Optimized for fast typing, quick commands, and reading detailed `ActionProposalCard`s and timeline views.

2. **Operational Context (Right, ~30% width)**
   - The persistent "brain" of the session.
   - Handled by `OperationalContextPanel.tsx`.
   - Displays exactly what the Copilot currently understands the user is working on, removing the need for the user to repeatedly type identifiers (e.g., Job Orders, Customer Names).

## Design Philosophy
- **High Data Density**: Operations staff are used to dense Excel sheets. The UI should be minimal but not sparse. Use small text (`text-xs`, `text-sm`) and tight spacing for tabular data.
- **No Clutter**: Avoid unnecessary generic graphics. Use simple borders and standard icons.
- **Confidence Visualization**: Everything the AI generates must visibly display its Confidence and Risk levels.
