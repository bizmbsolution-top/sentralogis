export interface GeminiIntentResponse {
  intent: string;
  confidence: number;
  entities: Record<string, string>;
  ambiguities: string[];
  reasoning: string;
  language: string;
  suggestedClarification?: string;
}
