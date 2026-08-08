# 108. Tenant Runtime Context

The `TenantContext` completely encapsulates all configurations and boundaries for the executing tenant. 
Primitive access to `tenantId` is strictly forbidden to prevent accidental string manipulation or unauthorized spoofing.

## Public APIs

- `getId(): string`
- `getName(): string`
- `getTimezone(): string`
- `hasFeature(feature: string): boolean`
- `isEnterprise(): boolean`
- `isTrial(): boolean`
- `summary(): string`

All properties are readonly and immutable after initialization.
