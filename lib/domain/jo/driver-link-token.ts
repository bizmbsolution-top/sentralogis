import { randomBytes } from 'node:crypto';

/**
 * Generate a fresh capability token whenever a JO is assigned or reassigned.
 * This must only be called from server-side assignment code.
 */
export function generateDriverLinkToken(): string {
  return randomBytes(10).toString('hex').slice(0, 13);
}
