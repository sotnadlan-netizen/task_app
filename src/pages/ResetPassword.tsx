import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mic, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  const [loading, setLoading]     = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated — please sign in again.");
      await supabase.auth.signOut();
      navigate("/login", { replace: true });
    } catch (err: unknown) {
      toast.error("Failed to update password", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8">
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

        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
          <h1 className="text-xl font-bold text-slate-900 mb-1">Set new password</h1>
          <p className="text-sm text-slate-500 mb-6">Choose a strong password for your account.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="reset-password" className="text-xs font-medium text-slate-700 mb-1 block">New password</label>
              <Input
                id="reset-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                required
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="reset-confirm" className="text-xs font-medium text-slate-700 mb-1 block">Confirm password</label>
              <Input
                id="reset-confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat password"
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700"
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update password"}
            </Button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-4">
            <Link to="/login" className="inline-flex items-center gap-1 font-medium text-indigo-600 hover:underline">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
