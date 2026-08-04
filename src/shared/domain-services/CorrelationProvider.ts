export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  sampled?: boolean;
}

export interface CorrelationContext {
  requestId: string;
  correlationId: string;
  traceContext?: TraceContext;
  baggage?: Record<string, string>; // W3C Baggage Support
  tenantId?: string;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

export abstract class CorrelationProvider {
  abstract generateCorrelationId(): string;
  abstract getCurrentContext(): CorrelationContext | null;
  abstract runWithContext<T>(context: CorrelationContext, fn: () => Promise<T>): Promise<T>;
  abstract propagateToQueueMessage(): Record<string, string>;
  abstract extractFromQueueMessage(headers: Record<string, string>): CorrelationContext;
}
