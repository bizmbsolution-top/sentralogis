# 130. JSON Strict Contract

The Gemini prompt enforces a strict JSON schema that acts as our deterministic parsing boundary. 

```typescript
export interface GeminiIntentResponse {
  intent: string;
  confidence: number;
  entities: Record<string, string>;
  ambiguities: string[];
  reasoning: string;
  language: string;
  suggestedClarification?: string;
}
```

If the LLM generates anything outside of this schema, the adapter's built-in structural validation will throw, triggering the synchronous fallback layer to prevent a catastrophic pipeline crash.
