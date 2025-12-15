import { supabaseAdmin } from "../_supabase.js";
import { json } from "../_store.js";

export default async function handler(_req, res) {
  try {
    const hasUrl = !!process.env.SUPABASE_URL;
    const hasKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

    // 1) 接続（キー/URLが無いとここで落ちる）
    const sb = supabaseAdmin();

    // 2) テーブル一覧が読めるか（最低限 user_points を1件読む）
    const { data: up, error: e1 } = await sb
      .from("user_points")
      .select("user_id, points")
      .limit(1);

    // 3) RPCが存在するか（award_points を0円で呼んで「points is 0」エラーになるなら存在する）
    const { data: rpcData, error: rpcErr } = await sb.rpc("award_points", {
      p_user_id: "U_DEBUG",
      p_store_id: 1,
      p_amount: 0,
      p_award_date: "2025-12-15"
    });

    json(res, 200, {
      ok: true,
      env: { hasUrl, hasKey, urlPrefix: (process.env.SUPABASE_URL || "").slice(0, 30) },
      table_user_points: { ok: !e1, error: e1 ? e1.message : null, sample: up || null },
      rpc_award_points: {
        ok: !rpcErr,
        error: rpcErr ? { message: rpcErr.message, details: rpcErr.details, hint: rpcErr.hint, code: rpcErr.code } : null,
        data: rpcData || null
      }
    });
  } catch (e) {
    json(res, 500, { ok: false, error: e?.message || String(e) });
  }
}
