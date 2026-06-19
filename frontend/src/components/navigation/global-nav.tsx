"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/providers/supabase-provider";
import { useOrganization } from "@/providers/organization-provider";
import { useNotificationStore } from "@/stores/notification-store";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  ChevronDown,
  LogOut,
  Building2,
  Menu,
  X,
  Home,
  ListChecks,
  CalendarDays,
  ShieldCheck,
  Search,
  Zap,
  LifeBuoy,
  Ticket,
} from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LanguageToggle } from "@/components/ui/language-toggle";
import { useLanguage } from "@/providers/language-provider";

type SearchSuggestion = { kind: "session" | "task"; id: string; title: string };

export function GlobalNav() {
  const { user, signOut, supabase } = useSupabase();
  const { t } = useLanguage();
  const {
    organizations,
    currentOrg,
    currentRole,
    isPlatformAdmin,
    switchOrganization,
  } = useOrganization();
  const { unreadCount } = useNotificationStore();
  const pathname = usePathname();
  const router = useRouter();
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [searchFocused, setSearchFocused] = useState(false);

  // Typeahead: as the user types, complete from existing meeting/task titles in
  // the current org. Debounced; scoped by org (RLS enforces access too).
  useEffect(() => {
    const q = searchQuery.trim();
    let active = true;
    const handle = setTimeout(async () => {
      if (!currentOrg || q.length < 2) {
        if (active) setSuggestions([]);
        return;
      }
      const [sRes, tRes] = await Promise.all([
        supabase.from("sessions").select("id, title").eq("org_id", currentOrg.id).ilike("title", `%${q}%`).limit(5),
        supabase.from("tasks").select("id, title").eq("org_id", currentOrg.id).ilike("title", `%${q}%`).limit(5),
      ]);
      if (!active) return;
      const out: SearchSuggestion[] = [];
      (sRes.data as { id: string; title: string }[] | null)?.forEach((s) => out.push({ kind: "session", id: s.id, title: s.title || "" }));
      (tRes.data as { id: string; title: string }[] | null)?.forEach((tk) => out.push({ kind: "task", id: tk.id, title: tk.title || "" }));
      setSuggestions(out.filter((o) => o.title));
    }, 200);
    return () => { active = false; clearTimeout(handle); };
  }, [searchQuery, currentOrg, supabase]);

  const goToSearch = (q: string) => {
    const term = q.trim();
    if (!term) return;
    setSearchFocused(false);
    setSuggestions([]);
    router.push(`/dashboard/search?q=${encodeURIComponent(term)}`);
  };

  const roleBase = isPlatformAdmin
    ? "/dashboard/platform"
    : currentRole === "admin"
      ? "/dashboard/admin"
      : currentRole === "member"
        ? "/dashboard/member"
        : "/dashboard/participant";

  const isOnAdminView = pathname.startsWith("/dashboard/admin");
  const isOnMemberView = pathname.startsWith("/dashboard/member");

  // Build nav links based on role
  const navLinks = [
    {
      href: roleBase,
      label: t("nav.home"),
      icon: <Home className="w-3.5 h-3.5" />,
      active: pathname === roleBase,
    },
    {
      href: `${roleBase}/tasks`,
      label: t("nav.tasks"),
      icon: <ListChecks className="w-3.5 h-3.5" />,
      active: pathname.startsWith(`${roleBase}/tasks`),
    },
    {
      href: `${roleBase}/meetings`,
      label: t("nav.meetings"),
      icon: <CalendarDays className="w-3.5 h-3.5" />,
      active: pathname.startsWith(`${roleBase}/meetings`),
    },
    // Client support page — for org users (admins, members, participants), not platform admins.
    ...(!isPlatformAdmin
      ? [
          {
            href: "/dashboard/support",
            label: t("nav.support"),
            icon: <LifeBuoy className="w-3.5 h-3.5" />,
            active: pathname.startsWith("/dashboard/support"),
          },
        ]
      : []),
    ...(isPlatformAdmin
      ? [
          {
            href: "/dashboard/platform",
            label: t("nav.platform"),
            icon: <ShieldCheck className="w-3.5 h-3.5" />,
            active: pathname === "/dashboard/platform",
          },
          {
            href: "/dashboard/platform/tickets",
            label: t("nav.tickets"),
            icon: <Ticket className="w-3.5 h-3.5" />,
            active: pathname.startsWith("/dashboard/platform/tickets"),
          },
        ]
      : []),
  ];

  return (
    <nav className="sf-nav sticky top-0 z-40 bg-[#16325c] text-white">
      {/* Utility bar */}
      <div className="px-4 sm:px-6 lg:px-8 h-12 flex items-center gap-3">
        {/* Logo */}
        <Link href={roleBase} className="flex items-center gap-2 flex-shrink-0">
          <div className="w-7 h-7 rounded bg-gradient-to-br from-[#1ab9ff] to-[#0070d2] flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-[15px] hidden sm:inline">TaskOrch</span>
        </Link>

        {/* Object tabs — wide screens only (kept off medium widths so the bar
            never overflows the viewport; the hamburger covers narrower screens). */}
        <div className="hidden lg:flex items-center ms-4 h-12 min-w-0">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`h-12 px-4 flex items-center gap-1.5 text-[13px] transition-colors ${
                link.active
                  ? "bg-white text-[#080707] font-semibold"
                  : "text-white/90 hover:bg-white/10"
              }`}
            >
              {link.icon}
              {link.label}
            </Link>
          ))}
        </div>

        {/* Global search — free-text search across meetings + tasks. Submitting
            routes to the results page (Atlassian-style). Flexible middle element,
            present on every width. */}
        <form
          onSubmit={(e) => { e.preventDefault(); goToSearch(searchQuery); }}
          className="relative flex-1 min-w-0 max-w-md"
          role="search"
        >
          <Search className="w-3.5 h-3.5 absolute start-2 top-1/2 -translate-y-1/2 text-[#16325c] z-10" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
            placeholder={t("search.placeholder")}
            aria-label={t("search.title")}
            className="w-full ps-7 pe-3 py-1.5 text-[13px] bg-white text-[#080707] rounded placeholder-[#706e6b] focus:outline-none focus:ring-2 focus:ring-[#1ab9ff]"
          />

          {/* Typeahead suggestions — completes from existing meetings/tasks */}
          {searchFocused && suggestions.length > 0 && (
            <div className="absolute top-full start-0 end-0 mt-1 bg-white rounded-lg shadow-[0_8px_32px_rgba(0,0,0,0.18)] border border-[#dddbda] py-1.5 z-50 max-h-80 overflow-y-auto">
              {suggestions.map((s) => (
                <button
                  key={`${s.kind}-${s.id}`}
                  type="button"
                  // onMouseDown fires before the input's onBlur, so the click registers.
                  onMouseDown={(e) => { e.preventDefault(); setSearchQuery(s.title); goToSearch(s.title); }}
                  className="w-full text-start px-3 py-2 text-[13px] text-[#080707] hover:bg-[#f3f3f3] flex items-center gap-2 transition-colors"
                >
                  {s.kind === "session" ? (
                    <CalendarDays className="w-3.5 h-3.5 text-[#0070d2] shrink-0" />
                  ) : (
                    <ListChecks className="w-3.5 h-3.5 text-[#fe9339] shrink-0" />
                  )}
                  <span className="truncate">{s.title}</span>
                </button>
              ))}
            </div>
          )}
        </form>

        {/* Right utility cluster */}
        <div className="flex items-center gap-1 min-w-0">
          {/* Platform Admin Badge */}
          {isPlatformAdmin && (
            <span className="px-2 py-1 rounded bg-white/15 text-white text-[11px] font-semibold hidden lg:inline">
              {t("nav.platformAdmin")}
            </span>
          )}

          {/* Org Switcher — only when the user actually belongs to >1 org */}
          {!isPlatformAdmin && organizations.length > 1 && (
            <div className="relative hidden lg:block">
              <button
                onClick={() => setOrgDropdownOpen(!orgDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded hover:bg-white/10 text-[13px] font-medium text-white transition-colors"
                aria-label={t("nav.switchOrganization")}
              >
                {currentOrg?.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={currentOrg.logo_url}
                    alt={currentOrg.name}
                    className="w-5 h-5 rounded object-cover shrink-0 bg-white"
                  />
                ) : (
                  <Building2 className="w-4 h-4 text-[#1ab9ff] shrink-0" />
                )}
                <span className="max-w-[120px] truncate text-start hidden sm:inline-block align-middle">
                  {currentOrg?.name || t("nav.selectOrg")}
                </span>
                <ChevronDown className="w-4 h-4 text-white/70" />
              </button>

              {orgDropdownOpen && (
                <div className="absolute top-full start-0 mt-1 w-64 bg-white rounded-lg shadow-[0_8px_32px_rgba(0,0,0,0.18)] border border-[#dddbda] py-1.5 z-50">
                  {organizations.map((org) => (
                    <button
                      key={org.id}
                      onClick={() => {
                        switchOrganization(org.id);
                        setOrgDropdownOpen(false);
                      }}
                      className={`w-full text-start px-4 py-2 text-[13px] transition-colors ${
                        org.id === currentOrg?.id
                          ? "bg-[#ecf5fe] text-[#0070d2] font-semibold"
                          : "text-[#080707] hover:bg-[#fafaf9]"
                      }`}
                    >
                      {org.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Admin ↔ Member toggle — kept in the bar on every width */}
          {!isPlatformAdmin && currentRole === "admin" && (
            <div className="flex items-center bg-white/10 rounded p-0.5 gap-0.5 flex-shrink-0">
              <button
                onClick={() => router.push("/dashboard/member")}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded transition-colors ${
                  isOnMemberView ? "bg-white text-[#16325c]" : "text-white/80 hover:text-white"
                }`}
              >
                {t("nav.member")}
              </button>
              <button
                onClick={() => router.push("/dashboard/admin")}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded transition-colors ${
                  isOnAdminView ? "bg-white text-[#16325c]" : "text-white/80 hover:text-white"
                }`}
              >
                {t("nav.admin")}
              </button>
            </div>
          )}

          {/* Language Toggle */}
          <div className="hidden lg:block">
            <LanguageToggle variant="dark" />
          </div>

          {/* Theme Toggle (recolored for navy bar) */}
          <div className="hidden lg:block text-white [&_button]:text-white [&_button:hover]:bg-white/10">
            <ThemeToggle />
          </div>

          {/* Notification Bell */}
          <Link
            href="/dashboard/member/inbox"
            className="relative hidden lg:flex w-8 h-8 rounded hover:bg-white/10 items-center justify-center transition-colors"
            aria-label={unreadCount > 0 ? t("nav.notificationsUnread", { count: unreadCount }) : t("nav.notifications")}
          >
            <Bell className="w-4 h-4 text-white" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -end-0.5 w-4 h-4 bg-[#c23934] text-white text-[10px] font-bold rounded-full flex items-center justify-center border border-[#16325c]">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>

          {/* User Menu */}
          <div className="relative hidden lg:block">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-1.5 p-1 rounded hover:bg-white/10 transition-colors"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-[#1ab9ff] to-[#0070d2] text-white rounded-full flex items-center justify-center text-sm font-semibold">
                {user?.email?.charAt(0).toUpperCase() || "?"}
              </div>
              <ChevronDown className="w-4 h-4 text-white/70" />
            </button>

            {userMenuOpen && (
              <div className="absolute end-0 mt-1 w-56 bg-white rounded-lg shadow-[0_8px_32px_rgba(0,0,0,0.18)] border border-[#dddbda] py-1.5 z-50">
                <div className="px-4 py-2.5 border-b border-[#dddbda]">
                  <p className="text-[13px] font-medium text-[#080707] truncate">
                    {user?.email}
                  </p>
                  <p className="text-[11px] text-[#706e6b]">
                    {currentRole ? t(`roles.${currentRole}`) : ""}
                  </p>
                </div>
                <button
                  onClick={() => {
                    signOut();
                    setUserMenuOpen(false);
                  }}
                  className="w-full text-start px-4 py-2 text-[13px] text-[#c23934] hover:bg-[#fde9e7] flex items-center gap-2 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  {t("nav.signOut")}
                </button>
              </div>
            )}
          </div>

          {/* Hamburger — shown whenever the inline tabs are hidden (< lg) */}
          <button
            className="lg:hidden p-2 rounded hover:bg-white/10 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={t("nav.toggleMenu")}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu — holds every top-bar option behind the hamburger on
          screens narrower than lg (phones + tablets). */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-white/10 py-2">
          <div className="px-2 space-y-0.5">
            {/* Nav links */}
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded text-[13px] font-medium transition-colors ${
                  link.active ? "bg-white text-[#16325c]" : "text-white/90 hover:bg-white/10"
                }`}
              >
                {link.icon}
                {link.label}
              </Link>
            ))}

            {/* Org switcher */}
            {!isPlatformAdmin && organizations.length > 1 && (
              <div className="pt-2 mt-1 border-t border-white/10">
                <p className="px-3 py-1 text-[11px] uppercase tracking-wide text-white/50 font-semibold">
                  {t("nav.switchOrganization")}
                </p>
                {organizations.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => { switchOrganization(org.id); setMobileMenuOpen(false); }}
                    className={`w-full text-start px-3 py-2 rounded text-[13px] flex items-center gap-2 transition-colors ${
                      org.id === currentOrg?.id ? "bg-white text-[#16325c] font-semibold" : "text-white/90 hover:bg-white/10"
                    }`}
                  >
                    <Building2 className="w-4 h-4 shrink-0" />
                    <span className="truncate">{org.name}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Notifications + theme + language */}
            <div className="pt-2 mt-1 border-t border-white/10">
              <Link
                href="/dashboard/member/inbox"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded text-[13px] font-medium text-white/90 hover:bg-white/10 transition-colors"
              >
                <Bell className="w-4 h-4" />
                {t("nav.notifications")}
                {unreadCount > 0 && (
                  <span className="ms-auto min-w-[18px] h-[18px] px-1 bg-[#c23934] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
              <div className="flex items-center gap-2 px-3 py-2">
                <div className="text-white [&_button]:text-white [&_button:hover]:bg-white/10">
                  <ThemeToggle />
                </div>
                <LanguageToggle variant="dark" />
              </div>
            </div>

            {/* Account */}
            <div className="pt-2 mt-1 border-t border-white/10">
              <p className="text-[13px] text-white/70 truncate px-3 py-1">{user?.email}</p>
              <button
                onClick={signOut}
                className="w-full text-start text-[13px] text-white py-2 px-3 flex items-center gap-2 rounded hover:bg-white/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                {t("nav.signOut")}
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
