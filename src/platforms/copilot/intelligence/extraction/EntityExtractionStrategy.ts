import { EntityResolution } from '../entities/models';
import { OperationalContext } from '../../context/OperationalContext';

export interface EntityExtractionStrategy {
  entityType: string;
  extract(input: string, context?: OperationalContext): Promise<EntityResolution>;
}
