import { OperationalContext } from '../../../context/OperationalContext';
import { EntityExtractionStrategy } from '../EntityExtractionStrategy';
import { EntityResolution } from '../../entities/models';

export class LocationExtractor implements EntityExtractionStrategy {
  entityType = 'Location';
  
  async extract(input: string, context?: OperationalContext): Promise<EntityResolution> {
    const matches = input.match(/(?:ke|menuju|di|lokasi|gudang|port)\s+([A-Za-z0-9\s]+)/i);
    if (matches && matches[1]) {
      const location = matches[1].trim();
      return {
        status: 'RESOLVED',
        entity: {
          entityType: this.entityType,
          resolvedId: `loc-uuid-${location.toLowerCase().replace(/\s+/g, '-')}`,
          displayName: location.charAt(0).toUpperCase() + location.slice(1),
          confidence: 0.85,
          explanation: {
            matchMethod: 'ALIAS',
            evidence: 'Preposition keyword match',
            source: 'USER_INPUT'
          }
        }
      };
    }
    return { status: 'UNKNOWN', reason: 'No Location found' };
  }
}
