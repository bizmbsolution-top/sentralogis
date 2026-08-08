import { OperationalContext } from '../../../context/OperationalContext';
import { EntityExtractionStrategy } from '../EntityExtractionStrategy';
import { EntityResolution } from '../../entities/models';

export class DriverExtractor implements EntityExtractionStrategy {
  entityType = 'Driver';
  
  async extract(input: string, context?: OperationalContext): Promise<EntityResolution> {
    const normalized = input.toLowerCase();
    const matches = normalized.match(/(?:driver|sopir|supir)\s+([a-z\s]+)/);
    let name = null;

    if (matches && matches[1]) {
      name = matches[1].trim();
    } else if (normalized.match(/\bbudi\b/)) {
      name = 'budi santoso';
    } else if (normalized.match(/\bandi\b/)) {
      name = 'andi setiawan';
    }

    if (!name) {
      return { status: 'UNKNOWN', reason: 'No driver name found in input' };
    }

    // Mock Database verification
    if (name.includes('budi')) {
      return {
        status: 'RESOLVED',
        entity: {
          entityType: this.entityType,
          resolvedId: 'drv-uuid-budi-123',
          displayName: 'Budi Santoso',
          confidence: 0.98,
          explanation: {
            matchMethod: 'DATABASE',
            evidence: 'Database verified',
            source: 'USER_INPUT'
          }
        }
      };
    } else if (name.includes('andi')) {
      return {
        status: 'RESOLVED',
        entity: {
          entityType: this.entityType,
          resolvedId: 'drv-uuid-andi-456',
          displayName: 'Andi Setiawan',
          confidence: 0.98,
          explanation: {
            matchMethod: 'DATABASE',
            evidence: 'Database verified',
            source: 'USER_INPUT'
          }
        }
      };
    }

    // Ambiguity Mock
    if (name.includes('agus')) {
      return {
        status: 'AMBIGUOUS',
        ambiguity: {
          isAmbiguous: true,
          clarificationPrompt: 'I found three drivers named Agus. Which one do you mean?',
          candidates: [
            { resolvedId: 'drv-agus-1', displayName: 'Agus Salim', confidence: 0.6, explanation: { matchMethod: 'PARTIAL', evidence: 'First name match', source: 'USER_INPUT' } },
            { resolvedId: 'drv-agus-2', displayName: 'Agus Riyadi', confidence: 0.6, explanation: { matchMethod: 'PARTIAL', evidence: 'First name match', source: 'USER_INPUT' } }
          ]
        }
      };
    }

    return { status: 'UNKNOWN', reason: `Entity not found in database: ${name}` };
  }
}
