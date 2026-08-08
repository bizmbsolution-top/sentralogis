import { IntentDefinition } from './IntentDefinition';

export class IntentRegistry {
  private static instance: IntentRegistry;
  private intents: Map<string, IntentDefinition>;

  private constructor() {
    this.intents = new Map<string, IntentDefinition>();
  }

  public static getInstance(): IntentRegistry {
    if (!IntentRegistry.instance) {
      IntentRegistry.instance = new IntentRegistry();
    }
    return IntentRegistry.instance;
  }

  public register(intent: IntentDefinition): void {
    this.intents.set(intent.name, intent);
  }

  public get(name: string): IntentDefinition | undefined {
    return this.intents.get(name);
  }

  public getAll(): IntentDefinition[] {
    return Array.from(this.intents.values());
  }
}
