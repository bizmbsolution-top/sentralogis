# 29 - Tenant Safety

## Overview
Sentralogis is a multi-tenant platform. A critical responsibility of the Business Context Engine is ensuring that a user in Tenant A cannot accidentally or maliciously resolve and manipulate entities belonging to Tenant B.

## Safety Mechanisms
1. **Query Level**: The `EntityLookupService` forces an `.eq('tenant_id', tenantId)` condition on every database query. This ensures the database never even returns cross-tenant data to the application memory.
2. **Resolution Level**: The `AmbiguityResolver` implements a secondary check. Even if data were to leak, it explicitly filters `candidates.filter(c => c.tenantId === tenantId)`.
3. **Execution Failure**: If an entity reference matches a database record, but that record belongs to another tenant, the `AmbiguityResolver` returns a `TENANT_MISMATCH` status.
4. **Context Injection**: The Business Context Engine returns a `Result.fail("Permission Denied: Entity ... does not belong to your tenant.")`, strictly preventing the Intent Resolver from ever receiving the payload.

## Future Readiness
The current architecture safely isolates data at the `tenantId` level. 

As Sentralogis scales, the generic `IRequestContext` and isolated Provider architecture natively supports moving to more granular isolation:
- **Company / Branch Isolation**: Can be achieved by adding `.eq('branch_id', context.branchId)` within specific `IEntityLookupProvider` instances.
- **Role-Based Visibility**: Can inject the `IPermissionEngine` into providers to only return entities a specific user is authorized to interact with.

These future requirements can be added without modifying the `BusinessContextEngine` orchestrator itself, preserving its core stability.
