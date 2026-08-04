export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
}

export interface IRequestContext {
  userId: string;
  tenantId: string;
  role: string;
  sessionId?: string;
  trace: TraceContext;
}

export interface IRequestContextProvider {
  getContext(): IRequestContext | null;
  run<T>(context: IRequestContext, fn: () => T): T;
}
