import { json } from "../_store.js";
import { supabaseAdmin } from "../_supabase.js";

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const userId = url.searchParams.get("userId") || "";
    if (!userId) return json(res, 400, { ok: false, error: "Missing userId" });

    const sb = supabaseAdmin();

    // ★maybeSingle を使わず、配列で受けて 1件目だけ取り出す（最強に安定）
    const { data, error } = await sb
      .from("user_profiles")
      .select("user_id,last_name,first_name,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) return json(res, 500, { ok: false, error: error.message });

    const profile = Array.isArray(data) && data.length > 0 ? data[0] : null;
    return json(res, 200, { ok: true, profile });
  } catch (e) {
    return json(res, 500, { ok: false, error: String(e) });
  }
}
