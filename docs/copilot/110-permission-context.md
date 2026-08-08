# 110. Permission Runtime Context

The `PermissionContext` provides a strict, immutable layer over the tenant's RBAC matrix.

## Core Rules
1. Never check arrays manually (`if (perms.includes('...'))`)
2. Always use the `has()`, `hasAll()`, `hasAny()`, and `missing()` methods.
3. Planners and Explainability Engines must use this context exclusively for access control gating.

## Public APIs

- `has(permission: string): boolean`
- `hasAll(permissions: string[]): boolean`
- `hasAny(permissions: string[]): boolean`
- `missing(permissions: string[]): string[]`
- `explain(permission: string): string`
- `summary(): string`
