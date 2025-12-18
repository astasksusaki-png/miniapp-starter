import { json } from "../_store.js";
import { supabaseAdmin } from "../_supabase.js";

function uniq(arr) {
  return Array.from(new Set(arr));
}

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    // ---- 既存の token 認証がある場合は、ここはあなたの実装に合わせてください ----
    const token = url.searchParams.get("token") || "";
    const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "";
    if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
      return json(res, 401, { ok: false, error: "UNAUTHORIZED" });
    }
    // --------------------------------------------------------------------

    const store = url.searchParams.get("store") || "ALL";
    const from = url.searchParams.get("from") || "";
    const to = url.searchParams.get("to") || "";
    const limit = Math.min(Number(url.searchParams.get("limit") || 200), 500);

    const sb = supabaseAdmin();

    // ① 付与履歴を取得
    let q = sb
      .from("point_awards")
      .select("id,user_id,store_id,amount,added_points,awarded_at")
      .order("awarded_at", { ascending: false })
      .limit(limit);

    if (store !== "ALL") q = q.eq("store_id", Number(store));
    if (from) q = q.gte("awarded_at", new Date(from).toISOString());
    if (to) q = q.lt("awarded_at", new Date(to).toISOString());

    const { data: awards, error: e1 } = await q;
    if (e1) return json(res, 500, { ok: false, error: e1.message });

    // ② user_id の氏名をまとめて取得（外部キー不要）
    const userIds = uniq((awards || []).map(r => r.user_id).filter(Boolean));
    let profileMap = {};

    if (userIds.length > 0) {
      const { data: profiles, error: e2 } = await sb
        .from("user_profiles")
        .select("user_id,last_name,first_name")
        .in("user_id", userIds);

      if (e2) return json(res, 500, { ok: false, error: e2.message });

      profileMap = Object.fromEntries(
        (profiles || []).map(p => [
          p.user_id,
          `${p.last_name || ""}${p.first_name ? " " + p.first_name : ""}`.trim()
        ])
      );
    }

    // ③ rows に name を付ける
    const rows = (awards || []).map(r => ({
      ...r,
      name: profileMap[r.user_id] || ""
    }));

    return json(res, 200, { ok: true, rows });
  } catch (e) {
    return json(res, 500, { ok: false, error: String(e) });
  }
}
