import { createClient } from '@supabase/supabase-js';

const FALLBACK_SUPABASE_URL = 'https://agsiagabjcjikyaubkhx.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY = 'sb_publishable_poaZGf3QKbMeNbjopRQMJQ_x5sAQ_8e';

const supabaseUrl =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined)
  || (import.meta.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined)
  || FALLBACK_SUPABASE_URL;
const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)
  || (import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY as string | undefined)
  || FALLBACK_SUPABASE_ANON_KEY;

const requireEmailVerificationRaw = import.meta.env.VITE_REQUIRE_EMAIL_VERIFICATION as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Default to required in production, disabled in development unless explicitly overridden.
export const requiresEmailVerification = typeof requireEmailVerificationRaw === 'string'
  ? requireEmailVerificationRaw.toLowerCase() === 'true'
  : Boolean(import.meta.env.PROD);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string)
  : null;
