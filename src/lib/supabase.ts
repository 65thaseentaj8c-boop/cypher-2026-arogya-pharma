import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl.trim() !== '' && supabaseAnonKey.trim() !== ''
);

/**
 * Validates environment configuration and creates a SupabaseClient.
 * Throws a clean configuration error without exposing any secrets if variables are missing.
 */
export function getSupabaseClient(): SupabaseClient {
  if (!isSupabaseConfigured) {
    throw new Error(
      'Supabase Configuration Error: VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY must be configured in .env.local before initializing Supabase client.'
    );
  }
  return createClient(supabaseUrl, supabaseAnonKey);
}

/**
 * Primary Supabase client instance.
 * Initialized if environment variables are properly set in .env.local.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
