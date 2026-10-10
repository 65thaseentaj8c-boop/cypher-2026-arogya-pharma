import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

function normalizeUrl(url: string): string {
  let trimmed = url.trim();
  while (trimmed.startsWith('=')) {
    trimmed = trimmed.substring(1).trim();
  }
  trimmed = trimmed.replace(/^["']|["']$/g, '').trim();
  if (!trimmed) return '';
  if (!/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

function normalizeKey(key: string): string {
  let trimmed = key.trim();
  while (trimmed.startsWith('=')) {
    trimmed = trimmed.substring(1).trim();
  }
  return trimmed.replace(/^["']|["']$/g, '').trim();
}

const supabaseUrl = normalizeUrl(import.meta.env.VITE_SUPABASE_URL || '');
const supabaseAnonKey = normalizeKey(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '');

function isValidHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Indicates whether Supabase live client is enabled.
 * Evaluates to true when valid VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are configured.
 * Safely defaults to false during offline unit test suite execution unless VITE_TEST_LIVE_SUPABASE is set.
 */
export const isSupabaseConfigured = Boolean(
  isValidHttpUrl(supabaseUrl) &&
  supabaseAnonKey !== '' &&
  (import.meta.env.MODE !== 'test' || import.meta.env.VITE_TEST_LIVE_SUPABASE === 'true')
);

/**
 * Validates environment configuration and creates a SupabaseClient.
 * Throws a clean configuration error without exposing any secrets if variables are missing or invalid.
 */
export function getSupabaseClient(): SupabaseClient {
  if (!isSupabaseConfigured) {
    throw new Error(
      'Supabase Configuration Error: VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY must be configured in .env.local with a valid HTTP/HTTPS URL and anon key.'
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
