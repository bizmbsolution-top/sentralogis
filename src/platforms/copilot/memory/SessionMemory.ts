import { ConversationContext } from '../context/ConversationContext';

export class SessionMemory {
  private constructor(private readonly _context: ConversationContext) {}

  static from(context: ConversationContext): SessionMemory {
    return new SessionMemory(context);
  }

  get currentConversationId(): string {
    return this._context.getConversationId();
  }

  get activeIntent(): string | null {
    return this._context.activeIntent();
  }

  getReferencedEntity(entityType: string): string | null {
    return this._context.activeEntity(entityType);
  }
}
