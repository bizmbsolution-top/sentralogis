# 116. Workspace Runtime Experience

The `WorkspaceContext` is the lens through which a user interacts with the system. It tracks the active layout, focused elements, and `PinnedEntity` objects. 

## Key Architectural Principles
1. **No Primitive Pinned Sets**: We have completely replaced `Record<string, string>` with `Record<string, PinnedEntity>`.
2. **Explicit Fallbacks**: The `active(entityType)` method intelligently falls back to explicitly pinned entities if a direct focus is missing.
3. **No Direct Iteration**: Consumers must use `hasPinnedEntities()`, `activeDriver()`, `hasFocus()`, and never inspect the workspace internal dictionary directly.
