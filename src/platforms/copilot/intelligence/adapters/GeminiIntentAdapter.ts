import { IntentKnowledgeRegistry } from '../IntentKnowledgeRegistry';
import { GeminiIntentResponse } from './GeminiModels';
import { GoogleGenerativeAI, Schema, SchemaType } from '@google/generative-ai';
import { CopilotAiStatus, UpstreamFailureClass } from '../../pipeline/PipelineModels';

export class GeminiIntentAdapter {
  
  static async extractIntent(userInput: string): Promise<GeminiIntentResponse> {
    const intents = IntentKnowledgeRegistry.getAll();
    const intentDescriptions = intents.map(i => `- ${i.id}: ${i.description}`).join('\n');
    
    const systemPrompt = `
You are an intent parser for the Sentralogis Copilot.
Your job is to strictly extract intents and entities from the user's input.
You must NOT execute business logic.

Available Intents:
${intentDescriptions}
`;

    const schema: Schema = {
      type: SchemaType.OBJECT,
      properties: {
        intent: { type: SchemaType.STRING, description: "The intent ID, or 'UNKNOWN'" },
        confidence: { type: SchemaType.NUMBER, description: "0.0 to 1.0" },
        entities: { type: SchemaType.OBJECT, description: "Extracted entities", properties: {} },
        ambiguities: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        reasoning: { type: SchemaType.STRING },
        language: { type: SchemaType.STRING },
        suggestedClarification: { type: SchemaType.STRING }
      },
      required: ["intent", "confidence", "entities", "ambiguities", "reasoning", "language"]
    };

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not defined in the environment.');
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ 
        model: 'gemini-3.8-flash',
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: schema,
        } 
      });

      // Implement simple retry and timeout (timeout handled via AbortController in fetch if needed, 
      // but generative-ai handles it natively if we pass a signal, or we can race it)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // < 3s SLA

      let responseText = '';
      try {
        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\nUser Input:\n${userInput}` }] }]
        });
        
        clearTimeout(timeoutId);
        responseText = result.response.text();
      } catch (err: any) {
        clearTimeout(timeoutId);
        const classified = this.classifyError(err);
        throw new GeminiAdapterError(classified.message, classified.failureClass, classified.aiStatus, err);
      }

      let payload: GeminiIntentResponse;
      try {
        payload = JSON.parse(responseText) as GeminiIntentResponse;
      } catch (parseErr: any) {
        throw new GeminiAdapterError(
          `Gemini response is not valid JSON: ${parseErr.message}`,
          'PAYLOAD_INVALID_JSON',
          'DEGRADED',
          parseErr
        );
      }

      try {
        this.validatePayload(payload);
      } catch (schemaErr: any) {
        throw new GeminiAdapterError(
          schemaErr.message,
          'PAYLOAD_SCHEMA_MISMATCH',
          'DEGRADED',
          schemaErr
        );
      }

      return payload;
    } catch (err) {
      if (err instanceof GeminiAdapterError) {
        throw err;
      }
      const classified = GeminiIntentAdapter.classifyError(err);
      throw new GeminiAdapterError(
        `Gemini Adapter failed to parse intent: ${err instanceof Error ? err.message : String(err)}`,
        classified.failureClass,
        classified.aiStatus,
        err
      );
    }
  }

  static classifyError(err: any): { failureClass: UpstreamFailureClass; aiStatus: CopilotAiStatus; message: string } {
    const msg = err?.message || String(err || '');
    const status = err?.status || (err?.response?.status) || null;

    if (err?.name === 'AbortError' || msg.includes('timeout') || msg.includes('Timeout')) {
      return { failureClass: 'TIMEOUT_EXCEEDED', aiStatus: 'UNAVAILABLE', message: 'Gemini API timeout exceeded (3s)' };
    }

    if (status === 503 || msg.includes('503') || msg.includes('high demand') || msg.includes('Service Unavailable')) {
      return { failureClass: 'CAPACITY_EXHAUSTED', aiStatus: 'UNAVAILABLE', message: msg };
    }

    if (status === 429 || msg.includes('429') || msg.includes('Resource has been exhausted') || msg.includes('quota') || msg.includes('Quota')) {
      return { failureClass: 'QUOTA_EXHAUSTED', aiStatus: 'UNAVAILABLE', message: msg };
    }

    if (status === 500 || status === 502 || msg.includes('500') || msg.includes('502') || msg.includes('Bad Gateway') || msg.includes('Internal Server Error')) {
      return { failureClass: 'UPSTREAM_FAILURE', aiStatus: 'UNAVAILABLE', message: msg };
    }

    if (msg.includes('fetch failed') || msg.includes('ECONNREFUSED') || msg.includes('ENOTFOUND') || msg.includes('network') || msg.includes('ETIMEDOUT')) {
      return { failureClass: 'UPSTREAM_FAILURE', aiStatus: 'UNAVAILABLE', message: msg };
    }

    if (status === 404 || msg.includes('404') || msg.includes('not found') || msg.includes('no longer available')) {
      return { failureClass: 'MODEL_INELIGIBLE', aiStatus: 'DEGRADED', message: msg };
    }

    if (status === 401 || status === 403 || msg.includes('401') || msg.includes('403') || msg.includes('API_KEY_INVALID') || msg.includes('permission') || msg.includes('GEMINI_API_KEY is not defined')) {
      return { failureClass: 'AUTH_MISCONFIGURED', aiStatus: 'DEGRADED', message: msg };
    }

    if (status === 400 || msg.includes('400') || msg.includes('INVALID_ARGUMENT') || msg.includes('Bad Request')) {
      return { failureClass: 'INVALID_REQUEST', aiStatus: 'DEGRADED', message: msg };
    }

    // Default fallback if unclassified
    return { failureClass: 'UPSTREAM_FAILURE', aiStatus: 'UNAVAILABLE', message: msg };
  }
  
  private static validatePayload(payload: any) {
    if (!payload.intent) throw new Error('Missing intent field in Gemini JSON');
    if (typeof payload.confidence !== 'number') throw new Error('Missing confidence field in Gemini JSON');
    if (!payload.entities) throw new Error('Missing entities field in Gemini JSON');
  }
}

export class GeminiAdapterError extends Error {
  public readonly failureClass: UpstreamFailureClass;
  public readonly aiStatus: CopilotAiStatus;
  public readonly originalError?: any;

  constructor(message: string, failureClass: UpstreamFailureClass, aiStatus: CopilotAiStatus, originalError?: any) {
    super(message);
    this.name = 'GeminiAdapterError';
    this.failureClass = failureClass;
    this.aiStatus = aiStatus;
    this.originalError = originalError;
  }
}
