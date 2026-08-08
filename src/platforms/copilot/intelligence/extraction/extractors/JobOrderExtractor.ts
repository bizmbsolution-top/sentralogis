import { OperationalContext } from '../../../context/OperationalContext';
import { EntityExtractionStrategy } from '../EntityExtractionStrategy';
import { EntityResolution } from '../../entities/models';

export class JobOrderExtractor implements EntityExtractionStrategy {
  entityType = 'JobOrder';
  
  async extract(input: string, context?: OperationalContext): Promise<EntityResolution> {
    const matches = input.toUpperCase().match(/\b(JO-\d+)\b/);
    if (matches && matches[1]) {
      const jo = matches[1];
      return {
        status: 'RESOLVED',
        entity: {
          entityType: this.entityType,
          resolvedId: `jo-uuid-${jo.toLowerCase()}`,
          displayName: jo,
          confidence: 0.99,
          explanation: {
            matchMethod: 'EXACT',
            evidence: 'Exact JO Number match',
            source: 'USER_INPUT'
          }
        }
      };
    }
    return { status: 'UNKNOWN', reason: 'No Job Order number found in input' };
  }
}
