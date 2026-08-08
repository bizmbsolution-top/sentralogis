import { OperationalContext } from '../../../context/OperationalContext';
import { EntityExtractionStrategy } from '../EntityExtractionStrategy';
import { EntityResolution } from '../../entities/models';

export class OrganizationExtractor implements EntityExtractionStrategy {
  entityType = 'Organization';
  
  async extract(input: string, context?: OperationalContext): Promise<EntityResolution> {
    // Usually injected via context rather than natural language, but we handle it
    return { status: 'UNKNOWN', reason: 'Organizations are usually resolved implicitly by tenant context' };
  }
}
