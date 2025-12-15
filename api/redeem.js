import { store, getUser, getClaimedSet, readJson, json } from "./_store.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { ok: false, error: "Method Not Allowed" });

  const { userId, threshold } = await readJson(req);
  if (!userId) return json(res, 400, { ok: false, error: "userId is required" });

  const th = Number(threshold);
  if (!Number.isInteger(th) || th <= 0 || th % 50 !== 0) {
    return json(res, 400, { ok: false, error: "threshold must be 50-multiple integer (e.g. 50, 100...)" });
  }

  const u = getUser(userId);
  if (u.points < th) {
    return json(res, 400, { ok: false, error: "NOT_ENOUGH_POINTS", points: u.points, threshold: th });
  }

  const claimed = getClaimedSet(userId);
  if (claimed.has(th)) {
    return json(res, 409, { ok: false, error: "ALREADY_REDEEMED", threshold: th });
  }

  claimed.add(th);

  store.ledger.push({
    type: "REDEEM",
    userId,
    threshold: th,
    createdAt: new Date().toISOString(),
    pointsAtRedeem: u.points,
  });

  json(res, 200, { ok: true, threshold: th, claimed: Array.from(claimed).sort((a,b)=>a-b) });
}
