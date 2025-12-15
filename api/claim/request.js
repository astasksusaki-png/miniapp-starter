import { store, floorPoints, readJson, json } from "../_store.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { ok: false, error: "Method Not Allowed" });

  const { userId, amount } = await readJson(req);
  if (!userId) return json(res, 400, { ok: false, error: "userId is required" });

  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt < 0) return json(res, 400, { ok: false, error: "amount must be >= 0" });

  const pt = floorPoints(amt);
  const requestId = `req_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  store.ledger.push({
    type: "REQUEST",
    requestId,
    userId,
    amount: amt,
    pt,
    createdAt: new Date().toISOString(),
  });

  json(res, 200, { ok: true, requestId, amount: amt, pt });
}
