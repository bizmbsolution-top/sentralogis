export class PinnedEntity {
  private constructor(
    private readonly _id: string,
    private readonly _entityType: string,
    private readonly _displayName: string,
    private readonly _confidence: number,
    private readonly _source: string,
    private readonly _timestamp: number,
    private readonly _reason: string
  ) {}

  static create(props: {
    id: string;
    entityType: string;
    displayName: string;
    confidence?: number;
    source?: string;
    reason?: string;
  }): PinnedEntity {
    return new PinnedEntity(
      props.id,
      props.entityType,
      props.displayName,
      props.confidence ?? 1.0,
      props.source ?? 'WORKSPACE_CONTEXT',
      Date.now(),
      props.reason ?? 'Pinned in active workspace'
    );
  }

  isResolved(): boolean { return this._confidence >= 0.8; }
  isPinned(): boolean { return true; }
  
  getId(): string { return this._id; }
  getEntityType(): string { return this._entityType; }
  getDisplayName(): string { return this._displayName; }

  toExplainability(): string {
    return `${this._entityType}: ${this._displayName} (${this._id}) - Pinned`;
  }

  summary(): string {
    return `PinnedEntity [${this._entityType}] ${this._displayName} (${this._id})`;
  }
}
