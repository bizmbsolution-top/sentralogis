# Operational Context (v1.0)

## Overview

`OperationalContext` replaces all scattered arguments (like `userId`, `tenantId`, `activeJobId`, `activeDriverId`, and `MemoryStore`). It represents the complete state of the world at the exact moment a user interacts with the Copilot.

## Structure

```typescript
export interface OperationalContext {
  tenantId: string;
  userId: string;
  conversationId: string;
  locale: string;
  timezone: string;
  
  // Active state pointers (Contextually aware of UI)
  activeJobId?: string;
  activeDriverId?: string;
  activeVehicleId?: string;
  activeWorkOrderId?: string;
  activeCustomerId?: string;
  activeContainerId?: string;
  activeTimelineId?: string;
  
  // Historical pointers
  recentExecutionIds: string[];
  
  // Previously known as MemoryStore
  pinnedEntities: Record<string, string>;
  
  // Tenant config
  featureFlags: Record<string, boolean>;
  permissions: string[];
}
```

## Context Pinning

When a user focuses on a JobOrder in the UI, or implicitly refers to a JobOrder they just discussed, the frontend or middleware updates `context.pinnedEntities['JobOrder'] = 'JO-123'`. 

If `EntityExtractionEngine` detects an intent requires a `JobOrder` but fails to find it in the input (returning `UNKNOWN`), it will automatically fall back to `context.pinnedEntities`.
