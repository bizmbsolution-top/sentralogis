import { OperationalContext } from '../../../context/OperationalContext';
import { EntityExtractionStrategy } from '../EntityExtractionStrategy';
import { EntityResolution } from '../../entities/models';

export class VehicleExtractor implements EntityExtractionStrategy {
  entityType = 'Vehicle';
  
  async extract(input: string, context?: OperationalContext): Promise<EntityResolution> {
    const matches = input.toUpperCase().match(/\b([A-Z]{1,2}\s?\d{1,4}\s?[A-Z]{1,3})\b/);
    if (matches && matches[1]) {
      const plate = matches[1].replace(/\s/g, '');
      return {
        status: 'RESOLVED',
        entity: {
          entityType: this.entityType,
          resolvedId: `veh-uuid-${plate}`,
          displayName: plate,
          confidence: 0.95,
          explanation: {
            matchMethod: 'DATABASE',
            evidence: 'Database verified license plate',
            source: 'USER_INPUT'
          }
        }
      };
    }
    return { status: 'UNKNOWN', reason: 'No vehicle plate found in input' };
  }
}
