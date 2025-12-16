import { supabaseAdmin } from "../_supabase.js";
import { json } from "../_store.js";

export default async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const token = url.searchParams.get("token") || "";
  const adminToken = process.env.ADMIN_TOKEN || "";

  if (!adminToken || token !== adminToken) {
    return json(res, 401, { ok: false, error: "UNAUTHORIZED" });
  }

  const storeId = url.searchParams.get("storeId"); // "1".."5" or null
  const from = url.searchParams.get("from");       // "YYYY-MM-DD" or null
  const to = url.searchParams.get("to");           // "YYYY-MM-DD" or null
  const limit = Math.min(Number(url.searchParams.get("limit") || 200), 1000);

  const sb = supabaseAdmin();

  let q = sb
    .from("point_awards")
    .select("id,user_id,store_id,amount,added_points,awarded_at")
    .order("awarded_at", { ascending: false })
    .limit(limit);

  if (storeId) q = q.eq("store_id", Number(storeId));
  if (from) q = q.gte("awarded_at", `${from}T00:00:00+09:00`);
  if (to)   q = q.lt("awarded_at", `${to}T00:00:00+09:00`);

  const { data, error } = await q;
  if (error) return json(res, 500, { ok: false, error: error.message });

  const summary = {
    totalAwards: data.length,
    totalPoints: data.reduce((s, r) => s + (r.added_points || 0), 0),
    totalAmount: data.reduce((s, r) => s + (r.amount || 0), 0),
  };

  return json(res, 200, { ok: true, summary, rows: data });
}
