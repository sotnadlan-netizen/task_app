import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Bot, Mic, ChevronRight, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/provider/dashboard", icon: LayoutDashboard, label: "Dashboard", sub: "Session history" },
  { to: "/provider/config", icon: Bot, label: "Agent Config", sub: "System prompt" },
];

function Sidebar() {
  const { pathname } = useLocation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate("/login");
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-60 flex-col bg-slate-900 border-r border-slate-800">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-5 border-b border-slate-800">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 shadow-lg shadow-indigo-900/50">
          <Mic className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-white leading-none">Advisor AI</p>
          <p className="text-[10px] text-slate-500 leading-none mt-0.5">Mortgage Platform</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
          Navigation
        </p>
        {NAV.map(({ to, icon: Icon, label, sub }) => {
          const active =
            pathname === to || (to === "/provider/dashboard" && pathname.startsWith("/provider/board"));
          return (
            <NavLink
              key={to}
              to={to}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all",
                active
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/40"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-none">{label}</p>
                <p
                  className={cn(
                    "text-[11px] mt-0.5 leading-none",
                    active ? "text-indigo-200" : "text-slate-600"
                  )}
                >
                  {sub}
                </p>
              </div>
              {active && <ChevronRight className="h-3.5 w-3.5 text-indigo-300" />}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-slate-800 space-y-2">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-full bg-indigo-600/20 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-indigo-400">
              {user?.email?.[0]?.toUpperCase() ?? "A"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-300 leading-none truncate">
              {user?.email ?? "Advisor"}
            </p>
            <p className="text-[10px] text-slate-600 mt-0.5">Provider</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="w-full justify-start gap-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 h-8 px-2"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
}

function Navbar({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-slate-200 bg-white/90 backdrop-blur-sm px-8">
      <div>
        <h1 className="text-base font-bold text-slate-900 leading-none">{title}</h1>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
    </header>
  );
}

interface LayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function Layout({ title, subtitle, children }: LayoutProps) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex flex-1 flex-col pl-60">
        <Navbar title={title} subtitle={subtitle} />
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
