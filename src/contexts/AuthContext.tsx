import { createContext, useContext, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

interface AuthContextValue {
  user: User | null;
  role: "provider" | "client" | null;
  loading: boolean;
  /** Google OAuth provider_token — present only after a Google sign-in, never stored in localStorage */
  providerToken: string | null;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  role: null,
  loading: true,
  providerToken: null,
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
  const [user, setUser]               = useState<User | null>(null);
  const [role, setRole]               = useState<"provider" | "client" | null>(null);
  const [loading, setLoading]         = useState(true);
  // provider_token is kept in memory only — never written to localStorage for security
  const [providerToken, setProviderToken] = useState<string | null>(null);

  useEffect(() => {
    // Initial session (handles page refresh and OAuth code exchange)
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      setRole(resolveRole(u));
      // provider_token is available immediately after OAuth login
      setProviderToken(session?.provider_token ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      setRole(resolveRole(u));
      setProviderToken(session?.provider_token ?? null);
      setLoading(false);

      // First-time OAuth login: ensure profiles row exists
      if (event === "SIGNED_IN" && u?.app_metadata?.provider !== "email") {
        ensureProfile(u).catch(() => {});
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signOut() {
    // Clear all persisted state before signing out to prevent cross-tenant leaks
    localStorage.clear();
    sessionStorage.clear();
    await supabase.auth.signOut();
    // Hard reload obliterates React state, React Query cache, and all in-memory data
    window.location.href = "/login";
  }

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        // Request calendar.events scope so provider_token can create Google Calendar events
        scopes: "https://www.googleapis.com/auth/calendar.events",
      },
    });
  }

  return (
    <AuthContext.Provider value={{ user, role, loading, providerToken, signOut, signInWithGoogle }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
