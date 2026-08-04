import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { MiddlewareRegistry } from '@/src/domains/security/middleware/MiddlewareRegistry';
import { CorrelationHandler } from '@/src/domains/security/middleware/CorrelationHandler';
// Note: In Phase 1C, we instantiate the pipeline. 
// For backward compatibility (zero disruption), the middleware is currently running in "Observe" mode.

const registry = new MiddlewareRegistry();
registry.use(new CorrelationHandler());

// In the future, TenantHandler and AuthHandler will be added here.

export async function middleware(request: NextRequest) {
  try {
    // We construct a standard Request object if needed, or pass NextRequest.
    // The registry expects a standard Request. NextRequest extends Request.
    const response = await registry.execute(request as unknown as Request);
    
    // If the pipeline completes normally, we allow the request to proceed.
    const nextResponse = NextResponse.next();
    
    // Copy any correlation headers set by the pipeline
    if (response.headers.has('x-trace-id')) {
      nextResponse.headers.set('x-trace-id', response.headers.get('x-trace-id')!);
    }
    
    return nextResponse;
  } catch (error: any) {
    // Fail-open for backward compatibility. In Phase 2, this will return 401/403.
    console.error('[Middleware] Pipeline error:', error.message);
    return NextResponse.next();
  }
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    // Protect API routes
    '/api/:path*',
    // Exclude static files and next internals
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
