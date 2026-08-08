import { PipelineContext, PipelineStage, PipelineResult, PipelineStatus } from '../PipelineModels';
import { IntentResolver } from '../../resolver/IntentResolver';
import { MemoryResolver } from '../../memory/MemoryResolver';

export class IntentStage implements PipelineStage {
  readonly name = 'IntentResolution';

  async execute(context: PipelineContext): Promise<PipelineResult> {
    // 1. Resolve contextual references first
    context.userInput = MemoryResolver.resolveReferences(context.userInput, context.context);

    // 2. Resolve Intent using the context-enriched string
    const resolved = await IntentResolver.resolve(context);
    
    context.resolvedIntentName = resolved.intent;
    context.resolvedIntentSuggestions = resolved.suggestions;
    context.resolvedEntities = resolved.entities;

    if (resolved.intent === 'UNKNOWN') {
      context.finalResponse = {
        type: 'clarification',
        content: resolved.suggestions?.length 
          ? `Did you mean to ${resolved.suggestions.join(' or ')}?`
          : "I'm sorry, I couldn't understand that command. Could you please clarify?",
        metrics: { totalMs: 0 } // Replaced by pipeline orchestrator
      };
      return { status: PipelineStatus.REQUIRES_CLARIFICATION };
    }

    return { status: PipelineStatus.CONTINUE };
  }
}
