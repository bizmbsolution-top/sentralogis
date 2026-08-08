export interface TelemetryEventMetadata {
  eventId: string;
  pipelineId: string;
  sessionId: string;
  tenantId: string;
  userId: string;
  correlationId: string;
  timestamp: number;
}

export interface IntentResolvedPayload {
  intent: string;
  confidence: number;
  durationMs: number;
}

export interface IntentUnknownPayload {
  reason: string;
  durationMs: number;
}

export interface FallbackPayload {
  reason: string;
  stage: string;
}

export interface PipelineExecutionPayload {
  totalDurationMs: number;
  finalStatus: string;
  stagesExecuted: string[];
}

export interface ValidationFailedPayload {
  ruleId: string;
  reason: string;
}

export interface ExecutionFailedPayload {
  error: string;
  service: string;
}

export type TelemetryPayload =
  | { eventType: 'INTENT_RESOLVED'; payload: IntentResolvedPayload }
  | { eventType: 'INTENT_UNKNOWN'; payload: IntentUnknownPayload }
  | { eventType: 'GEMINI_TIMEOUT'; payload: { durationMs: number } }
  | { eventType: 'GEMINI_LATENCY'; payload: { durationMs: number } }
  | { eventType: 'FALLBACK_TRIGGERED'; payload: FallbackPayload }
  | { eventType: 'PIPELINE_EXECUTION'; payload: PipelineExecutionPayload }
  | { eventType: 'VALIDATION_FAILED'; payload: ValidationFailedPayload }
  | { eventType: 'PLANNER_FAILED'; payload: { reason: string } }
  | { eventType: 'EXECUTION_FAILED'; payload: ExecutionFailedPayload };

export type TelemetryEvent = TelemetryEventMetadata & TelemetryPayload;
