# Sentralogis Copilot Intent Validation

## 1. Responsibilities
The Intent Validator acts as a deterministic firewall between the LLM output and the Application Layer. It ensures that the hallucination-prone LLM cannot execute invalid actions.

**Validation Steps:**
1. **Tenant Context Verification**: Ensures `tenantId` is present and valid.
2. **Command Completeness**: Ensures all required fields for a given intent are present (e.g., `AssignDriverIntent` requires both a Job ID and a Driver ID).
3. **Entity Existence Verification**: Queries read models to ensure the extracted entities actually exist in the database.
4. **Permission Enforcement**: Pre-validates permissions before bothering the Application Service.

## 2. Entity Validation Example
If the LLM outputs:
```json
{
  "payload": {
    "jobOrderNumber": "JO221",
    "driverName": "Budi"
  }
}
```
The Validator executes:
```typescript
const job = await readModel.findJobByNumber("JO221", ctx.tenantId);
const driver = await readModel.findDriverByName("Budi", ctx.tenantId);
```
If either returns `null`, the Validator stops the pipeline and returns a `Result.fail()` containing a targeted user message: *"Could not find Job Order JO221."*

## 3. Strict Boundary
The Intent Validator NEVER calls an Application Service for mutations. It only interacts with Read Models and the `PermissionEngine`.
