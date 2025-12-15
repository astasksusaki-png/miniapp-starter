import { getUser, getClaimedSet, json } from "./_store.js";

export default function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const userId = url.searchParams.get("userId");
  if (!userId) return json(res, 400, { ok: false, error: "userId is required" });

  const u = getUser(userId);
  const redeemableCount = Math.floor(u.points / 50);
  const nextThreshold = Math.ceil((u.points + 1) / 50) * 50;
  const toNext = nextThreshold - u.points;

  // 景品（50ptごと）を列挙：最大は現在ポイントまで
  const maxTh = Math.floor(u.points / 50) * 50;
  const thresholds = [];
  for (let th = 50; th <= maxTh; th += 50) thresholds.push(th);

  const claimed = Array.from(getClaimedSet(userId)).sort((a,b)=>a-b);

  json(res, 200, {
    ok: true,
    userId,
    points: u.points,
    redeemableCount,
    toNext,
    rewardThresholds: thresholds, // 例: [50,100,150]
    claimedRewards: claimed,      // 例: [50]
  });
}
