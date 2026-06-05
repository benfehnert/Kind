import { createClient } from "@supabase/supabase-js";

const OPTS = { auth: { autoRefreshToken: false, persistSession: false } };

export function makeAdminClient(env) {
  return createClient(
    env?.SUPABASE_URL ?? process.env.SUPABASE_URL,
    env?.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY,
    OPTS
  );
}

export function makeAnonClient(env) {
  return createClient(
    env?.SUPABASE_URL ?? process.env.SUPABASE_URL,
    env?.SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY,
    OPTS
  );
}
