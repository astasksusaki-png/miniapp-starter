import { store, getDateKeyJST, floorPoints, getUser, parseApproveQr, readJson, json } from "../_store.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { ok: false, error: "Method Not Allowed" });

  const { userId, amount, approveQr, requestId } = await readJson(req);
  if (!userId) return json(res, 400, { ok: false, error: "userId is required" });

  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt < 0) return json(res, 400, { ok: false, error: "amount must be >= 0" });

  const parsed = parseApproveQr(approveQr);
  if (!parsed) return json(res, 400, { ok: false, error: "approveQr format invalid" });

  const dateKey = getDateKeyJST();
  const dailyKey = `${dateKey}|${parsed.storeId}|${userId}`;

  // 同一店舗1日1回
  if (store.dailyAward.has(dailyKey)) {
    return json(res, 409, { ok: false, error: "ALREADY_AWARDED_TODAY", date: dateKey, storeId: parsed.storeId });
  }

  const pt = floorPoints(amt);
  if (pt <= 0) return json(res, 400, { ok: false, error: "points is 0 (amount < 500)" });

  store.dailyAward.add(dailyKey);
  const u = getUser(userId);
  u.points += pt;

  const entry = {
    type: "AWARD",
    requestId: requestId || null,
    userId,
    storeId: parsed.storeId,
    approveType: parsed.type,
    amount: amt,
    pt,
    date: dateKey,
    createdAt: new Date().toISOString(),
    balanceAfter: u.points,
  };
  store.ledger.push(entry);

  const redeemableCount = Math.floor(u.points / 50);
  const nextThreshold = Math.ceil((u.points + 1) / 50) * 50;
  const toNext = nextThreshold - u.points;

  json(res, 200, { ok: true, award: entry, balance: u.points, redeemableCount, toNext });
}
