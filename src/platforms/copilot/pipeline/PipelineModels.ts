import { OperationalContext } from '../context/OperationalContext';
import { EntityResolutionResult } from '../intelligence/entities/models';
import { StructuralValidationResult } from '../validation/ValidationModels';
import { ExplainabilityData } from '../metrics/ExplainabilityData';
import { EnrichedOperationalContext } from '../engine/ContextEnricher';
import { CopilotResponse } from '../engine/CopilotEngine';
import type { IdentityContext } from '@/lib/application/identity/types';

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

export type CopilotAiStatus = 'AVAILABLE' | 'UNAVAILABLE' | 'DEGRADED';

export type IntentResolutionSource = 'OPENAI' | 'GEMINI' | 'DETERMINISTIC_FALLBACK' | 'NONE';

export type UpstreamFailureClass =
  | 'CAPACITY_EXHAUSTED'
  | 'TIMEOUT_EXCEEDED'
  | 'QUOTA_EXHAUSTED'
  | 'UPSTREAM_FAILURE'
  | 'INVALID_REQUEST'
  | 'AUTH_MISCONFIGURED'
  | 'MODEL_INELIGIBLE'
  | 'PAYLOAD_INVALID_JSON'
  | 'PAYLOAD_SCHEMA_MISMATCH';

export interface CopilotResolutionMetadata {
  aiStatus: CopilotAiStatus;
  resolutionSource: IntentResolutionSource;
  failureClass?: UpstreamFailureClass;
}

export class PipelineContext {
  public readonly pipelineId: string;
  public readonly correlationId: string;
  
  resolutionMetadata?: CopilotResolutionMetadata;

  userInput: string;
  context: OperationalContext;
  identity: IdentityContext | null;

  resolvedIntentName?: string;
  resolvedIntentSuggestions?: string[];
  resolvedEntities?: EntityResolutionResult;
  
  enrichedContext?: EnrichedOperationalContext;
  
  validationResult?: StructuralValidationResult;
  
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  requiredPermissions?: string[];
  
  explainabilityData?: ExplainabilityData;
  
  finalResponse?: CopilotResponse;

  constructor(userInput: string, context: OperationalContext, identity?: IdentityContext | null) {
    this.pipelineId = `pl-${Math.random().toString(36).substring(2, 9)}`;
    this.correlationId = `cor-${Math.random().toString(36).substring(2, 9)}`;
    this.userInput = userInput;
    this.context = context;
    this.identity = identity ?? null;
  }
}

export interface PipelineStage {
  readonly name: string;
  execute(context: PipelineContext): Promise<PipelineResult>;
}
