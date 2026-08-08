import { Result } from '../../shared/kernel/Result';
import { IRequestContext } from '../../domains/security/contracts/IRequestContext';
import { CopilotIntent } from './CopilotIntent';
import { ResolvedBusinessContext } from './ResolvedBusinessContext';
import { EntityResolver } from './EntityResolver';
import { ContextWarnings } from './ContextWarnings';
import { EntityCandidate } from './EntityCandidate';

export class BusinessContextEngine {
  constructor(private readonly entityResolver: EntityResolver) {}

  public async buildContext(
    intent: CopilotIntent,
    requestContext: IRequestContext
  ): Promise<Result<ResolvedBusinessContext>> {
    const warnings = new ContextWarnings();
    const resolvedEntities: Record<string, EntityCandidate> = {};
    let requiresConfirmation = false;

    // 1. Resolve all entities
    const resolutionResults = await this.entityResolver.resolveEntities(intent, requestContext);

    // 2. Process results
    for (const result of resolutionResults) {
      if (result.status === 'PERMISSION_DENIED') {
        return Result.fail(`Permission Denied: Entity ${result.originalValue} does not belong to your tenant.`);
      }

      if (result.status === 'NOT_FOUND') {
        return Result.fail(`Entity Not Found: Could not find ${result.entityType} matching '${result.originalValue}'.`);
      }

      if (result.status === 'AMBIGUOUS') {
        // If there's an ambiguity, we must halt and ask the user for clarification.
        // We package the ambiguous candidates into the error message or a specific result structure.
        // Since Result.fail takes a string, we serialize the candidates.
        const candidateNames = result.candidates.map(c => c.display).join(', ');
        return Result.fail(`Ambiguous Entity: '${result.originalValue}' matches multiple ${result.entityType}s: ${candidateNames}. Please clarify.`);
      }

      if (result.status === 'RESOLVED' && result.resolvedEntity) {
        resolvedEntities[`${result.entityType}:${result.originalValue}`] = result.resolvedEntity;
        
        // Add a warning if we had to soft-match
        if (result.resolvedEntity.confidenceScore < 1.0) {
          warnings.add({
            code: 'SOFT_MATCH',
            message: `Matched '${result.originalValue}' to '${result.resolvedEntity.display}' based on partial similarity.`,
            entityType: result.entityType,
            entityValue: result.originalValue
          });
          requiresConfirmation = true;
        }
      }
    }

    // 3. Prepare execution payload (this would typically map the intent parameters and resolved entity IDs)
    // For now, it's a simple merge, but Intent Resolver will take this and build the strict command.
    const executionPayload = {
      ...intent.parameters,
      // Inject resolved IDs safely
      _resolved: Object.entries(resolvedEntities).reduce((acc, [key, candidate]) => {
        acc[key] = candidate.id;
        return acc;
      }, {} as Record<string, string>)
    };

    // 4. Construct the context
    const businessContext: ResolvedBusinessContext = {
      intent,
      confidence: 1.0, // Base confidence, could be adjusted based on soft matches
      tenantId: requestContext.tenantId,
      userId: requestContext.userId,
      resolvedEntities,
      warnings: warnings.getAll(),
      requiresConfirmation,
      executionPayload
    };

    return Result.ok(businessContext);
  }
}
