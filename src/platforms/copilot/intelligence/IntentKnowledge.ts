export type IntentCategory = 'EXECUTION' | 'QUERY' | 'CLARIFICATION' | 'SYSTEM';

export interface IntentLanguageSupport {
  locale: string;
  aliases: string[];
  phrases: string[];
}

export interface IntentKnowledge {
  id: string;
  displayName: string;
  description: string;
  category: IntentCategory;
  version: string;
  
  // Semantic configuration
  keywords: string[];
  multilingualSupport: IntentLanguageSupport[];
  
  // Examples for LLM Prompting/Few-Shot
  positiveExamples: string[];
  negativeExamples: string[];
  promptHint?: string;

  // Validation & Resolution configs
  requiredEntities: string[];
  optionalEntities: string[];
  requiredPermissions: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  baseConfidenceThreshold: number;
}
