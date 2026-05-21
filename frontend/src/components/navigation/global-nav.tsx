"use client";

import { useState } from "react";
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
} from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export function GlobalNav() {
  const { user, signOut } = useSupabase();
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
      label: "דף בית",
      icon: <Home className="w-3.5 h-3.5" />,
      active: pathname === roleBase,
    },
    {
      href: `${roleBase}/tasks`,
      label: "משימות",
      icon: <ListChecks className="w-3.5 h-3.5" />,
      active: pathname.startsWith(`${roleBase}/tasks`),
    },
    {
      href: `${roleBase}/meetings`,
      label: "פגישות",
      icon: <CalendarDays className="w-3.5 h-3.5" />,
      active: pathname.startsWith(`${roleBase}/meetings`),
    },
    ...(currentRole === "admin" && !isPlatformAdmin
      ? [
          {
            href: "/dashboard/admin/organization",
            label: "ארגון",
            icon: <Building2 className="w-3.5 h-3.5" />,
            active: pathname.startsWith("/dashboard/admin/organization"),
          },
        ]
      : []),
    ...(isPlatformAdmin
      ? [
          {
            href: "/dashboard/platform",
            label: "פלטפורמה",
            icon: <ShieldCheck className="w-3.5 h-3.5" />,
            active: pathname === "/dashboard/platform",
          },
        ]
      : []),
  ];

  return (
    <nav className="sf-nav sticky top-0 z-40 bg-[#16325c] text-white" dir="rtl">
      {/* Utility bar */}
      <div className="px-4 sm:px-6 lg:px-8 h-12 flex items-center gap-3">
        {/* App launcher → dashboard home (role router) */}
        <Link
          href="/dashboard"
          className="grid grid-cols-3 gap-0.5 p-2 rounded hover:bg-white/10 transition-colors flex-shrink-0"
          aria-label="App launcher"
        >
          {[...Array(9)].map((_, i) => (
            <span key={i} className="w-1 h-1 rounded-full bg-white/80" />
          ))}
        </Link>

        <span className="text-white/30 hidden sm:inline">|</span>

        {/* Logo */}
        <Link href={roleBase} className="flex items-center gap-2 flex-shrink-0">
          <div className="w-7 h-7 rounded bg-gradient-to-br from-[#1ab9ff] to-[#0070d2] flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-[15px] hidden sm:inline">TaskOrch</span>
        </Link>

        {/* Object tabs — desktop */}
        <div className="hidden md:flex items-center mr-4 h-12">
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

        <div className="flex-1" />

        {/* Right utility cluster */}
        <div className="flex items-center gap-1">
          {/* Search */}
          <div className="relative hidden lg:block">
            <Search className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-[#16325c]" />
            <input
              placeholder="חיפוש"
              className="w-44 pr-7 pl-3 py-1.5 text-[13px] bg-white text-[#080707] rounded placeholder-[#706e6b] focus:outline-none focus:ring-2 focus:ring-[#1ab9ff]"
            />
          </div>

          {/* Platform Admin Badge */}
          {isPlatformAdmin && (
            <span className="px-2 py-1 rounded bg-white/15 text-white text-[11px] font-semibold hidden sm:inline">
              Platform Admin
            </span>
          )}

          {/* Org Switcher */}
          {!isPlatformAdmin && organizations.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setOrgDropdownOpen(!orgDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded hover:bg-white/10 text-[13px] font-medium text-white transition-colors"
                aria-label="Switch organization"
              >
                <Building2 className="w-4 h-4 text-[#1ab9ff]" />
                <span className="max-w-[120px] truncate hidden sm:inline">
                  {currentOrg?.name || "Select Org"}
                </span>
                <ChevronDown className="w-4 h-4 text-white/70" />
              </button>

              {orgDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-lg shadow-[0_8px_32px_rgba(0,0,0,0.18)] border border-[#dddbda] py-1.5 z-50">
                  {organizations.map((org) => (
                    <button
                      key={org.id}
                      onClick={() => {
                        switchOrganization(org.id);
                        setOrgDropdownOpen(false);
                      }}
                      className={`w-full text-right px-4 py-2 text-[13px] transition-colors ${
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

          {/* Admin ↔ Member toggle */}
          {!isPlatformAdmin && currentRole === "admin" && (
            <div className="flex items-center bg-white/10 rounded p-0.5 gap-0.5">
              <button
                onClick={() => router.push("/dashboard/member")}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded transition-colors ${
                  isOnMemberView ? "bg-white text-[#16325c]" : "text-white/80 hover:text-white"
                }`}
              >
                Member
              </button>
              <button
                onClick={() => router.push("/dashboard/admin")}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded transition-colors ${
                  isOnAdminView ? "bg-white text-[#16325c]" : "text-white/80 hover:text-white"
                }`}
              >
                Admin
              </button>
            </div>
          )}

          {/* Theme Toggle (recolored for navy bar) */}
          <div className="text-white [&_button]:text-white [&_button:hover]:bg-white/10">
            <ThemeToggle />
          </div>

          {/* Notification Bell */}
          <Link
            href="/dashboard/member/inbox"
            className="relative w-8 h-8 rounded hover:bg-white/10 flex items-center justify-center transition-colors"
            aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
          >
            <Bell className="w-4 h-4 text-white" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-[#c23934] text-white text-[10px] font-bold rounded-full flex items-center justify-center border border-[#16325c]">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>

          {/* User Menu */}
          <div className="relative hidden sm:block">
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
              <div className="absolute left-0 mt-1 w-56 bg-white rounded-lg shadow-[0_8px_32px_rgba(0,0,0,0.18)] border border-[#dddbda] py-1.5 z-50">
                <div className="px-4 py-2.5 border-b border-[#dddbda]">
                  <p className="text-[13px] font-medium text-[#080707] truncate">
                    {user?.email}
                  </p>
                  <p className="text-[11px] text-[#706e6b] capitalize">
                    {currentRole}
                  </p>
                </div>
                <button
                  onClick={() => {
                    signOut();
                    setUserMenuOpen(false);
                  }}
                  className="w-full text-right px-4 py-2 text-[13px] text-[#c23934] hover:bg-[#fde9e7] flex items-center gap-2 flex-row-reverse transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  התנתק
                </button>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded hover:bg-white/10 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/10 py-2" dir="rtl">
          <div className="px-2 space-y-0.5">
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
            <div className="pt-2 mt-1 border-t border-white/10">
              <p className="text-[13px] text-white/70 truncate px-3 py-1">{user?.email}</p>
              <button
                onClick={signOut}
                className="w-full text-right text-[13px] text-white py-2 px-3 flex items-center gap-2 flex-row-reverse rounded hover:bg-white/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                התנתק
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
