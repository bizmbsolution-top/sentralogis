# 95. Entity Explainability

Every resolved entity must provide an `EntityExplanation` describing exactly how it was found.

```typescript
export interface EntityExplanation {
  matchMethod: EntityMatchMethod; // e.g., 'DATABASE'
  evidence: string;               // e.g., 'Database verified license plate'
  source: EntitySource;           // e.g., 'USER_INPUT' or 'CONVERSATION_HISTORY'
}
```

This ensures that the final Execution Proposal contains a fully traceable audit log of where every data point originated.
