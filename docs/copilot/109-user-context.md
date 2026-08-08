# 109. User Runtime Context

The `UserContext` encapsulates the currently executing human user (or system process).
It removes legacy leakage of raw `user_id` primitive strings in the application core.

## Public APIs

- `getId(): string`
- `getDisplayName(): string`
- `hasRole(role: string): boolean`
- `getPermissions(): string[]`
- `summary(): string`

**Security Rule:** Raw role and permission checks should not bypass `PermissionContext`.
