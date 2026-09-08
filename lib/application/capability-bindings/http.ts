/**
 * Sentralogis — Phase 4B-4 / U-06
 * lib/application/capability-bindings/http.ts
 *
 * Error mapping to stable HTTP responses (§15). Cross-tenant existence is
 * never revealed — foreign bindings are indistinguishable from missing ones.
 */

import { NextResponse } from 'next/server';
import { IdentityResolutionError } from '@/lib/application/identity/errors';
import { CapabilityRegistryError } from '@/lib/application/capabilities/types';
import { BindingLifecycleError } from './types';

export function toLifecycleErrorResponse(error: unknown): NextResponse {
  if (error instanceof IdentityResolutionError) {
    return NextResponse.json(
      { success: false, error: error.code, message: error.message },
      { status: error.statusCode },
    );
  }

  if (error instanceof CapabilityRegistryError) {
    return NextResponse.json(
      { success: false, error: error.code, message: error.message },
      { status: 409 },
    );
  }

  if (error instanceof BindingLifecycleError) {
    return NextResponse.json(
      { success: false, error: error.code, message: error.message },
      { status: error.statusCode },
    );
  }

  console.error('[capability-bindings] unhandled error:', error);
  return NextResponse.json(
    { success: false, error: 'INTERNAL_ERROR', message: 'Unexpected server error.' },
    { status: 500 },
  );
}
