import { json } from "./_store.js";
import { supabaseAdmin } from "./_supabase.js";

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const userId = (url.searchParams.get("userId") || "").trim();
    if (!userId) return json(res, 400, { ok: false, error: "Missing userId" });

    // env確認
    const hasUrl = !!process.env.SUPABASE_URL;
    const hasKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

    const sb = supabaseAdmin();

    // まず user_points が読めるか
    const { data: upRows, error: eUp } = await sb
      .from("user_points")
      .select("points")
      .eq("user_id", userId)
      .limit(1);

    if (eUp) {
      return json(res, 500, {
        ok: false,
        where: "user_points",
        env: { hasUrl, hasKey },
        error: eUp.message,
      });
    }

    // 次に point_awards が読めるか
    const { data: awardRows, error: eAward } = await sb
      .from("point_awards")
      .select("added_points")
      .eq("user_id", userId);

    if (eAward) {
      return json(res, 500, {
        ok: false,
        where: "point_awards",
        env: { hasUrl, hasKey },
        error: eAward.message,
      });
    }

    const points = Number(upRows?.[0]?.points ?? 0);
    const lifetimePoints = (awardRows || []).reduce(
      (sum, r) => sum + Number(r.added_points || 0),
      0
    );

    return json(res, 200, {
      ok: true,
      env: { hasUrl, hasKey },
      points,
      lifetimePoints,
      rowsCount: awardRows?.length || 0,
    });
  } catch (e) {
    return json(res, 500, {
      ok: false,
      where: "catch",
      error: String(e?.stack || e?.message || e),
    });
  }
}
