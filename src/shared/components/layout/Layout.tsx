import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Bot, Mic, ChevronRight, LogOut, BarChart2, Menu, Sun, Moon, Users, ListTodo, Settings, Contrast, BookOpen } from "lucide-react";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { cn } from "@/core/utils/utils";
import { useAuth } from "@/core/state/AuthContext";
import { Button } from "@/shared/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";

// i18n key pairs — resolved inside Sidebar with useTranslation()
const NAV_ITEMS = [
  { to: "/provider/dashboard", icon: LayoutDashboard, labelKey: "nav.home",      subKey: "nav.home.sub" },
  { to: "/provider/clients",   icon: Users,           labelKey: "nav.clients",   subKey: "nav.clients.sub" },
  { to: "/provider/tasks",     icon: ListTodo,        labelKey: "nav.tasks",     subKey: "nav.tasks.sub" },
  { to: "/provider/analytics", icon: BarChart2,       labelKey: "nav.analytics", subKey: "nav.analytics.sub" },
  { to: "/provider/config",    icon: Bot,             labelKey: "nav.config",    subKey: "nav.config.sub" },
  { to: "/features",           icon: BookOpen,        labelKey: "nav.features",  subKey: "nav.features.sub" },
];

// Language cycle: he (RTL) → en (LTR) → ru (LTR)
const LANGS: { code: string; label: string; dir: 'rtl' | 'ltr' }[] = [
  { code: 'he', label: 'עב', dir: 'rtl' },
  { code: 'en', label: 'EN', dir: 'ltr' },
  { code: 'ru', label: 'РУ', dir: 'ltr' },
];

function cycleLang() {
  const current = localStorage.getItem('lng') ?? 'he';
  const idx     = LANGS.findIndex((l) => l.code === current);
  const next    = LANGS[(idx + 1) % LANGS.length];
  localStorage.setItem('lng', next.code);
  document.documentElement.setAttribute('lang', next.code);
  document.documentElement.setAttribute('dir', next.dir);
  i18n.changeLanguage(next.code);
}

function toggleHighContrast() {
  const on = document.documentElement.classList.toggle('hc');
  localStorage.setItem('hc', on ? '1' : '0');
}

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { pathname } = useLocation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
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
          // md:translate-x-0 always shows sidebar on desktop.
          // max-md: variants apply ONLY below md so they never compete with md:translate-x-0.
          // Previously ltr:-translate-x-full had higher CSS specificity (attribute selector)
          // and overrode md:translate-x-0 on desktop — this fixes that.
          "transition-transform duration-200 ease-in-out md:translate-x-0",
          !open && "max-md:ltr:-translate-x-full max-md:rtl:translate-x-full"
        )}
      >
        {/* Logo — safe-area aware for notched iPhones */}
        <div className="flex items-center gap-3 px-5 border-b border-slate-800 pt-[env(safe-area-inset-top)] min-h-[calc(4rem+env(safe-area-inset-top))]">
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
            {t("nav.navigation")}
          </p>
          {NAV_ITEMS.map(({ to, icon: Icon, labelKey, subKey }) => {
            const active =
              pathname === to ||
              (to === "/provider/dashboard" && pathname.startsWith("/provider/board")) ||
              (to === "/provider/clients" && pathname.startsWith("/provider/clients/"));
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
                  <p className="text-sm font-medium leading-none">{t(labelKey)}</p>
                  <p
                    className={cn(
                      "text-[11px] mt-0.5 leading-none",
                      active ? "text-indigo-200" : "text-slate-600"
                    )}
                  >
                    {t(subKey)}
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
            {t("nav.signOut")}
          </Button>
        </div>
      </aside>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("nav.signOut")}?</AlertDialogTitle>
            <AlertDialogDescription>
              You'll be redirected to the login page. Any unsaved changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmedSignOut}
              className="bg-red-600 hover:bg-red-700"
            >
              {t("nav.signOut")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Navbar({ title, subtitle, onMenuClick }: { title: string; subtitle?: string; onMenuClick: () => void }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email;
  const avatarUrl = user?.user_metadata?.avatar_url;

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white/90 backdrop-blur-sm px-4 md:px-8 dark:border-slate-700 dark:bg-slate-900/90 pt-[env(safe-area-inset-top)] min-h-[calc(4rem+env(safe-area-inset-top))]">
      <button
        onClick={onMenuClick}
        className="md:hidden p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5 text-slate-600 dark:text-slate-400" />
      </button>
      <div className="flex-1 min-w-0">
        <h1 className="text-base font-bold text-slate-900 leading-none dark:text-slate-100">{title}</h1>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5 dark:text-slate-400">{subtitle}</p>}
      </div>

      {/* Right-side controls — mirrors ClientLayout */}
      <div className="flex items-center gap-1">
        {/* User avatar + name (desktop) */}
        <div className="hidden md:flex items-center gap-2 me-1">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={`${displayName || "User"} avatar`}
              className="h-7 w-7 rounded-full object-cover ring-2 ring-slate-200 dark:ring-slate-700"
            />
          ) : (
            <div className="h-7 w-7 rounded-full bg-indigo-600/20 dark:bg-indigo-900/40 flex items-center justify-center">
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                {user?.email?.[0]?.toUpperCase() ?? "A"}
              </span>
            </div>
          )}
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300 max-w-[120px] truncate hidden lg:block">
            {displayName}
          </span>
        </div>

        {/* Dark mode toggle */}
        <button
          onClick={() => {
            const isDark = document.documentElement.classList.toggle("dark");
            localStorage.setItem("theme", isDark ? "dark" : "light");
          }}
          className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 transition-colors"
          aria-label="Toggle dark mode"
        >
          <Sun className="h-4 w-4 hidden dark:block" />
          <Moon className="h-4 w-4 block dark:hidden" />
        </button>

        {/* High contrast toggle */}
        <button
          onClick={toggleHighContrast}
          className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 transition-colors"
          aria-label="Toggle high contrast"
        >
          <Contrast className="h-4 w-4" />
        </button>

        {/* Language cycle: he → en → ru */}
        <button
          onClick={cycleLang}
          className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 transition-colors text-xs font-bold min-w-[32px] text-center"
          aria-label={t("nav.settings")}
        >
          {LANGS.find((l) => l.code === (localStorage.getItem("lng") ?? "he"))?.label ?? "עב"}
        </button>
      </div>
    </header>
  );
}

