import { EntityCandidate } from './EntityCandidate';
import { IEntityLookupProvider } from './providers/IEntityLookupProvider';

export class EntityLookupService {
  private providers: IEntityLookupProvider[] = [];

  public registerProvider(provider: IEntityLookupProvider): void {
    this.providers.push(provider);
  }

  public async lookup(entityType: string, searchTerm: string, tenantId: string): Promise<EntityCandidate[]> {
    const provider = this.providers.find(p => p.supports(entityType));
    
    if (!provider) {
      console.warn(`[EntityLookupService] No provider registered for entity type: ${entityType}`);
      return [];
    }

    return provider.lookup(searchTerm, tenantId);
  }
}
