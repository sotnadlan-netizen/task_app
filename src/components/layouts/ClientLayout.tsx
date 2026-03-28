import { Mic, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

interface ClientLayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function ClientLayout({ title, subtitle, children }: ClientLayoutProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email;
  const avatarUrl   = user?.user_metadata?.avatar_url;

  async function handleSignOut() {
    await signOut();
    navigate("/login", { replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-slate-200 bg-white/90 backdrop-blur-sm px-6">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mr-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600">
            <Mic className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-sm font-bold text-slate-900">Advisor AI</span>
        </div>

        {/* Page title */}
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-slate-900 leading-none truncate hidden sm:block">{title}</h1>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">{subtitle}</p>}
        </div>

        {/* User + Sign Out */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="avatar"
                className="h-7 w-7 rounded-full object-cover ring-2 ring-slate-200"
              />
            ) : (
              <div className="h-7 w-7 rounded-full bg-indigo-100 flex items-center justify-center">
                <span className="text-xs font-bold text-indigo-600">
                  {displayName?.[0]?.toUpperCase() ?? "C"}
                </span>
              </div>
            )}
            <span className="text-xs font-medium text-slate-700 max-w-[140px] truncate">
              {displayName}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="gap-1.5 text-slate-500 hover:text-slate-800 h-8 text-xs sm:text-sm"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      </header>

      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
