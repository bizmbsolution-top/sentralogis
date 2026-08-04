# Sentralogis Copilot Intent Resolution

## 1. Responsibilities
The Intent Resolver receives a validated `CopilotIntent` and translates it into a deterministic call to an Application Service.

**Key Rule:** The Resolver contains NO BUSINESS RULES. It is purely a mapping and delegation layer.

## 2. Mapping Flow
When the Resolver receives `AssignDriverIntent` with a validated `jobOrderId` and `driverId`, it constructs the corresponding Domain Command:

```typescript
const command: AssignDriverCommand = {
  jobOrderId: validatedPayload.jobOrderId,
  driverId: validatedPayload.driverId,
  // Note: Copilot might ask for vehicle if it wasn't provided, or Resolver fetches default vehicle
};
```

## 3. Delegation
The Resolver invokes the existing `JobOrderService`:
```typescript
const result = await this.jobOrderService.assignDriver(ctx, command);
return result;
```

## 4. Response Handling
The Resolver takes the `Result<void>` returned by the Application Service and translates it into a conversational response for the Copilot UI.
- If `result.isSuccess`: "Successfully assigned Budi to JO221."
- If `result.isFailure`: "Failed to assign. Reason: [result.error]"
