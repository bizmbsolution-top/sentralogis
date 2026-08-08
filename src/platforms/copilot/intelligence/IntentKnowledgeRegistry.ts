import { IntentKnowledge } from './IntentKnowledge';
import { DefaultIntents } from '../registry/DefaultIntents';

export class IntentKnowledgeRegistry {
  private static intents: Map<string, IntentKnowledge> = new Map();

  static register(intent: IntentKnowledge) {
    this.intents.set(intent.id, intent);
  }

  static get(intentId: string): IntentKnowledge | undefined {
    return this.intents.get(intentId);
  }

  static getAll(): IntentKnowledge[] {
    return Array.from(this.intents.values());
  }

  static loadDefaultKnowledge() {
    this.register({
      id: DefaultIntents.ASSIGN_DRIVER,
      displayName: 'Assign Driver',
      description: 'Assigns a driver to a job order',
      category: 'EXECUTION',
      version: '1.0',
      keywords: ['assign', 'driver', 'sopir', 'tugaskan', 'budi'],
      multilingualSupport: [
        {
          locale: 'en',
          aliases: ['assign driver', 'allocate driver', 'set driver'],
          phrases: ['assign driver budi', 'give this to driver']
        },
        {
          locale: 'id',
          aliases: ['ganti driver', 'tugaskan sopir', 'assign sopir'],
          phrases: ['tugaskan pak budi', 'kasih ke sopir']
        }
      ],
      positiveExamples: ['assign driver budi to jo-123'],
      negativeExamples: ['replace the driver', 'where is the driver'],
      promptHint: 'Extract JobOrder and Driver entities. If only a driver name is mentioned, assume current JobContext.',
      requiredEntities: ['JobOrder', 'Driver'],
      optionalEntities: ['Vehicle'],
      requiredPermissions: ['JobOrder.Update'],
      riskLevel: 'MEDIUM',
      baseConfidenceThreshold: 0.7
    });

    this.register({
      id: DefaultIntents.REPLACE_DRIVER,
      displayName: 'Replace Driver',
      description: 'Replaces the currently assigned driver on a job order',
      category: 'EXECUTION',
      version: '1.0',
      keywords: ['replace', 'change', 'reassign', 'ganti', 'tukar'],
      multilingualSupport: [
        {
          locale: 'en',
          aliases: ['replace driver', 'change driver', 'reassign driver'],
          phrases: ['replace driver budi with andi']
        },
        {
          locale: 'id',
          aliases: ['ganti sopir', 'tukar driver', 'reassign supir'],
          phrases: ['ganti dengan pak budi', 'tukar supir']
        }
      ],
      positiveExamples: ['replace driver with budi'],
      negativeExamples: ['assign a driver'],
      promptHint: 'This replaces an existing assignment. Requires active JobContext.',
      requiredEntities: ['JobOrder', 'Driver'],
      optionalEntities: [],
      requiredPermissions: ['JobOrder.Update'],
      riskLevel: 'HIGH',
      baseConfidenceThreshold: 0.8
    });

    this.register({
      id: DefaultIntents.SHOW_TIMELINE,
      displayName: 'Show Timeline',
      description: 'Displays chronological events for an entity',
      category: 'QUERY',
      version: '1.0',
      keywords: ['timeline', 'status', 'delayed', 'where', 'lacak', 'posisi'],
      multilingualSupport: [
        {
          locale: 'en',
          aliases: ['show timeline', 'check status', 'track'],
          phrases: ['where is the truck', 'why is it delayed']
        },
        {
          locale: 'id',
          aliases: ['lihat timeline', 'cek status', 'lacak posisi'],
          phrases: ['dimana truknya', 'kenapa telat']
        }
      ],
      positiveExamples: ['show timeline for jo-123'],
      negativeExamples: ['update timeline'],
      requiredEntities: [],
      optionalEntities: ['JobOrder', 'Driver', 'Vehicle'],
      requiredPermissions: ['JobOrder.Read'],
      riskLevel: 'LOW',
      baseConfidenceThreshold: 0.6
    });
  }
}
