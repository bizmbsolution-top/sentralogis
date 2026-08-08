export class ConversationContext {
  private constructor(
    private readonly _conversationId: string,
    private readonly _activeIntent: string | null,
    private readonly _conversationMemory: Record<string, any>,
    private readonly _referencedEntities: Record<string, string>,
    private readonly _lastExecution: string | null,
    private readonly _followUpSuggestions: string[]
  ) {}

  static create(props: {
    conversationId: string;
    activeIntent?: string | null;
    conversationMemory?: Record<string, any>;
    referencedEntities?: Record<string, string>;
    lastExecution?: string | null;
    followUpSuggestions?: string[];
  }): ConversationContext {
    return new ConversationContext(
      props.conversationId,
      props.activeIntent || null,
      props.conversationMemory || {},
      props.referencedEntities || {},
      props.lastExecution || null,
      props.followUpSuggestions || []
    );
  }

  getConversationId(): string { return this._conversationId; }
  
  activeIntent(): string | null { return this._activeIntent; }
  activeEntity(type: string): string | null { return this._referencedEntities[type] || null; }
  
  // NOTE: In a fully immutable architecture, these return a NEW instance of ConversationContext
  remember(key: string, value: any): ConversationContext {
    return new ConversationContext(
      this._conversationId,
      this._activeIntent,
      { ...this._conversationMemory, [key]: value },
      this._referencedEntities,
      this._lastExecution,
      this._followUpSuggestions
    );
  }

  forget(key: string): ConversationContext {
    const memory = { ...this._conversationMemory };
    delete memory[key];
    return new ConversationContext(
      this._conversationId,
      this._activeIntent,
      memory,
      this._referencedEntities,
      this._lastExecution,
      this._followUpSuggestions
    );
  }

  summary(): string {
    return `Conversation [${this._conversationId}] - Memory size: ${Object.keys(this._conversationMemory).length}`;
  }
}
