import { createContext, useContext, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

interface AuthContextValue {
  user: User | null;
  role: "provider" | "client" | null;
  loading: boolean;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  role: null,
  loading: true,
  signOut: async () => {},
  signInWithGoogle: async () => {},
});

/** Resolve role from user_metadata, falling back to "provider" for OAuth users. */
function resolveRole(user: User | null): "provider" | "client" | null {
  if (!user) return null;
  const r = user.user_metadata?.role;
  if (r === "provider" || r === "client") return r;
  // Google OAuth users have no role metadata → default to provider
  return "provider";
}

/** Upsert a profiles row for OAuth users who skip the normal signup form. */
async function ensureProfile(user: User) {
  const role = resolveRole(user);
  await supabase.from("profiles").upsert(
    { id: user.id, email: user.email, role },
    { onConflict: "id", ignoreDuplicates: true },
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<"provider" | "client" | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial session (handles page refresh and OAuth code exchange)
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      setRole(resolveRole(u));
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      setRole(resolveRole(u));
      setLoading(false);

      // First-time OAuth login: ensure profiles row exists
      if (event === "SIGNED_IN" && u?.app_metadata?.provider !== "email") {
        ensureProfile(u).catch(() => {});
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <AuthContext.Provider value={{ user, role, loading, signOut, signInWithGoogle }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