interface LayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

const BOTTOM_NAV_ITEMS = [
  { to: "/provider/dashboard", icon: LayoutDashboard, labelKey: "nav.home" },
  { to: "/provider/clients",   icon: Users,           labelKey: "nav.clients" },
  { to: "/provider/tasks",     icon: ListTodo,        labelKey: "nav.tasks" },
  { to: "/features",           icon: BookOpen,        labelKey: "nav.features" },
  { to: "/provider/config",    icon: Settings,        labelKey: "nav.settings" },
];

function MobileBottomNav() {
  const { pathname } = useLocation();
  const { t } = useTranslation();
  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-50 flex items-center justify-around mobile-tab-bar"
      aria-label={t("nav.mainNav")}
    >
      {BOTTOM_NAV_ITEMS.map(({ to, icon: Icon, labelKey }) => {
        const active = pathname === to || pathname.startsWith(to + "/");
        return (
          <NavLink
            key={to}
            to={to}
            aria-label={t(labelKey)}
            className={cn(
              "flex flex-col items-center gap-0.5 flex-1 py-2 transition-colors no-min-height",
              active ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500"
            )}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
            <span className="text-[10px] font-medium leading-none">{t(labelKey)}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

export function Layout({ title, subtitle, children }: LayoutProps) {
  const { t } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-[100dvh] bg-background dark:bg-background">
      {/* Skip navigation — visible on first Tab press (IS 5568 / WCAG 2.4.1) */}
      <a href="#main-content" className="skip-nav">
        {t("nav.skipToContent")}
      </a>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-1 flex-col md:ps-60">
        <Navbar title={title} subtitle={subtitle} onMenuClick={() => setSidebarOpen(o => !o)} />
        <main id="main-content" tabIndex={-1} className="flex-1 p-4 md:p-8 mobile-content-area md:pb-14 dark:bg-slate-900">
          {children}
        </main>
      </div>
      {/* Accessibility footer — visible at desktop, above mobile bottom nav */}
      <footer className="hidden md:block fixed bottom-0 inset-x-0 z-20 border-t border-slate-800 bg-slate-950/80 backdrop-blur-sm ps-60">
        <div className="flex items-center justify-end gap-4 px-8 py-2">
          <a
            href="/accessibility"
            className="text-[11px] text-slate-600 hover:text-slate-400 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 focus-visible:outline-offset-2 rounded"
          >
            הצהרת נגישות
          </a>
          <span className="text-[11px] text-slate-700">IS 5568 / WCAG 2.1 AA</span>
        </div>
      </footer>
      <MobileBottomNav />
    </div>
  );
}
