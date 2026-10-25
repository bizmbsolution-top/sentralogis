import { IntentKnowledgeRegistry } from '../IntentKnowledgeRegistry';
import OpenAI from 'openai';
import { CopilotAiStatus, UpstreamFailureClass } from '../../pipeline/PipelineModels';

export interface OpenAIIntentResponse {
  intent: string;
  confidence: number;
  entities: Record<string, string>;
  ambiguities: string[];
  reasoning: string;
  language: string;
  suggestedClarification?: string;
}

export class OpenAIIntentAdapter {
  
  static async extractIntent(userInput: string, modelOverride?: string): Promise<OpenAIIntentResponse> {
    const intents = IntentKnowledgeRegistry.getAll();
    const intentDescriptions = intents.map(i => `- ${i.id}: ${i.description}`).join('\n');
    
    const systemPrompt = `
You are an intent parser for the Sentralogis Copilot.
Your job is to strictly extract intents and entities from the user's input.
You must NOT execute business logic.

Available Intents:
${intentDescriptions}

Return ONLY valid JSON matching this schema:
{
  "intent": string (the intent ID, or 'UNKNOWN'),
  "confidence": number (0.0 to 1.0),
  "entities": object (key-value pairs of extracted entities),
  "ambiguities": string[] (list of ambiguous interpretations),
  "reasoning": string,
  "language": string,
  "suggestedClarification": string (optional)
}
`;

    try {
      const apiKey = process.env.OPENAI_API_KEY || process.env.OPEN_AI_KEY;
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY is not defined in the environment.');
      }

      const client = new OpenAI({
        apiKey,
        maxRetries: 0,
        timeout: 5000,
      });

      const model = modelOverride || process.env.OPENAI_MODEL || 'gpt-4o-mini';

      let responseText = '';
      try {
        const response = await client.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userInput }
          ],
          response_format: { type: 'json_object' },
          temperature: 0,
          max_tokens: 300,
        });

        responseText = response.choices && response.choices[0] && response.choices[0].message
          ? (response.choices[0].message.content || '')
          : '';
      } catch (err: any) {
        const classified = this.classifyError(err);
        throw new OpenAIAdapterError(classified.message, classified.failureClass, classified.aiStatus, err);
      }

      let payload: OpenAIIntentResponse;
      try {
        payload = JSON.parse(responseText) as OpenAIIntentResponse;
      } catch (parseErr: any) {
        throw new OpenAIAdapterError(
          `OpenAI response is not valid JSON: ${parseErr.message}`,
          'PAYLOAD_INVALID_JSON',
          'DEGRADED',
          parseErr
        );
      }

      try {
        this.validatePayload(payload);
      } catch (schemaErr: any) {
        throw new OpenAIAdapterError(
          schemaErr.message,
          'PAYLOAD_SCHEMA_MISMATCH',
          'DEGRADED',
          schemaErr
        );
      }

      return payload;
    } catch (err) {
      if (err instanceof OpenAIAdapterError) {
        throw err;
      }
      const classified = OpenAIIntentAdapter.classifyError(err);
      throw new OpenAIAdapterError(
        `OpenAI Adapter failed to parse intent: ${err instanceof Error ? err.message : String(err)}`,
        classified.failureClass,
        classified.aiStatus,
        err
      );
    }
  }

  static classifyError(err: any): { failureClass: UpstreamFailureClass; aiStatus: CopilotAiStatus; message: string } {
    const msg = err?.message || String(err || '');
    const status = err?.status || (err?.response?.status) || null;
    const code = err?.code || '';

    if (err?.name === 'AbortError' || msg.includes('timeout') || msg.includes('Timeout')) {
      return { failureClass: 'TIMEOUT_EXCEEDED', aiStatus: 'UNAVAILABLE', message: 'OpenAI API timeout exceeded (5s)' };
    }

    if (status === 503 || msg.includes('503') || msg.includes('high demand') || msg.includes('Service Unavailable')) {
      return { failureClass: 'CAPACITY_EXHAUSTED', aiStatus: 'UNAVAILABLE', message: msg };
    }

    if (status === 429 || code === 'insufficient_quota' || code === 'credit_balance_exhausted' || msg.includes('429') || msg.includes('quota') || msg.includes('credits remaining')) {
      return { failureClass: 'QUOTA_EXHAUSTED', aiStatus: 'UNAVAILABLE', message: msg };
    }

    if (status === 500 || status === 502 || msg.includes('500') || msg.includes('502') || msg.includes('Bad Gateway') || msg.includes('Internal Server Error')) {
      return { failureClass: 'UPSTREAM_FAILURE', aiStatus: 'UNAVAILABLE', message: msg };
    }

    if (msg.includes('fetch failed') || msg.includes('ECONNREFUSED') || msg.includes('ENOTFOUND') || msg.includes('network') || msg.includes('ETIMEDOUT')) {
      return { failureClass: 'UPSTREAM_FAILURE', aiStatus: 'UNAVAILABLE', message: msg };
    }

    if (status === 404 || msg.includes('404') || msg.includes('model_not_found') || msg.includes('does not exist')) {
      return { failureClass: 'MODEL_INELIGIBLE', aiStatus: 'DEGRADED', message: msg };
    }

    if (status === 401 || status === 403 || msg.includes('401') || msg.includes('403') || msg.includes('invalid_api_key') || msg.includes('OPENAI_API_KEY is not defined')) {
      return { failureClass: 'AUTH_MISCONFIGURED', aiStatus: 'DEGRADED', message: msg };
    }

    if (status === 400 || msg.includes('400') || msg.includes('invalid_request_error')) {
      return { failureClass: 'INVALID_REQUEST', aiStatus: 'DEGRADED', message: msg };
    }

    return { failureClass: 'UPSTREAM_FAILURE', aiStatus: 'UNAVAILABLE', message: msg };
  }

  private static validatePayload(payload: any) {
    if (!payload.intent) throw new Error('Missing intent field in OpenAI JSON');
    if (typeof payload.confidence !== 'number') throw new Error('Missing confidence field in OpenAI JSON');
    if (!payload.entities || typeof payload.entities !== 'object') throw new Error('Missing entities field in OpenAI JSON');
    if (!Array.isArray(payload.ambiguities)) {
      payload.ambiguities = [];
    }
  }
}

export class OpenAIAdapterError extends Error {
  public readonly failureClass: UpstreamFailureClass;
  public readonly aiStatus: CopilotAiStatus;
  public readonly originalError?: any;

  constructor(message: string, failureClass: UpstreamFailureClass, aiStatus: CopilotAiStatus, originalError?: any) {
    super(message);
    this.name = 'OpenAIAdapterError';
    this.failureClass = failureClass;
    this.aiStatus = aiStatus;
    this.originalError = originalError;
  }
}
