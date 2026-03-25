import { createClient } from "@supabase/supabase-js";

let _authClient = null;
function getAuthClient() {
  if (_authClient) return _authClient;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url) throw new Error("[auth] Missing SUPABASE_URL in Environment Variables");
  if (!key) throw new Error("[auth] Missing SUPABASE_ANON_KEY in Environment Variables");
  _authClient = createClient(url, key);
  return _authClient;
}

export async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const { data: { user }, error } = await getAuthClient().auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: "Unauthorized" });

  req.user = {
    id:    user.id,
    email: user.email,
    role:  user.user_metadata?.role || "provider",
  };
  next();
}
