import { Mic, LogOut, Sun, Moon, Contrast } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/shared/components/ui/button";
import { useAuth } from "@/core/state/AuthContext";
import i18n from "@/i18n";

interface ClientLayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

// Language cycle: he (RTL) → en (LTR) → ru (LTR)  — mirrors Layout.tsx
const LANGS: { code: string; label: string; dir: "rtl" | "ltr" }[] = [
  { code: "he", label: "עב", dir: "rtl" },
  { code: "en", label: "EN", dir: "ltr" },
  { code: "ru", label: "РУ", dir: "ltr" },
];

function cycleLang() {
  const current = localStorage.getItem("lng") ?? "he";
  const idx = LANGS.findIndex((l) => l.code === current);
  const next = LANGS[(idx + 1) % LANGS.length];
  localStorage.setItem("lng", next.code);
  document.documentElement.setAttribute("lang", next.code);
  document.documentElement.setAttribute("dir", next.dir);
  i18n.changeLanguage(next.code);
}

function toggleHighContrast() {
  const on = document.documentElement.classList.toggle("hc");
  localStorage.setItem("hc", on ? "1" : "0");
}

export function ClientLayout({ title, subtitle, children }: ClientLayoutProps) {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email;
  const avatarUrl = user?.user_metadata?.avatar_url;

  async function handleSignOut() {
    await signOut();
    navigate("/login", { replace: true });
  }

  const currentLangLabel =
    LANGS.find((l) => l.code === (localStorage.getItem("lng") ?? "he"))?.label ?? "עב";

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-900">
      {/* Top Navbar — mirrors provider Navbar controls */}
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-slate-200 dark:border-slate-700 glass px-4 md:px-6">
        {/* Logo */}
        <div className="flex items-center gap-2.5 ltr:mr-4 rtl:ml-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600">
            <Mic className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-sm font-bold text-slate-900 dark:text-slate-100">Advisor AI</span>
        </div>

        {/* Page title */}
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-slate-900 leading-none truncate hidden sm:block dark:text-slate-100">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-slate-500 mt-0.5 hidden sm:block dark:text-slate-400">
              {subtitle}
            </p>
          )}
        </div>

        {/* Right-side controls */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* User avatar + name */}
          <div className="hidden sm:flex items-center gap-2 me-1">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={`${displayName || "User"} avatar`}
                className="h-7 w-7 rounded-full object-cover ring-2 ring-slate-200 dark:ring-slate-700"
              />
            ) : (
              <div className="h-7 w-7 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  {displayName?.[0]?.toUpperCase() ?? "C"}
                </span>
              </div>
            )}
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300 max-w-[120px] truncate">
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
            aria-label="Switch language"
          >
            {currentLangLabel}
          </button>

          {/* Sign out */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="gap-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 h-8 text-xs sm:text-sm"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t("nav.signOut")}</span>
          </Button>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8 dark:bg-slate-900">{children}</main>
    </div>
  );
}
