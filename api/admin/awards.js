import { json } from "../_store.js";
import { supabaseAdmin } from "../_supabase.js";

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get("token") || "";
    const adminToken = process.env.ADMIN_TOKEN || "";

    if (!adminToken || token !== adminToken) {
      return json(res, 401, { ok: false, error: "UNAUTHORIZED" });
    }

    const sb = supabaseAdmin();

    const { data, error } = await sb
      .from("point_awards")
      .select("id,user_id,store_id,amount,added_points,awarded_at")
      .order("awarded_at", { ascending: false })
      .limit(200);

    if (error) {
      return json(res, 500, { ok: false, error: error.message });
    }

    return json(res, 200, { ok: true, rows: data });
  } catch (e) {
    return json(res, 500, { ok: false, error: String(e) });
  }
}
