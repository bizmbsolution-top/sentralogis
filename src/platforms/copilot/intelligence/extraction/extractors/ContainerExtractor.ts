import { OperationalContext } from '../../../context/OperationalContext';
import { EntityExtractionStrategy } from '../EntityExtractionStrategy';
import { EntityResolution } from '../../entities/models';

export class ContainerExtractor implements EntityExtractionStrategy {
  entityType = 'Container';
  
  async extract(input: string, context?: OperationalContext): Promise<EntityResolution> {
    const matches = input.toUpperCase().match(/\b([A-Z]{4}\d{7})\b/);
    if (matches && matches[1]) {
      const containerNo = matches[1];
      return {
        status: 'RESOLVED',
        entity: {
          entityType: this.entityType,
          resolvedId: `cont-uuid-${containerNo}`,
          displayName: containerNo,
          confidence: 0.99,
          explanation: {
            matchMethod: 'EXACT',
            evidence: 'ISO 6346 Container Number match',
            source: 'USER_INPUT'
          }
        }
      };
    }
    return { status: 'UNKNOWN', reason: 'No valid Container number found' };
  }
}
