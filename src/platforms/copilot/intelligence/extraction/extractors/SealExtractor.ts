import { OperationalContext } from '../../../context/OperationalContext';
import { EntityExtractionStrategy } from '../EntityExtractionStrategy';
import { EntityResolution } from '../../entities/models';

export class SealExtractor implements EntityExtractionStrategy {
  entityType = 'Seal';
  
  async extract(input: string, context?: OperationalContext): Promise<EntityResolution> {
    const matches = input.match(/(?:seal|segel)\s+([A-Za-z0-9]+)/i);
    if (matches && matches[1]) {
      const seal = matches[1].toUpperCase();
      return {
        status: 'RESOLVED',
        entity: {
          entityType: this.entityType,
          resolvedId: `seal-uuid-${seal}`,
          displayName: seal,
          confidence: 0.90,
          explanation: {
            matchMethod: 'EXACT',
            evidence: 'Keyword match followed by alphanumeric',
            source: 'USER_INPUT'
          }
        }
      };
    }
    return { status: 'UNKNOWN', reason: 'No Seal number found' };
  }
}
