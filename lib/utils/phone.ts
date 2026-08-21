/**
 * Normalize phone number to canonical format (e.g. 628xxxxxxxx)
 * Rules:
 * - Remove non-digit characters
 * - 08xxxxxxxx -> 628xxxxxxxx
 * - 8xxxxxxxx -> 628xxxxxxxx
 * - 62xxxxxxxx -> no change
 * - Reject invalid numbers (length < 9)
 */
export function normalizePhone(input: string | null | undefined): string {
  if (!input) {
    throw new Error('Phone number is required');
  }

  // Remove non-digit characters
  let clean = input.replace(/\D/g, '');

  if (clean.length === 0) {
    throw new Error('Invalid phone number format');
  }

  if (clean.startsWith('08')) {
    clean = '62' + clean.substring(1);
  } else if (clean.startsWith('8')) {
    clean = '62' + clean;
  }

  if (clean.length < 9) {
    throw new Error('Phone number too short');
  }

  return clean;
}

export function isValidPhone(input: string | null | undefined): boolean {
  try {
    normalizePhone(input);
    return true;
  } catch (error) {
    return false;
  }
}
