import { createClient } from "@supabase/supabase-js";

// ── Auth client (anon key — validates JWTs only, never reads data) ────────────
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

// ── DB client (service role — reads profiles table for authoritative role) ────
let _dbClient = null;
function getDbClient() {
  if (_dbClient) return _dbClient;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new Error("[auth] Missing SUPABASE_URL in Environment Variables");
  if (!key) throw new Error("[auth] Missing SUPABASE_SERVICE_ROLE_KEY in Environment Variables");
  _dbClient = createClient(url, key);
  return _dbClient;
}

/**
 * requireAuth — validates the Bearer JWT and resolves the user's role
 * from the authoritative `profiles` table, NOT from user_metadata.
 *
 * Security: user_metadata is client-controlled and must never be trusted
 * for access control decisions.
 */
export async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  // 1. Validate the JWT with Supabase Auth (anon key is correct here)
  const { data: { user }, error } = await getAuthClient().auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: "Unauthorized" });

  // 2. Resolve role from the server-controlled `profiles` table
  //    Never trust user_metadata.role — it is writable by the client.
  let role = "provider"; // safe default
  try {
    const { data: profile } = await getDbClient()
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role === "provider" || profile?.role === "client") {
      role = profile.role;
    }
  } catch {
    // If profiles lookup fails (e.g. new OAuth user not yet upserted),
    // fall back to "provider" rather than blocking the request.
    // The ensureProfile() in AuthContext will create the row on next render.
  }

  req.user = {
    id:    user.id,
    email: user.email,
    role,
  };
  next();
}
