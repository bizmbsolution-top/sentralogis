export interface ILogger {
  info(message: string, context?: Record<string, unknown>): void;
  error(message: string, error: Error, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  debug(message: string, context?: Record<string, unknown>): void;
}

export interface IMetricsCollector {
  recordHistogram(name: string, value: number, tags?: Record<string, string>): void;
  incrementCounter(name: string, value?: number, tags?: Record<string, string>): void;
  recordGauge(name: string, value: number, tags?: Record<string, string>): void;
}

export interface ITraceProvider {
  startSpan(name: string): any;
  endSpan(span: any): void;
  recordError(span: any, error: Error): void;
}
