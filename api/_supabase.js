import supabasePkg from "@supabase/supabase-js";

export function supabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");

  // v1: createClient は default から取れることが多い
  const createClient = supabasePkg.createClient || supabasePkg.default?.createClient;
  if (!createClient) throw new Error("createClient not found");

  return createClient(url, key);
}
