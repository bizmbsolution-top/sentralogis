import { OperationalContext } from '../../../context/OperationalContext';
import { EntityExtractionStrategy } from '../EntityExtractionStrategy';
import { EntityResolution } from '../../entities/models';

export class CustomerExtractor implements EntityExtractionStrategy {
  entityType = 'Customer';
  
  async extract(input: string, context?: OperationalContext): Promise<EntityResolution> {
    const matches = input.match(/(?:customer|client|pt)\s+([A-Za-z0-9\s]+)/i);
    if (matches && matches[1]) {
      const customer = matches[1].trim().toUpperCase();
      return {
        status: 'RESOLVED',
        entity: {
          entityType: this.entityType,
          resolvedId: `cust-uuid-${customer.replace(/\s+/g, '-')}`,
          displayName: `PT ${customer}`,
          confidence: 0.85,
          explanation: {
            matchMethod: 'PARTIAL',
            evidence: 'Keyword match',
            source: 'USER_INPUT'
          }
        }
      };
    }
    return { status: 'UNKNOWN', reason: 'No Customer found' };
  }
}
