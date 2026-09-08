import { CopilotMetrics } from '../metrics/PerformanceMetrics';
import { EnrichedOperationalContext } from './ContextEnricher';
import { OperationalContext } from '../context/OperationalContext';

import { CopilotPipeline } from '../pipeline/CopilotPipeline';
import { PipelineContext } from '../pipeline/PipelineModels';
import { IntentStage } from '../pipeline/stages/IntentStage';
import { ContextStage } from '../pipeline/stages/ContextStage';
import { ValidationStage } from '../pipeline/stages/ValidationStage';
import { PlanningStage } from '../pipeline/stages/PlanningStage';
import { ExplainabilityStage } from '../pipeline/stages/ExplainabilityStage';
import { ResponseStage } from '../pipeline/stages/ResponseStage';
import { createFoundationContext } from '@/lib/copilot/foundation/integration';
import { OperationalSummaryProvider } from '@/lib/copilot/read/summary-provider';

export interface CopilotResponse {
  type: 'action_proposal' | 'text' | 'timeline' | 'clarification';
  content?: string;
  proposal?: any;
  timeline?: any;
  metrics: CopilotMetrics;
  enrichedContext?: EnrichedOperationalContext;
}

export class CopilotEngine {
  
  static async processCommand(
    userInput: string,
    context: OperationalContext
  ): Promise<CopilotResponse> {
    
    const pipeline = new CopilotPipeline()
      .register(new IntentStage())
      .register(new ContextStage())
      .register(new ValidationStage())
      .register(new PlanningStage())
      .register(new ExplainabilityStage())
      .register(new ResponseStage());
      
    const pipelineContext = new PipelineContext(userInput, context);
    
    await pipeline.execute(pipelineContext);
    
    if (pipelineContext.finalResponse) {
      return pipelineContext.finalResponse;
    }
    
    // Fallback in case of catastrophic pipeline logic failure
    return {
      type: 'text',
      content: 'I encountered an unexpected issue while processing that request.',
      metrics: {
        intentResolutionMs: 0,
        entityResolutionMs: 0,
        validationMs: 0,
        planningMs: 0,
        totalResponseMs: 0,
      }
    };
  }

  static async generateDashboardGreeting(tenantId: string, userId: string): Promise<string> {
    const summary = await this.generateOperationalSummary(tenantId, userId);

    return `Good morning. Today there are ${summary.totalActiveJobs} active Job Orders, ${summary.delayedJobs} delayed jobs, ${summary.missingPod} missing PODs, and ${summary.criticalJobs} critical jobs requiring immediate attention. Would you like me to prioritise them?`;
  }

  static async generateOperationalSummary(
    tenantId: string,
    userId: string,
  ): Promise<{ totalActiveJobs: number; delayedJobs: number; criticalJobs: number; missingPod: number; jobsAwaitingAttention: number }> {
    const foundationContext = createFoundationContext({
      tenantId,
      userId,
      role: 'USER',
      permissions: ['commercial:read'],
      isTenantOwner: false,
      membershipId: null,
      sbuScope: null,
    } as any);

    try {
      const summary = await OperationalSummaryProvider.getSummary(foundationContext);
      return {
        totalActiveJobs: summary.totalActiveJobs,
        delayedJobs: summary.delayedJobs,
        criticalJobs: summary.criticalJobs,
        missingPod: summary.missingPod,
        jobsAwaitingAttention: summary.jobsAwaitingAttention,
      };
    } catch (error) {
      console.error('[CopilotEngine] Operational summary failed:', error);
      return {
        totalActiveJobs: 0,
        delayedJobs: 0,
        criticalJobs: 0,
        missingPod: 0,
        jobsAwaitingAttention: 0,
      };
    }
  }
}
