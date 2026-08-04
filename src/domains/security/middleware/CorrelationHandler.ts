import { IMiddlewareHandler } from '../contracts/IMiddlewareHandler';
import { CorrelationProvider } from '../context/CorrelationProvider';

export class CorrelationHandler implements IMiddlewareHandler {
  async handle(req: Request, next: () => Promise<Response>): Promise<Response> {
    const existingTraceId = req.headers.get('x-trace-id') || undefined;
    const existingSpanId = req.headers.get('x-span-id') || undefined;
    
    const trace = CorrelationProvider.createTraceContext(existingTraceId, existingSpanId);
    
    req.headers.set('x-trace-id', trace.traceId);
    req.headers.set('x-span-id', trace.spanId);

    const response = await next();
    response.headers.set('x-trace-id', trace.traceId);
    return response;
  }
}
