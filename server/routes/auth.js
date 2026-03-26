import { Router } from "express";
import { createClient } from "@supabase/supabase-js";

const router = Router();

let _client = null;
function getClient() {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url) throw new Error("[auth/refresh] Missing SUPABASE_URL");
  if (!key) throw new Error("[auth/refresh] Missing SUPABASE_ANON_KEY");
  _client = createClient(url, key);
  return _client;
}

// POST /api/auth/refresh
// Body: { refresh_token: string }
// Returns: { access_token, refresh_token, expires_in, token_type }
router.post("/refresh", async (req, res) => {
  const { refresh_token } = req.body ?? {};
  if (!refresh_token) {
    return res.status(400).json({ error: "refresh_token is required" });
  }

  const { data, error } = await getClient().auth.refreshSession({ refresh_token });
  if (error || !data.session) {
    return res.status(401).json({ error: "Invalid or expired refresh token" });
  }

  const { access_token, refresh_token: new_refresh_token, expires_in, token_type } = data.session;
  return res.json({ access_token, refresh_token: new_refresh_token, expires_in, token_type });
});

export default router;
