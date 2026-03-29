import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Bot, Mic, ChevronRight, LogOut, BarChart2, Menu, Sun, Moon, Users, ListTodo } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const NAV = [
  { to: "/provider/dashboard", icon: LayoutDashboard, label: "דף הבית", sub: "סקירה כללית" },
  { to: "/provider/clients",   icon: Users,           label: "לקוחות",   sub: "ניהול לקוחות" },
  { to: "/provider/tasks",     icon: ListTodo,        label: "משימות פתוחות", sub: "מרכז משימות" },
  { to: "/provider/analytics", icon: BarChart2,       label: "ניתוחים",  sub: "מדדי השלמה" },
  { to: "/provider/config",    icon: Bot,             label: "הגדרות AI", sub: "פרומפט מערכת" },
];

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { pathname } = useLocation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function handleConfirmedSignOut() {
    await signOut();
    navigate("/login");
  }

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 z-50 flex w-60 flex-col glass-sidebar",
          "ltr:left-0 rtl:right-0 rtl:left-auto",
          "border-r rtl:border-l-0 rtl:border-r border-slate-800 dark:border-slate-700",
          "transform transition-transform duration-200 ease-in-out md:translate-x-0",
          open ? "translate-x-0" : "ltr:-translate-x-full rtl:translate-x-full"
        )}
      >
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
                onClick={onClose}
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
                {active && <ChevronRight className="h-3.5 w-3.5 text-indigo-300 rtl:rotate-180" />}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-slate-800 space-y-2">
          <div className="flex items-center gap-2.5">
            {user?.user_metadata?.avatar_url ? (
              <img
                src={user.user_metadata.avatar_url}
                alt={`${user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || "User"} avatar`}
                className="h-7 w-7 rounded-full object-cover ring-2 ring-indigo-500/30 shrink-0"
              />
            ) : (
              <div className="h-7 w-7 rounded-full bg-indigo-600/20 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-indigo-400">
                  {user?.email?.[0]?.toUpperCase() ?? "A"}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-300 leading-none truncate">
                {user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || "Advisor"}
              </p>
              <p className="text-[10px] text-slate-600 mt-0.5">Provider</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirmOpen(true)}
            className="w-full justify-start gap-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 h-8 px-2"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </Button>
          <div className="flex items-center gap-1 pt-1">
            <button
              onClick={() => {
                const isDark = document.documentElement.classList.toggle('dark');
                localStorage.setItem('theme', isDark ? 'dark' : 'light');
              }}
              className="p-2 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors"
              aria-label="Toggle dark mode"
            >
              {/* Rendered at runtime based on current class — show Sun in dark, Moon in light */}
              <Sun className="h-3.5 w-3.5 hidden dark:block" />
              <Moon className="h-3.5 w-3.5 block dark:hidden" />
            </button>
            <button
              onClick={() => {
                const isRTL = document.documentElement.dir === 'rtl';
                document.documentElement.dir = isRTL ? 'ltr' : 'rtl';
                document.documentElement.lang = isRTL ? 'en' : 'he';
                localStorage.setItem('dir', isRTL ? 'ltr' : 'rtl');
              }}
              className="p-2 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors text-xs font-medium"
              aria-label="Toggle RTL/LTR"
            >
              <span className="ltr:hidden">EN</span>
              <span className="rtl:hidden">עב</span>
            </button>
          </div>
        </div>
      </aside>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out?</AlertDialogTitle>
            <AlertDialogDescription>
              You'll be redirected to the login page. Any unsaved changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmedSignOut}
              className="bg-red-600 hover:bg-red-700"
            >
              Sign Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Navbar({ title, subtitle, onMenuClick }: { title: string; subtitle?: string; onMenuClick: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-slate-200 bg-white/90 backdrop-blur-sm px-4 md:px-8 dark:border-slate-700 dark:bg-slate-900/90">
      <button
        onClick={onMenuClick}
        className="md:hidden p-2 rounded-md hover:bg-slate-100"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5 text-slate-600" />
      </button>
      <div>
        <h1 className="text-base font-bold text-slate-900 leading-none dark:text-slate-100">{title}</h1>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5 dark:text-slate-400">{subtitle}</p>}
      </div>
    </header>
  );
}

interface LayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

const BOTTOM_NAV = [
  { to: "/provider/dashboard", icon: LayoutDashboard, label: "דף הבית" },
  { to: "/provider/clients",   icon: Users,           label: "לקוחות" },
  { to: "/provider/tasks",     icon: ListTodo,        label: "משימות" },
];

function MobileBottomNav() {
  const { pathname } = useLocation();
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 h-14 flex items-center justify-around bg-white/95 dark:bg-slate-900/95 border-t border-slate-200 dark:border-slate-700 backdrop-blur-sm safe-area-pb">
      {BOTTOM_NAV.map(({ to, icon: Icon, label }) => {
        const active = pathname === to || pathname.startsWith(to + "/");
        return (
          <NavLink
            key={to}
            to={to}
            className={cn(
              "flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-lg transition-colors",
              active ? "text-indigo-600" : "text-slate-400"
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="text-[10px] font-medium leading-none">{label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

export function Layout({ title, subtitle, children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Skip navigation — visible on first Tab press (IS 5568 / WCAG 2.4.1) */}
      <a href="#main-content" className="skip-nav">
        דלג לתוכן הראשי
      </a>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-1 flex-col md:ltr:pl-60 md:rtl:pr-60">
        <Navbar title={title} subtitle={subtitle} onMenuClick={() => setSidebarOpen(o => !o)} />
        <main id="main-content" tabIndex={-1} className="flex-1 p-4 pb-20 md:pb-0 md:p-8 dark:bg-slate-900">
          {children}
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
