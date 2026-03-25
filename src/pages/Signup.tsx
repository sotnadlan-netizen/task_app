import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mic, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabaseClient";
import { apiFetch } from "@/lib/apiClient";
import { toast } from "sonner";

export default function Signup() {
  const navigate = useNavigate();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole]         = useState<"provider" | "client">("provider");
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { role } },
      });
      if (error) throw error;

      // Create profile record on the server
      await apiFetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      toast.success("Account created!");
      navigate(role === "client" ? "/client/dashboard" : "/provider/dashboard", { replace: true });
    } catch (err: unknown) {
      toast.error("Signup failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 shadow-lg">
            <Mic className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-lg font-bold text-slate-900 leading-none">Advisor AI</p>
            <p className="text-xs text-slate-500">Mortgage Platform</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-bold text-slate-900 mb-1">Create account</h1>
          <p className="text-sm text-slate-500 mb-6">Sign up to get started</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 mb-1 block">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 mb-2 block">Role</label>
              <div className="grid grid-cols-2 gap-2">
                {(["provider", "client"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`rounded-lg border-2 px-3 py-2.5 text-sm font-medium transition-all ${
                      role === r
                        ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                        : "border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {r === "provider" ? "יועץ / ספק" : "לקוח"}
                  </button>
                ))}
              </div>
            </div>
            <Button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700"
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account"}
            </Button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-4">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-indigo-600 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
