import { IntentRegistry } from '../registry/IntentRegistry';

export class ActionBridge {
  
  /**
   * Evaluates requirements generically using the IntentRegistry.
   */
  static getRequiredPermissions(intentName: string): string[] {
    const registry = IntentRegistry.getInstance();
    const definition = registry.get(intentName);
    return definition ? definition.requiredPermissions : ['Basic.Read'];
  }

  static getRiskLevel(intentName: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const registry = IntentRegistry.getInstance();
    const definition = registry.get(intentName);
    return definition ? definition.riskLevel : 'LOW';
  }

  static generateExplanation(intentName: string, entityKeys: string[]): string {
    const registry = IntentRegistry.getInstance();
    const definition = registry.get(intentName);
    if (definition) {
      return definition.explanationTemplate;
    }
    return `Querying data for ${entityKeys.join(', ')}`;
  }
}
