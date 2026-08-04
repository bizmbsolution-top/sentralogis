import { TraceContext } from '../contracts/IRequestContext';

function generateId(length: number = 16): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, '').substring(0, length);
  }
  return Math.random().toString(16).substring(2, 2 + length);
}

export class CorrelationProvider {
  static createTraceContext(existingTraceId?: string, existingSpanId?: string): TraceContext {
    return {
      traceId: existingTraceId || generateId(32),
      spanId: generateId(16),
      parentSpanId: existingSpanId
    };
  }
}
