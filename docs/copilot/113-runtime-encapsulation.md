# 113. Enterprise Runtime Encapsulation

The Sentralogis Copilot operates strictly on **Pure Models**. The runtime objects (`TenantContext`, `UserContext`, `PermissionContext`, `WorkspaceContext`, `ConversationContext`, `OperationalContext`, `EntityResolutionResult`) have been entirely encapsulated to prevent implementation detail leakage across the boundary.

## Anti-Patterns Resolved
- **Dictionary Access**: `Object.values(entities)` is banned. Replaced by `EntityResolutionResult.resolved()`.
- **Primitive Array Mutation**: `context.permissions.push()` is physically impossible; arrays are cloned upon access or strictly managed via `Set`.
- **Manual Validation Counting**: `invalidCount = entities.count() - entities.resolved().length` is banned. Handled internally by `invalidCount()`.

All dependencies on UI layers, Repositories, or downstream Application Services have been removed from the Context tier.
