import { json } from "./_store.js";
import { supabaseAdmin } from "./_supabase.js";

function buildRewardThresholds(points) {
  const max = Math.floor((Number(points) || 0) / 50) * 50;
  const arr = [];
  for (let th = 50; th <= max; th += 50) arr.push(th);
  return arr;
}

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const userId = (url.searchParams.get("userId") || "").trim();
    if (!userId) return json(res, 400, { ok: false, error: "Missing userId" });

    const sb = supabaseAdmin();

    // 1) 残高 points（交換で減る）
    const { data: upRows, error: eUp } = await sb
      .from("user_points")
      .select("points")
      .eq("user_id", userId)
      .limit(1);

    if (eUp) return json(res, 500, { ok: false, error: eUp.message });

    const points = Number(upRows?.[0]?.points ?? 0);

    // 2) 交換済み thresholds（交換履歴）
    // ※ もしあなたのテーブル名が違う場合は、ここだけ置き換えてください：
    //   "reward_claims" -> あなたの交換履歴テーブル名
    const { data: claimRows, error: eClaim } = await sb
      .from("reward_claims")
      .select("threshold")
      .eq("user_id", userId);

    if (eClaim) return json(res, 500, { ok: false, error: eClaim.message });

    const claimedRewards = (claimRows || [])
      .map((r) => Number(r.threshold))
      .filter((n) => Number.isFinite(n))
      .sort((a, b) => a - b);

    // 3) 交換可能な threshold 一覧
    const rewardThresholds = buildRewardThresholds(points);

    // 4) 交換可能回数（到達済み - 交換済み）
    const claimedSet = new Set(claimedRewards);
    const redeemableCount = rewardThresholds.filter((th) => !claimedSet.has(th)).length;

    // 5) 次の景品まで
    const nextTh = (Math.floor(points / 50) + 1) * 50;
    const toNext = nextTh - points;

    // 6) 累計獲得ポイント（交換で減らない）＝point_awards の added_points 合計
    // ※ データが増えたら後でSQL関数/RPCで合計にしてもOK（まずは確実に動く形）
    const { data: awardRows, error: eAward } = await sb
      .from("point_awards")
      .select("added_points")
      .eq("user_id", userId);

    if (eAward) return json(res, 500, { ok: false, error: eAward.message });

    const lifetimePoints = (awardRows || []).reduce(
      (sum, r) => sum + Number(r.added_points || 0),
      0
    );

    return json(res, 200, {
      ok: true,
      points,
      redeemableCount,
      toNext,
      rewardThresholds,
      claimedRewards,
      lifetimePoints, // ★ランク判定用（交換しても減らない）
    });
  } catch (e) {
    return json(res, 500, { ok: false, error: String(e) });
  }
}

