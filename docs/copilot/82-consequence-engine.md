# 82. Consequence Engine

The `ConsequenceEngine.ts` retrieves the deterministic operational risks of ignoring the AI's advice.

## Example
If an operator attempts to force a driver replacement during `WAITING_UNLOADING`, the Consequence engine warns of:
- "Duplicate driver assignment if forced."
- "Potential confusion at destination warehouse."

This acts as a secondary deterrent against poor operational decisions.
