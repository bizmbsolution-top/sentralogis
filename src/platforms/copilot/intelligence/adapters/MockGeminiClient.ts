import { GeminiIntentResponse } from './GeminiModels';

export class MockGeminiClient {
  
  static simulateSuccess(intent: string, entities: Record<string, string>): string {
    const payload: GeminiIntentResponse = {
      intent,
      confidence: 0.95,
      entities,
      ambiguities: [],
      reasoning: 'Extracted directly from user text.',
      language: 'en'
    };
    return JSON.stringify(payload);
  }

  static simulateAmbiguity(intent: string, ambiguities: string[], clarification: string): string {
    const payload: GeminiIntentResponse = {
      intent,
      confidence: 0.6,
      entities: {},
      ambiguities,
      reasoning: 'Multiple entities found or missing required entity context.',
      language: 'en',
      suggestedClarification: clarification
    };
    return JSON.stringify(payload);
  }
  
  static simulateUnknown(): string {
    const payload: GeminiIntentResponse = {
      intent: 'UNKNOWN',
      confidence: 0.1,
      entities: {},
      ambiguities: [],
      reasoning: 'Input does not match any known intent structural definitions.',
      language: 'en'
    };
    return JSON.stringify(payload);
  }

  static simulateFailure(): string {
    return "Rate limit exceeded or timeout or invalid JSON { {";
  }
  
  // A mock dispatcher that reads the input string to decide which simulation to run
  static async call(prompt: string, input: string): Promise<string> {
    const lower = input.toLowerCase();
    
    if (lower.includes('timeout') || lower.includes('fail')) {
      return this.simulateFailure();
    }
    
    if (lower.includes('ambiguous') || lower.includes('two drivers')) {
      return this.simulateAmbiguity('REPLACE_DRIVER', ['Budi', 'Andi'], 'Which driver do you want to replace? Budi or Andi?');
    }
    
    if (lower.includes('replace driver budi with andi') || lower.includes('replace driver') || lower.includes('ganti supir')) {
      return this.simulateSuccess('REPLACE_DRIVER', lower.includes('anton') ? { 'Driver': 'Anton' } : {});
    }

    if (lower.includes('cancel the job')) {
      return this.simulateSuccess('CANCEL_JOB', {});
    }

    if (lower.includes('show timeline') || lower.includes('where is')) {
      return this.simulateSuccess('SHOW_TIMELINE', {});
    }

    return this.simulateUnknown();
  }
}
