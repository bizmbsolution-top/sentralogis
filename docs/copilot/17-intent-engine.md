# Sentralogis Copilot Intent Engine

## 1. Intent Contract Definition
The Intent Engine translates natural language into a strongly typed data structure. Every intent parsed from the LLM must conform to the `CopilotIntent` base contract.

```typescript
export interface CopilotIntent<TPayload = any> {
  intent: string;                  // e.g., 'AssignDriverIntent'
  confidence: number;              // 0.0 to 1.0
  tenantId: string;                // Enforced by API, not LLM
  userId: string;                  // Enforced by API, not LLM
  targetAggregate?: string;        // e.g., 'trucking.job-order'
  command?: string;                // e.g., 'assignDriver'
  payload: TPayload;               // Extracted entities (e.g., { jobOrderId, driverId })
  warnings: string[];              // e.g., "Missing driver name in prompt"
  requiresConfirmation: boolean;   // True for any mutation
  source: string;                  // 'TEXT', 'WHATSAPP_PASTE', 'OCR_IMAGE'
}
```

## 2. Intent Parsing Pipeline
The parser acts purely as a linguistic extractor.
1. **System Prompt Configuration**: The LLM is configured with a JSON schema defining all valid intents and their expected payload formats.
2. **Execution**: The LLM analyzes the text: *"Assign JO221 to Budi"*.
3. **JSON Response**:
   ```json
   {
     "intent": "AssignDriverIntent",
     "confidence": 0.95,
     "payload": {
       "jobOrderNumber": "JO221",
       "driverName": "Budi"
     },
     "warnings": [],
     "requiresConfirmation": true
   }
   ```
4. **Context Injection**: The Copilot API intercepts the JSON and injects the trusted `tenantId` and `userId` from the HTTP request context. The LLM is NEVER trusted to provide security context.

## 3. Supported Intents
- `AssignDriverIntent`
- `CancelJobIntent`
- `UpdateContainerIntent`
- `StatusQueryIntent`
- `CreateWorkOrderDraftIntent`
- `TrackingQueryIntent`
- `PODQueryIntent`
- `UnknownIntent` (Fallback when confidence is < 0.7 or schema fails).
