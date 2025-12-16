let _client = null;

export async function supabaseAdmin() {
  if (_client) return _client;

  // ★ ここが重要：ESM入口ではなく CJS入口（dist/main）を読む
  const mod = await import("@supabase/supabase-js/dist/main/index.js");
  const createClient = mod.createClient || mod.default?.createClient;

  if (!createClient) {
    throw new Error("createClient not found");
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  _client = createClient(url, key);
  return _client;
}
