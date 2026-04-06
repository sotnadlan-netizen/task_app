import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/core/state/AuthContext";

/**
 * Landing page for the Supabase OAuth redirect.
 * The Supabase SDK automatically exchanges the code/hash in the URL for a
 * session and fires onAuthStateChange, which updates AuthContext.
 * This component simply waits for `loading` to settle and then routes the
 * user to the correct dashboard.
 */
export default function AuthCallback() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (user) {
      navigate(role === "client" ? "/client/dashboard" : "/provider/dashboard", { replace: true });
    } else {
      // Exchange failed or was cancelled
      navigate("/login", { replace: true });
    }
  }, [user, role, loading, navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50">
      <Loader2 className="h-7 w-7 animate-spin text-indigo-500" />
      <p className="text-sm text-slate-500">Signing you in…</p>
    </div>
  );
}
