import { CopilotIntent } from './CopilotIntent';
import { EntityLookupService } from './EntityLookupService';
import { AmbiguityResolver } from './AmbiguityResolver';
import { EntityResolutionResult } from './EntityResolutionResult';
import { IRequestContext } from '../../domains/security/contracts/IRequestContext';

export class EntityResolver {
  constructor(
    private readonly lookupService: EntityLookupService,
    private readonly ambiguityResolver: AmbiguityResolver
  ) {}

  public async resolveEntities(intent: CopilotIntent, context: IRequestContext): Promise<EntityResolutionResult[]> {
    const results: EntityResolutionResult[] = [];
    
    // Process each entity required by the intent
    for (const entityRef of intent.entities) {
      const candidates = await this.lookupService.lookup(entityRef.type, entityRef.value, context.tenantId);
      
      const resolution = this.ambiguityResolver.resolve(
        candidates,
        entityRef.value,
        entityRef.type,
        context.tenantId
      );

      results.push(resolution);
    }

    return results;
  }
}
