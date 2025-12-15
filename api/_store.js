// ※ 開発用メモリ保存（Vercelは再起動/スケールでリセットされるので本番はDBに置き換え）
export const store = globalThis.__miniapp_store__ || {
  users: new Map(),          // userId -> { points }
  dailyAward: new Set(),     // `${dateJST}|${storeId}|${userId}`
  ledger: [],                // ログ
};
globalThis.__miniapp_store__ = store;

export function getDateKeyJST(d = new Date()) {
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const y = jst.getUTCFullYear();
  const m = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const day = String(jst.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function floorPoints(amountYen) {
  return Math.floor(amountYen / 500);
}

export function getUser(userId) {
  if (!store.users.has(userId)) store.users.set(userId, { points: 0 });
  return store.users.get(userId);
}

// 承認QR: APPROVE:v1:STORE=1:TYPE=STATIC
export function parseApproveQr(qrText) {
  if (typeof qrText !== "string") return null;
  const parts = qrText.split(":");
  if (parts.length < 4) return null;
  if (parts[0] !== "APPROVE") return null;
  if (parts[1] !== "v1") return null;

  const kv = {};
  for (let i = 2; i < parts.length; i++) {
    const [k, v] = parts[i].split("=");
    if (!k || v == null) continue;
    kv[k] = v;
  }

  const storeId = Number(kv.STORE);
  const type = kv.TYPE;

  if (!Number.isInteger(storeId) || storeId < 1 || storeId > 5) return null;
  if (!type) return null;

  return { version: "v1", storeId, type };
}

export async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf-8");
  return raw ? JSON.parse(raw) : {};
}

export function json(res, code, body) {
  res.statusCode = code;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}
