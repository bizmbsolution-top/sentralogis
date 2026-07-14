import {
  supabase as unifiedSupabase,
  createClient as createSupabaseClient,
} from "./supabase/client";

/**
 * Re-exporting the unified supabase client from the new location
 * to maintain backward compatibility with existing imports.
 */
export const supabase = unifiedSupabase;
export const createClient = createSupabaseClient;
