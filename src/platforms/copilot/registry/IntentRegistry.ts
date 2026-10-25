import { IntentDefinition } from './IntentDefinition';
import { registerDefaultIntents } from './DefaultIntents';

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
    if (this.intents.size === 0) {
      registerDefaultIntents();
    }
    return this.intents.get(name);
  }

  public getAll(): IntentDefinition[] {
    if (this.intents.size === 0) {
      registerDefaultIntents();
    }
    return Array.from(this.intents.values());
  }
}
