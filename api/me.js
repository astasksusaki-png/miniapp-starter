import { supabaseAdmin } from "./_supabase.js";
import { json } from "./_store.js";

export default async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const userId = url.searchParams.get("userId");
  if (!userId) return json(res, 400, { ok: false, error: "userId is required" });

  const sb = supabaseAdmin();

  const { data: up, error: e1 } = await sb
    .from("user_points")
    .select("points")
    .eq("user_id", userId)
    .maybeSingle();

  if (e1) return json(res, 500, { ok: false, error: e1.message });

  const points = up?.points ?? 0;

  const { data: claimedRows, error: e2 } = await sb
    .from("rewards_claimed")
    .select("threshold")
    .eq("user_id", userId);

  if (e2) return json(res, 500, { ok: false, error: e2.message });

  const claimedRewards = (claimedRows || []).map(r => r.threshold).sort((a,b)=>a-b);

  const redeemableCount = Math.floor(points / 50);
  const nextThreshold = Math.ceil((points + 1) / 50) * 50;
  const toNext = nextThreshold - points;

  const maxTh = Math.floor(points / 50) * 50;
  const rewardThresholds = [];
  for (let th = 50; th <= maxTh; th += 50) rewardThresholds.push(th);

  return json(res, 200, {
    ok: true,
    userId,
    points,
    redeemableCount,
    toNext,
    rewardThresholds,
    claimedRewards
  });
}
