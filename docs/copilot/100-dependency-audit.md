# Dependency Audit (v1.0)

## Removed Legacy Files
The following legacy abstractions have been permanently deleted from the codebase:
- `src/platforms/copilot/resolver/EntityResolver.ts`
- `src/platforms/copilot/memory/ContextResolver.ts`

## Pipeline Flow Strictness
1. **Engine** -> **Intent Resolver**
   - Passes `userInput` and `OperationalContext`.
2. **Intent Resolver** -> **Semantic Matcher**
   - Matches base intent strings without context.
3. **Intent Resolver** -> **Entity Extraction Engine**
   - Extracts specific `requiredEntities` and `optionalEntities` based on the Intent Registry.
   - Falls back to `OperationalContext.pinnedEntities` if the entity is not found in the input.
4. **Engine** -> **Business Validation Bridge**
   - Structurally validates `EntityResolutionResult` against the Intent Registry.
5. **Engine** -> **Action Bridge / Explainability Generator**
   - Forms the final `action_proposal` including warnings and decision advisory.

There are **zero circular dependencies** and **zero instances of `any` types** crossing the major bridge boundaries.
