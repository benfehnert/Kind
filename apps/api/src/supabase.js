import { createClient } from "@supabase/supabase-js";

const OPTS = { auth: { autoRefreshToken: false, persistSession: false } };
const OAUTH_STORAGE_KEY = "kind-oauth";

export function createOAuthStorage() {
  const store = new Map();
  return {
    getItem: async (key) => store.get(key) ?? null,
    setItem: async (key, value) => {
      store.set(key, value);
    },
    removeItem: async (key) => {
      store.delete(key);
    },
    isServer: true
  };
}

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

export function makeOAuthClient(env, storage) {
  return createClient(
    env?.SUPABASE_URL ?? process.env.SUPABASE_URL,
    env?.SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        flowType: "pkce",
        storage,
        storageKey: OAUTH_STORAGE_KEY
      }
    }
  );
}

export async function readOAuthCodeVerifier(storage) {
  const item = await storage.getItem(`${OAUTH_STORAGE_KEY}-code-verifier`);
  if (!item) return null;
  return item.split("/")[0] || null;
}

export async function seedOAuthCodeVerifier(storage, codeVerifier) {
  await storage.setItem(`${OAUTH_STORAGE_KEY}-code-verifier`, `${codeVerifier}/`);
}
