import { json } from "./_store.js";
import { supabaseAdmin } from "./_supabase.js";

// ★景品表示は「累計(lifetimePoints)」で作る
function buildRewardThresholdsByLifetime(lifetimePoints) {
  const p = Number(lifetimePoints) || 0;
  const max = Math.floor(p / 50) * 50;
  const arr = [];
  for (let th = 50; th <= max; th += 50) arr.push(th);
  return arr;
}

function calcRank(total) {
  const t = Number(total) || 0;
  if (t >= 201) return "ダイヤモンド";
  if (t >= 151) return "プラチナ";
  if (t >= 101) return "ゴールド";
  if (t >= 51)  return "シルバー";
  return "レギュラー";
}

// 交換履歴（あなたの環境は rewards_claimed）
async function getClaimedThresholds(sb, userId) {
  const tableCandidates = [
    "rewards_claimed",
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
      if (
        msg.includes("Could not find the table") ||
        msg.includes("schema cache") ||
        msg.includes("does not exist") ||
        msg.includes("column")
      ) continue;

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

    // 1) 現在ポイント（表示用：減らさない運用なら基本増えるだけ）
    const { data: upRows, error: eUp } = await sb
      .from("user_points")
      .select("points")
      .eq("user_id", userId)
      .limit(1);

    if (eUp) return json(res, 500, { ok: false, error: eUp.message });
    const points = Number(upRows?.[0]?.points ?? 0);

    // 2) 累計（ランク・景品判定用）
    const lifetimePoints = await getLifetimePoints(sb, userId);

    // 3) ランク（累計で判定）
    const rank = calcRank(lifetimePoints);

    // 4) 交換済み
    let claimedRewards = [];
    try {
      claimedRewards = await getClaimedThresholds(sb, userId);
    } catch {
      claimedRewards = [];
    }

    // ★5) 景品到達は「累計」で作る
    const rewardThresholds = buildRewardThresholdsByLifetime(lifetimePoints);

    // 6) 交換可能回数
    const claimedSet = new Set(claimedRewards);
    const redeemableCount = rewardThresholds.filter((th) => !claimedSet.has(th)).length;

    // 7) 次の景品まで（累計で計算）
    const mod = lifetimePoints % 50;
    const toNext = mod === 0 ? 0 : 50 - mod;

    return json(res, 200, {
      ok: true,
      userId,
      points,          // 表示用
      lifetimePoints,  // 景品/ランク判定用
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
