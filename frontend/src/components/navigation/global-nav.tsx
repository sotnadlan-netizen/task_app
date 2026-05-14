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
  Settings,
  Building2,
  Menu,
  X,
  Home,
  ListChecks,
  CalendarDays,
  ShieldCheck,
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
      icon: <Home className="w-4 h-4" />,
      active: pathname === roleBase,
    },
    {
      href: `${roleBase}/tasks`,
      label: "משימות",
      icon: <ListChecks className="w-4 h-4" />,
      active: pathname.startsWith(`${roleBase}/tasks`),
    },
    {
      href: `${roleBase}/meetings`,
      label: "פגישות",
      icon: <CalendarDays className="w-4 h-4" />,
      active: pathname.startsWith(`${roleBase}/meetings`),
    },
    ...(currentRole === "admin" && !isPlatformAdmin
      ? [
          {
            href: "/dashboard/admin/organization",
            label: "ארגון",
            icon: <Building2 className="w-4 h-4" />,
            active: pathname.startsWith("/dashboard/admin/organization"),
          },
        ]
      : []),
    ...(isPlatformAdmin
      ? [
          {
            href: "/dashboard/platform",
            label: "פלטפורמה",
            icon: <ShieldCheck className="w-4 h-4" />,
            active: pathname === "/dashboard/platform",
          },
        ]
      : []),
  ];

  return (
    <nav className="sticky top-0 z-40 px-4 sm:px-6 lg:px-8 py-3 border-b border-white/40" style={{ background: "rgba(255,255,255,0.70)", backdropFilter: "blur(20px)" }} dir="rtl">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between h-10 items-center">
          {/* Right side (RTL): Logo + nav links */}
          <div className="flex items-center gap-4">
            <Link
              href={roleBase}
              className="flex items-center gap-2 font-bold text-lg text-gray-800"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-400 to-pink-400 flex items-center justify-center">
                <Settings className="w-4 h-4 text-white" />
              </div>
              <span className="hidden sm:inline">TaskOrch</span>
            </Link>

            {/* Platform Admin Badge */}
            {isPlatformAdmin && (
              <span className="px-2.5 py-1 rounded-full bg-violet-100 text-violet-600 text-xs font-semibold border border-violet-200">
                Platform Admin
              </span>
            )}

            {/* Nav links — desktop */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-sm font-medium transition-all ${
                    link.active
                      ? "bg-gradient-to-br from-violet-400 to-pink-400 text-white shadow-sm"
                      : "text-gray-500 hover:bg-white/70 hover:text-gray-800"
                  }`}
                >
                  {link.icon}
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Left side (RTL): org switcher + admin/member toggle + notifications + user */}
          <div className="flex items-center gap-3">
            {/* Org Switcher */}
            {!isPlatformAdmin && organizations.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setOrgDropdownOpen(!orgDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-2xl border border-violet-100
                    hover:bg-white/80 text-sm font-medium text-gray-600 transition-all bg-white/60"
                  aria-label="Switch organization"
                >
                  <Building2 className="w-4 h-4 text-violet-400" />
                  <span className="max-w-[120px] truncate">
                    {currentOrg?.name || "Select Org"}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>

                {orgDropdownOpen && (
                  <div className="absolute top-full right-0 mt-2 w-64 bg-white/90 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.10)] border border-white py-1.5 z-50">
                    {organizations.map((org) => (
                      <button
                        key={org.id}
                        onClick={() => {
                          switchOrganization(org.id);
                          setOrgDropdownOpen(false);
                        }}
                        className={`w-full text-right px-4 py-2 text-sm transition-colors rounded-xl mx-1 ${
                          org.id === currentOrg?.id
                            ? "bg-violet-50 text-violet-700 font-medium"
                            : "text-gray-600 hover:bg-violet-50/60"
                        }`}
                        style={{ width: "calc(100% - 8px)" }}
                      >
                        {org.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Admin ↔ Member toggle for admin-role users */}
            {!isPlatformAdmin && currentRole === "admin" && (
              <div className="flex items-center bg-white/60 border border-violet-100 rounded-2xl p-1 gap-1">
                <button
                  onClick={() => router.push("/dashboard/member")}
                  className={`px-3 py-1 text-xs font-medium rounded-xl transition-all ${
                    isOnMemberView
                      ? "bg-gradient-to-br from-violet-400 to-pink-400 text-white shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Member
                </button>
                <button
                  onClick={() => router.push("/dashboard/admin")}
                  className={`px-3 py-1 text-xs font-medium rounded-xl transition-all ${
                    isOnAdminView
                      ? "bg-gradient-to-br from-violet-400 to-pink-400 text-white shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Admin
                </button>
              </div>
            )}

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Notification Bell */}
            <Link
              href="/dashboard/member/inbox"
              className="relative p-2 rounded-2xl hover:bg-white/70 transition-colors"
              aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
            >
              <Bell className="w-5 h-5 text-gray-500" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-gradient-to-br from-red-400 to-pink-400 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>

            {/* User Menu */}
            <div className="relative hidden sm:block">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 p-1.5 rounded-2xl hover:bg-white/70 transition-colors"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-violet-300 to-pink-300 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                  {user?.email?.charAt(0).toUpperCase() || "?"}
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>

              {userMenuOpen && (
                <div className="absolute left-0 mt-2 w-56 bg-white/90 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.10)] border border-white py-1.5 z-50">
                  <div className="px-4 py-2.5 border-b border-violet-50">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {user?.email}
                    </p>
                    <p className="text-xs text-gray-400 capitalize">
                      {currentRole}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      signOut();
                      setUserMenuOpen(false);
                    }}
                    className="w-full text-right px-4 py-2 text-sm text-red-500 hover:bg-red-50/60 flex items-center gap-2 flex-row-reverse rounded-xl mx-auto transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    התנתק
                  </button>
                </div>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 rounded-2xl hover:bg-white/70 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5 text-gray-500" />
              ) : (
                <Menu className="w-5 h-5 text-gray-500" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-2 border-t border-white/40 pt-3" dir="rtl">
          <div className="px-2 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded-2xl text-sm font-medium transition-all ${
                  link.active
                    ? "bg-gradient-to-br from-violet-400 to-pink-400 text-white"
                    : "text-gray-600 hover:bg-white/70"
                }`}
              >
                {link.icon}
                {link.label}
              </Link>
            ))}
            <div className="pt-2 border-t border-violet-50/60">
              <p className="text-sm text-gray-400 truncate px-3 py-1">{user?.email}</p>
              <button
                onClick={signOut}
                className="w-full text-right text-sm text-red-500 py-2 px-3 flex items-center gap-2 flex-row-reverse rounded-2xl hover:bg-red-50/60 transition-colors"
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
