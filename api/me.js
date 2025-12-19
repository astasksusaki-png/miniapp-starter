import { json } from "./_store.js";
import { supabaseAdmin } from "./_supabase.js";

function buildRewardThresholds(points) {
  const p = Number(points) || 0;
  const max = Math.floor(p / 50) * 50; // 到達済みの最大 50刻み
  const arr = [];
  for (let th = 50; th <= max; th += 50) arr.push(th);
  return arr;
}

function calcRank(total) {
  const t = Number(total) || 0;
   if (total >= 201) return "ダイヤモンド";
  if (total >= 151) return "プラチナ";
  if (total >= 101) return "ゴールド";
  if (total >= 51)  return "シルバー";
  return "レギュラー";
}

// 交換履歴（reward_claims が無い/列名違いでも落ちないように）
async function getClaimedThresholds(sb, userId) {
  const tableCandidates = [
    "rewards_claimed"
    "reward_claims",      
    "reward_redemptions",
    "reward_redeems",
    "redeems",
    "redemptions",
  ];
  const colCandidates = ["threshold", "reward_threshold", "claimed_threshold"];

  for (const table of tableCandidates) {
    for (const col of colCandidates) {
      const { data, error } = await sb
        .from(table)
        .select(col)
        .eq("user_id", userId);

      if (!error) {
        return (data || [])
          .map((r) => Number(r[col]))
          .filter((n) => Number.isFinite(n))
          .sort((a, b) => a - b);
      }

      const msg = String(error?.message || "");
      // テーブル/列が無い系は次候補へ
      if (
        msg.includes("Could not find the table") ||
        msg.includes("schema cache") ||
        msg.includes("does not exist") ||
        msg.includes("column")
      ) {
        continue;
      }

      // それ以外は返す（権限など）
      throw new Error(`[${table}.${col}] ${msg}`);
    }
  }
  return [];
}

async function getLifetimePoints(sb, userId) {
  const { data, error } = await sb
    .from("point_awards")
    .select("added_points")
    .eq("user_id", userId);

  if (error) throw new Error(error.message);

  return (data || []).reduce((sum, r) => sum + Number(r.added_points || 0), 0);
}

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const userId = (url.searchParams.get("userId") || "").trim();
    if (!userId) return json(res, 400, { ok: false, error: "Missing userId" });

    const sb = supabaseAdmin();

    // 1) 残高（交換で増減）
    const { data: upRows, error: eUp } = await sb
      .from("user_points")
      .select("points")
      .eq("user_id", userId)
      .limit(1);

    if (eUp) return json(res, 500, { ok: false, error: eUp.message });

    const points = Number(upRows?.[0]?.points ?? 0);

    // 2) 累計（交換で減らない：point_awards 合計）
    const lifetimePoints = await getLifetimePoints(sb, userId);
// redemptionでpointsが減っても、累計が残高より小さくなるのはおかしいので補正
const lifetimeFixed = Math.max(lifetimePoints, points);

    // 3) ランク（累計で判定）
const rank = calcRank(lifetimeFixed);
    
    // 4) 交換済み（存在しないテーブルでも落とさない）
    let claimedRewards = [];
    try {
      claimedRewards = await getClaimedThresholds(sb, userId);
    } catch {
      claimedRewards = [];
    }

    // 5) 到達済みの景品しきい値一覧（50刻み）
    const rewardThresholds = buildRewardThresholds(points);

    // 6) 交換可能回数（到達していて未交換の数）
    const claimedSet = new Set(claimedRewards);
    const redeemableCount = rewardThresholds.filter((th) => !claimedSet.has(th)).length;

    // 7) 次の景品まで（0〜49）
    const mod = points % 50;
    const toNext = mod === 0 ? 0 : 50 - mod;

    return json(res, 200, {
      ok: true,
      userId,
      points,
      lifetimePoints,
     lifetimeFixed,
      rank,
      rewardThresholds,
      claimedRewards,
      redeemableCount,
      toNext,
    });
  } catch (e) {
    return json(res, 500, { ok: false, error: e?.message || String(e) });
  }
}
