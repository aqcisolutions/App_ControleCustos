import { createClient, SupabaseClient } from '@supabase/supabase-js';

const rawUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
let sanitizedUrl = '';
try {
  if (rawUrl && rawUrl !== 'MY_SUPABASE_URL') {
    sanitizedUrl = new URL(rawUrl).origin;
  }
} catch {
  sanitizedUrl = rawUrl;
}

const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    sanitizedUrl &&
    sanitizedUrl !== '' &&
    sanitizedUrl !== 'MY_SUPABASE_URL' &&
    supabaseAnonKey &&
    supabaseAnonKey !== '' &&
    supabaseAnonKey !== 'MY_SUPABASE_ANON_KEY'
  );
};

export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(sanitizedUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

