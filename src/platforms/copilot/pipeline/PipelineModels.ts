import { OperationalContext } from '../context/OperationalContext';
import { EntityResolutionResult } from '../intelligence/entities/models';
import { StructuralValidationResult } from '../validation/ValidationModels';
import { ExplainabilityData } from '../metrics/ExplainabilityData';
import { EnrichedOperationalContext } from '../engine/ContextEnricher';
import { CopilotResponse } from '../engine/CopilotEngine';

export enum PipelineStatus {
  CONTINUE = 'CONTINUE',
  BLOCKED = 'BLOCKED',
  REQUIRES_CLARIFICATION = 'REQUIRES_CLARIFICATION',
  TERMINATED = 'TERMINATED',
  SUCCESS = 'SUCCESS'
}

export interface PipelineResult {
  status: PipelineStatus;
  message?: string;
}

export class PipelineContext {
  public readonly pipelineId: string;
  public readonly correlationId: string;
  
  userInput: string;
  context: OperationalContext;
  
  resolvedIntentName?: string;
  resolvedIntentSuggestions?: string[];
  resolvedEntities?: EntityResolutionResult;
  
  enrichedContext?: EnrichedOperationalContext;
  
  validationResult?: StructuralValidationResult;
  
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  requiredPermissions?: string[];
  
  explainabilityData?: ExplainabilityData;
  
  finalResponse?: CopilotResponse;

  constructor(userInput: string, context: OperationalContext) {
    this.pipelineId = `pl-${Math.random().toString(36).substring(2, 9)}`;
    this.correlationId = `cor-${Math.random().toString(36).substring(2, 9)}`;
    this.userInput = userInput;
    this.context = context;
  }
}

export interface PipelineStage {
  readonly name: string;
  execute(context: PipelineContext): Promise<PipelineResult>;
}
