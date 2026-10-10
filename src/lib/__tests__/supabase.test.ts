import { describe, it, expect } from 'vitest';
import { isSupabaseConfigured, getSupabaseClient, supabase } from '../supabase';

describe('Supabase Client Module Isolation', () => {
  it('checks configuration status based on environment variables', () => {
    expect(typeof isSupabaseConfigured).toBe('boolean');
  });

  it('provides getSupabaseClient function that throws configuration error when unconfigured', () => {
    if (!isSupabaseConfigured) {
      expect(() => getSupabaseClient()).toThrow(
        /Supabase Configuration Error/
      );
      expect(supabase).toBeNull();
    } else {
      const client = getSupabaseClient();
      expect(client).toBeDefined();
      expect(supabase).not.toBeNull();
    }
  });

  it('never prints or exposes secret keys in error messages', () => {
    try {
      if (!isSupabaseConfigured) {
        getSupabaseClient();
      }
    } catch (err: any) {
      expect(err.message).not.toContain('secret');
      expect(err.message).not.toContain('password');
    }
  });
});
