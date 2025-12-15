import { getUser, json } from "./_store.js";

export default function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const userId = url.searchParams.get("userId");
  if (!userId) return json(res, 400, { ok: false, error: "userId is required" });

  const u = getUser(userId);
  const redeemableCount = Math.floor(u.points / 50);
  const nextThreshold = Math.ceil((u.points + 1) / 50) * 50;
  const toNext = nextThreshold - u.points;

  json(res, 200, { ok: true, userId, points: u.points, redeemableCount, toNext });
}
