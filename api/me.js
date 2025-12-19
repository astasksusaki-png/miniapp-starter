import { json } from "./_store.js";
import { supabaseAdmin } from "./_supabase.js";

function buildRewardThresholds(points) {
  const max = Math.floor((Number(points) || 0) / 50) * 50;
  const arr = [];
  for (let th = 50; th <= max; th += 50) arr.push(th);
  return arr;
}

// 交換履歴テーブル名が環境で違っても動くように「候補を順番に試す」
async function getClaimedThresholds(sb, userId) {
  const candidates = [
    "reward_claims",
    "reward_redemptions",
    "reward_redeems",
    "reward_redemption",
    "redeems",
    "redemptions",
  ];

  // どの列名で保存しているかも環境で違うことがあるので候補を持つ
  const colCandidates = ["threshold", "reward_threshold", "claimed_threshold"];

  for (const table of candidates) {
    for (const col of colCandidates) {
      const { data, error } = await sb
        .from(table)
        .select(col)
        .eq("user_id", userId);

      if (!error) {
        const list = (data || [])
          .map((r) => Number(r[col]))
          .filter((n) => Number.isFinite(n))
          .sort((a, b) => a - b);
        return list;
      }

      // テーブル不存在などは次候補へ
      const msg = String(error?.message || "");
      if (
        msg.includes("Could not find the table") ||
        msg.includes("schema cache") ||
        msg.includes("does not exist") ||
        msg.includes("column") // 列が違う場合も次へ
      ) {
        continue;
      }

      // それ以外のエラーは返す（権限など）
      throw new Error(`[${table}.${col}] ${msg}`);
    }
  }

  // 見つからなければ「交換履歴なし」として返す（最低限動作）
  return [];
}

async function getLifetimePoints(sb, userId) {
  // できれば集計で（速い）
  const { data: agg, error: eAgg } = await sb
    .from("point_awards")
    .select("added_points.sum()")
    .eq("user_id", userId);

  if (!eAgg) {
    return Number(agg?.[0]?.sum ?? 0);
  }

  // 集計がうまくいかない場合はreduceで（確実）
  const { data: rows, error } = await sb
    .from("point_awards")
    .select("added_points")
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  return (rows || []).reduce((s, r) => s + Number(r.added_points || 0), 0);
}

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const userId = (url.searchParams.get("userId") || "").trim();
    if (!userId) return json(res, 400, { ok: false, error: "Missing userId" });

    const sb = supabaseAdmin();

    // 1) 残高 points（交換で増減）
    const { data: upRows, error: eUp } = await sb
      .from("user_points")
      .select("points")
      .eq("user_id", userId)
      .limit(1);

    if (eUp) return json(res, 500, { ok: false, error: eUp.message });

    const points = Number(upRows?.[0]?.points ?? 0);

    // 2) 交換済み thresholds（テーブル名不明でも候補探索）
    let claimedRewards = [];
    try {
      claimedRewards = await getClaimedThresholds(sb, userId);
    } catch (e) {
      // 交換履歴が取れなくても、他は動かす（ログ用に返す）
      claimedRewards = [];
    }

    // 3) 交換可能な threshold 一覧（到達分だけ）
    const rewardThresholds = buildRewardThresholds(points);

    // 4) 交換可能回数
    const claimedSet = new Set(claimedRewards);
    const redeemableCount = rewardThresholds.filter((th) => !claimedSet.has(th)).length;

    // 5) 次の景品まで
    const nextTh = (Math.floor(points / 50) + 1) * 50;
    const toNext = nextTh - points;

    // 6) 累計ポイント（交換で減らない）＝ランク判定用
    const lifetimePoints = await getLifetimePoints(sb, userId);

    return json(res, 200, {
      ok: true,
      points,
      redeemableCount,
      toNext,
      rewardThresholds,
      claimedRewards,
      lifetimePoints,
    });
  } catch (e) {
    return json(res, 500, { ok: false, error: String(e?.message || e) });
  }
}
