# 28 - Ambiguity Handling

## Overview
Because Copilot takes natural language as input, users often provide ambiguous entity references (e.g., "Assign to Budi"). If there are multiple "Budi"s in the tenant's database, the Copilot must never guess.

## The Ambiguity Resolver
The `AmbiguityResolver` evaluates candidates returned by the `EntityLookupService`.

### Resolution Flow
1. **Zero matches**: Status becomes `NOT_FOUND`. Execution halts.
2. **One match**: Status becomes `RESOLVED`.
3. **Multiple matches**:
   - The resolver filters by exact match (`confidenceScore === 1.0`).
   - If exactly ONE exact match exists, status becomes `RESOLVED`.
   - If multiple exact matches or multiple soft matches exist, status becomes `AMBIGUOUS`.

## Handling AMBIGUOUS State
When the Business Context Engine encounters an `AMBIGUOUS` state:
1. It immediately halts entity resolution for the remaining entities.
2. It returns a `Result.fail()` containing a structured payload of the ambiguous candidates.
3. The Copilot Orchestrator intercepts this failure and prompts the user in the UI:
   *"I found multiple drivers for 'Budi': 1. Budi Santoso, 2. Budi Hartono. Which one did you mean?"*
