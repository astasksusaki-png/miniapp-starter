import { supabaseAdmin } from "../_supabase.js";
import { readJson, json, getDateKeyJST, parseApproveQr } from "../_store.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { ok: false, error: "Method Not Allowed" });

  try {
    const { userId, amount, approveQr } = await readJson(req);
    if (!userId) return json(res, 400, { ok: false, error: "userId is required" });

    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt < 0) return json(res, 400, { ok: false, error: "amount must be >= 0" });

    const parsed = parseApproveQr(approveQr);
    if (!parsed) return json(res, 400, { ok: false, error: "approveQr format invalid" });

   const sb = await supabaseAdmin();
    const awardDate = getDateKeyJST(); // YYYY-MM-DD (JST)

    const { data, error } = await sb.rpc("award_points", {
      p_user_id: userId,
      p_store_id: parsed.storeId,
      p_amount: Math.trunc(amt),
      p_award_date: awardDate
    });

    if (error) {
      if (String(error.message || "").includes("duplicate key")) {
        return json(res, 409, { ok: false, error: "ALREADY_AWARDED_TODAY", date: awardDate, storeId: parsed.storeId });
      }
      return json(res, 400, { ok: false, error: String(error.message || error) });
    }

    const row = Array.isArray(data) ? data[0] : data;
    const balance = row?.new_points ?? 0;
    const added = row?.added_points ?? 0;

    const redeemableCount = Math.floor(balance / 50);
    const nextThreshold = Math.ceil((balance + 1) / 50) * 50;
    const toNext = nextThreshold - balance;

    return json(res, 200, {
      ok: true,
      award: { storeId: parsed.storeId, pt: added, amount: amt },
      balance,
      redeemableCount,
      toNext
    });
  } catch (e) {
    return json(res, 500, { ok: false, error: e?.message || String(e) });
  }
}
