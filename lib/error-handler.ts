// [AI] Standard try/catch utility — wraps async operations with structured logging
// [AI] reading from .env.local for environment config

import { logger } from './logger';

export interface ErrorHandlerOptions {
  module: string;
  action: string;
  user_id?: string;
  reference_id?: string;
  correlation_id?: string;
  rethrow?: boolean;
}

export async function tryCatch<T>(
  fn: () => Promise<T>,
  options: ErrorHandlerOptions
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error(options.module, options.action, {
      user_id: options.user_id,
      reference_id: options.reference_id,
      correlation_id: options.correlation_id,
      payload: { error: message },
      error: err,
    });

    if (options.rethrow) throw err;
    return { success: false, error: message };
  }
}

export function apiErrorResponse(error: unknown, module: string, action: string) {
  const message = error instanceof Error ? error.message : 'Internal server error';
  logger.error(module, action, { payload: { error: message }, error });
  return { success: false, error: message };
}
