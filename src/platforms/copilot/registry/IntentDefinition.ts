export interface IntentDefinition {
  name: string;
  description: string;
  requiredEntities: string[];
  optionalEntities: string[];
  requiredPermissions: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  explanationTemplate: string;
}
