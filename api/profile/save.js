import { json } from "../_store.js";
import { supabaseAdmin } from "../_supabase.js";

function clean(s) {
  return (s || "").trim();
}

// 「漢字推奨」：完全に漢字縛りにすると実運用で詰むので、ここは“空欄禁止”だけにしておくのが安全
function isValidName(s) {
  const v = clean(s);
  return v.length >= 1 && v.length <= 30;
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return json(res, 405, { ok: false, error: "Method not allowed" });

    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const user_id = clean(body.user_id);
    const last_name = clean(body.last_name);
    const first_name = clean(body.first_name);

    if (!user_id) return json(res, 400, { ok: false, error: "Missing user_id" });
    if (!isValidName(last_name) || !isValidName(first_name)) {
      return json(res, 400, { ok: false, error: "Invalid name" });
    }

    const sb = supabaseAdmin();

    // 初回のみ（すでにあれば拒否）
    const { data: existing, error: e1 } = await sb
      .from("user_profiles")
      .select("user_id")
      .eq("user_id", user_id)
      .maybeSingle();

    if (e1) return json(res, 500, { ok: false, error: e1.message });
    if (existing) return json(res, 409, { ok: false, error: "Profile already exists" });

    const { error: e2 } = await sb
      .from("user_profiles")
      .insert({ user_id, last_name, first_name });

    if (e2) return json(res, 500, { ok: false, error: e2.message });

    return json(res, 200, { ok: true });
  } catch (e) {
    return json(res, 500, { ok: false, error: String(e) });
  }
}
