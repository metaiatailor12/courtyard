const { createClient } = require('@supabase/supabase-js');
const { env } = require('./config');

function assertSupabaseConfigured() {
  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
    throw new Error('Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }
}

function createSupabaseAdminClient() {
  assertSupabaseConfigured();

  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function createSupabaseAnonClient() {
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    throw new Error('Supabase anon client is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.');
  }

  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

module.exports = {
  createSupabaseAdminClient,
  createSupabaseAnonClient,
};
