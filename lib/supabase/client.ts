import { createBrowserClient } from '@supabase/ssr'
import { Database } from './types'

let clientInstance: ReturnType<typeof createBrowserClient<Database>> | null = null;

/**
 * Creates a Singleton Supabase client for browser/client-side use.
 */
export function createClient() {
  if (typeof window === 'undefined') return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );

  if (clientInstance) return clientInstance;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

  if (!url || !key) {
    console.warn("Supabase keys are missing in the browser environment.");
  }

  clientInstance = createBrowserClient<Database>(url, key);
  
  return clientInstance;
}

/**
 * Global singleton instance for easy import
 */
export const supabase = createClient();
