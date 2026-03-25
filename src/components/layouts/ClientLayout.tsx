import { Mic, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

interface ClientLayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function ClientLayout({ title, subtitle, children }: ClientLayoutProps) {
  const { user, signOut } = useAuth();

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
        <div className="flex-1">
          <h1 className="text-base font-bold text-slate-900 leading-none">{title}</h1>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>

        {/* User + Sign Out */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 hidden sm:block">{user?.email}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="gap-1.5 text-slate-500 hover:text-slate-800 h-8"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
