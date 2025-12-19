import { supabaseAdmin } from "./_supabase.js";
import { readJson, json } from "./_store.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { ok: false, error: "Method Not Allowed" });

  try {
    const { userId, threshold } = await readJson(req);
    if (!userId) return json(res, 400, { ok: false, error: "userId is required" });

    const th = Math.trunc(Number(threshold));
    if (!Number.isFinite(th) || th <= 0) return json(res, 400, { ok: false, error: "threshold must be > 0" });

    const sb = supabaseAdmin();

    const { data, error } = await sb.rpc("redeem_reward", {
      p_user_id: userId,
      p_threshold: th
    });

    if (error) {
      const msg = String(error.message || "");
      if (msg.includes("ALREADY_REDEEMED") || msg.includes("duplicate key")) {
        return json(res, 409, { ok: false, error: "ALREADY_REDEEMED", threshold: th });
      }
      if (msg.includes("NOT_ENOUGH_POINTS")) {
        return json(res, 400, { ok: false, error: "NOT_ENOUGH_POINTS" });
      }
      return json(res, 400, { ok: false, error: msg });
    }

    return json(res, 200, { ok: true, threshold: th, spent: data?.spent ?? th });
  } catch (e) {
    return json(res, 500, { ok: false, error: e?.message || String(e) });
  }
}
