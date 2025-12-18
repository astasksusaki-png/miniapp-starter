import { json } from "../_store.js";
import { supabaseAdmin } from "../_supabase.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return json(res, 405, { ok: false, error: "Method not allowed" });
    }

    const body =
      typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});

    const user_id = (body.user_id || "").trim();
    const last_name = (body.last_name || "").trim();
    const first_name = (body.first_name || "").trim();

    if (!user_id || !last_name || !first_name) {
      return json(res, 400, { ok: false, error: "Missing user_id/last_name/first_name" });
    }

    const sb = supabaseAdmin();

    // ★ upsert：既にあれば更新、なければ作成（返り値を single にしない）
    const { error } = await sb
      .from("user_profiles")
      .upsert(
        { user_id, last_name, first_name },
        { onConflict: "user_id" }
      );

    if (error) {
      return json(res, 500, { ok: false, error: error.message });
    }

    return json(res, 200, { ok: true });
  } catch (e) {
    return json(res, 500, { ok: false, error: String(e) });
  }
}
