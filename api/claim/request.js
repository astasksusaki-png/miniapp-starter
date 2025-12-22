import { readJson, json } from "../_store.js";

function makeRequestId() {
  // Node/Vercel ではだいたい crypto.randomUUID が使えます
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

    // 500円につき1pt
    const pt = Math.floor(amount / 500);

    // 0pt申請は後工程で必ず困るので、ここで止める（以前 points is 0 が出てた対策）
    if (pt <= 0) {
      return json(res, 400, { ok: false, error: "POINTS_WOULD_BE_ZERO" });
    }

    const requestId = makeRequestId();

    // approve.js は requestId を実際には使っていないので、
    // ここでは「申請の結果を返すだけ」でOK（確実に動く）
    return json(res, 200, {
      ok: true,
      requestId,
      amount: Math.trunc(amount),
      pt,
    });
  } catch (e) {
    return json(res, 500, { ok: false, error: e?.message || String(e) });
  }
}
