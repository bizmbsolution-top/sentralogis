import { IntentKnowledgeRegistry } from '../IntentKnowledgeRegistry';
import { GeminiIntentResponse } from './GeminiModels';
import { GoogleGenerativeAI, Schema, SchemaType } from '@google/generative-ai';

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
        model: 'gemini-1.5-flash',
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: schema,
        } 
      });

      // Implement simple retry and timeout (timeout handled via AbortController in fetch if needed, 
      // but generative-ai handles it natively if we pass a signal, or we can race it)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // < 3s SLA

      try {
        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\nUser Input:\n${userInput}` }] }]
        });
        
        clearTimeout(timeoutId);
        
        const responseText = result.response.text();
        const payload = JSON.parse(responseText) as GeminiIntentResponse;
        
        this.validatePayload(payload);
        return payload;
      } catch (err: any) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
          throw new Error('Gemini API timeout exceeded (3s)');
        }
        throw err;
      }
      
    } catch (err) {
      throw new Error(`Gemini Adapter failed to parse intent: ${err}`);
    }
  }
  
  private static validatePayload(payload: any) {
    if (!payload.intent) throw new Error('Missing intent field in Gemini JSON');
    if (typeof payload.confidence !== 'number') throw new Error('Missing confidence field in Gemini JSON');
    if (!payload.entities) throw new Error('Missing entities field in Gemini JSON');
  }
}
