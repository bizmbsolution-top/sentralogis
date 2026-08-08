export type EntityMatchMethod = 'EXACT' | 'ALIAS' | 'PARTIAL' | 'HISTORY' | 'LLM' | 'DATABASE';
export type EntitySource = 'USER_INPUT' | 'PINNED_CONTEXT' | 'CONVERSATION_HISTORY' | 'SYSTEM_DEFAULT';

export interface EntityExplanation {
  matchMethod: EntityMatchMethod;
  evidence: string;
  source: EntitySource;
  details?: string;
}

export interface ExtractedEntity {
  entityType: string;
  resolvedId: string;
  displayName: string;
  confidence: number;
  explanation: EntityExplanation;
}

export interface EntityCandidate {
  resolvedId: string;
  displayName: string;
  confidence: number;
  explanation: EntityExplanation;
}

export interface AmbiguityResult {
  isAmbiguous: true;
  candidates: EntityCandidate[];
  clarificationPrompt: string;
}

export type EntityResolution = 
  | { status: 'RESOLVED'; entity: ExtractedEntity }
  | { status: 'AMBIGUOUS'; ambiguity: AmbiguityResult }
  | { status: 'UNKNOWN'; reason: string };

export interface RawEntityResolutionMap {
  [entityType: string]: EntityResolution;
}

export class EntityResolutionResult {
  private _map: RawEntityResolutionMap;
  private _summaryCache?: string;

  constructor(map: RawEntityResolutionMap = {}) {
    this._map = map;
  }

  resolve(entityType: string): ExtractedEntity | undefined {
    const res = this._map[entityType];
    return res && res.status === 'RESOLVED' ? res.entity : undefined;
  }

  has(entityType: string): boolean {
    return !!this._map[entityType];
  }

  hasResolved(entityType: string): boolean {
    return this.resolve(entityType) !== undefined;
  }

  resolved(): ExtractedEntity[] {
    const result: ExtractedEntity[] = [];
    for (const key of Object.keys(this._map)) {
      const r = this._map[key];
      if (r.status === 'RESOLVED') result.push(r.entity);
    }
    return result;
  }

  ambiguous(): AmbiguityResult[] {
    const result: AmbiguityResult[] = [];
    for (const key of Object.keys(this._map)) {
      const r = this._map[key];
      if (r.status === 'AMBIGUOUS') result.push(r.ambiguity);
    }
    return result;
  }

  missing(requiredTypes?: string[]): string[] {
    if (requiredTypes) {
      return requiredTypes.filter(t => !this.hasResolved(t));
    }
    return Object.keys(this._map).filter(key => this._map[key].status === 'UNKNOWN');
  }

  invalid(): string[] {
    return Object.keys(this._map).filter(key => this._map[key].status !== 'RESOLVED');
  }

  invalidCount(): number {
    return this.invalid().length;
  }

  confidence(): number {
    const resolvedEntities = this.resolved();
    if (resolvedEntities.length === 0) return 0;
    const sum = resolvedEntities.reduce((acc, e) => acc + e.confidence, 0);
    return sum / resolvedEntities.length;
  }

  toExplainability(): string[] {
    const res: string[] = [];
    for (const [key, val] of Object.entries(this._map)) {
      if (val.status === 'RESOLVED') {
        res.push(`${val.entity.entityType}: ${val.entity.displayName} (${val.entity.resolvedId})`);
      }
    }
    return res;
  }

  toOperationalInsight(): Record<string, any> {
    return {
      resolvedCount: this.resolved().length,
      ambiguousCount: this.ambiguous().length,
      missingCount: this.missing().length,
      overallConfidence: this.confidence()
    };
  }

  summary(): string {
    if (this._summaryCache) return this._summaryCache;
    
    const resolved = this.resolved().map(e => `${e.entityType}(${e.resolvedId})`).join(', ');
    const ambiguous = this.ambiguous().map(e => (e as any).entityType).join(', ');
    const missing = this.missing().join(', ');

    let result = `EntityResolutionResult | Resolved: [${resolved || 'none'}]`;
    if (ambiguous) result += ` | Ambiguous: [${ambiguous}]`;
    if (missing) result += ` | Missing: [${missing}]`;

    this._summaryCache = result;
    return result;
  }
}
