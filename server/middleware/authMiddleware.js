import { createClient } from "@supabase/supabase-js";

const authClient = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const { data: { user }, error } = await authClient.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: "Unauthorized" });

  req.user = {
    id:    user.id,
    email: user.email,
    role:  user.user_metadata?.role || "provider",
  };
  next();
}
