import { readJson, json } from "../_store.js";

function makeRequestId() {
  try {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  } catch {}
  return "REQ_" + Date.now() + "_" + Math.random().toString(16).slice(2);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return json(res, 405, { ok: false, error: "Method Not Allowed" });
  }

  try {
    const body = await readJson(req);
    const userId = (body?.userId || "").trim();
    const amount = Number(body?.amount);

    if (!userId) return json(res, 400, { ok: false, error: "Missing userId" });
    if (!Number.isFinite(amount) || amount <= 0) {
      return json(res, 400, { ok: false, error: "amount must be > 0" });
    }

    const pt = Math.floor(amount / 500);
    if (pt <= 0) return json(res, 400, { ok: false, error: "POINTS_WOULD_BE_ZERO" });

    return json(res, 200, {
      ok: true,
      requestId: makeRequestId(),
      amount: Math.trunc(amount),
      pt,
    });
  } catch (e) {
    return json(res, 500, { ok: false, error: e?.message || String(e) });
  }
}
