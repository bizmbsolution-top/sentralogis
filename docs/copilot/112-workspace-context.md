# 112. Workspace Runtime Context

The `WorkspaceContext` manages the operational lens of the executing user. It tracks the `active()` entity bounds, supporting deep integration with the UI layout, pinned dashboard elements, and focused Job Orders.

## Public APIs

- `active(entityType: string): string | null`
- `recent(): string[]`
- `pin(entityType: string, id: string): WorkspaceContext`
- `unpin(entityType: string): WorkspaceContext`
- `focus(entityType: string, id: string): WorkspaceContext`
- `summary(): string`

**Immutability:** Operations like `pin()` and `focus()` do not mutate state; they yield new `WorkspaceContext` instances.
