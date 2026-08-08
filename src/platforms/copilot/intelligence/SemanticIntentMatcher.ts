import { IntentKnowledgeRegistry } from './IntentKnowledgeRegistry';
import { IntentKnowledge } from './IntentKnowledge';

export interface SemanticMatchResult {
  intentId: string;
  confidence: number;
  matchedKeywords: string[];
  matchedAliases: string[];
}

export class SemanticIntentMatcher {
  
  static match(userInput: string): SemanticMatchResult[] {
    const normalizedInput = userInput.toLowerCase().replace(/[.,!?]/g, '');
    const tokens = normalizedInput.split(/\s+/);
    
    const intents = IntentKnowledgeRegistry.getAll();
    const results: SemanticMatchResult[] = [];

    for (const intent of intents) {
      const result = this.evaluateIntent(normalizedInput, tokens, intent);
      if (result.confidence > 0) {
        results.push(result);
      }
    }

    // Sort descending by confidence
    return results.sort((a, b) => b.confidence - a.confidence);
  }

  private static evaluateIntent(input: string, tokens: string[], intent: IntentKnowledge): SemanticMatchResult {
    let score = 0;
    const matchedKeywords: string[] = [];
    const matchedAliases: string[] = [];

    // 1. Keyword match (low weight)
    for (const kw of intent.keywords) {
      if (tokens.includes(kw)) {
        score += 0.2;
        matchedKeywords.push(kw);
      }
    }

    // 2. Multilingual Alias/Phrase match (high weight)
    for (const support of intent.multilingualSupport) {
      for (const alias of support.aliases) {
        if (input.includes(alias.toLowerCase())) {
          score += 0.6;
          matchedAliases.push(alias);
        }
      }
      for (const phrase of support.phrases) {
        if (input.includes(phrase.toLowerCase())) {
          score += 0.8;
          matchedAliases.push(phrase);
        }
      }
    }

    // Cap at 1.0
    const confidence = Math.min(score, 1.0);

    return {
      intentId: intent.id,
      confidence,
      matchedKeywords,
      matchedAliases
    };
  }
}
