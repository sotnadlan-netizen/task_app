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

  const dashboardPath = isPlatformAdmin
    ? "/dashboard/platform"
    : currentRole === "admin"
      ? "/dashboard/admin"
      : currentRole === "member"
        ? "/dashboard/member"
        : "/dashboard/participant";

  const isOnAdminView = pathname.startsWith("/dashboard/admin");
  const isOnMemberView = pathname.startsWith("/dashboard/member");

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Left: Logo + Org Switcher */}
          <div className="flex items-center gap-4">
            <Link
              href={dashboardPath}
              className="flex items-center gap-2 font-bold text-xl text-indigo-600"
            >
              <Settings className="w-6 h-6" />
              <span className="hidden sm:inline">TaskOrch</span>
            </Link>

            {/* Platform Admin Badge */}
            {isPlatformAdmin && (
              <span className="px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold">
                Platform Admin
              </span>
            )}

            {/* Org Switcher */}
            {!isPlatformAdmin && organizations.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setOrgDropdownOpen(!orgDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-300
                    hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors"
                  aria-label="Switch organization"
                >
                  <Building2 className="w-4 h-4" />
                  <span className="max-w-[120px] truncate">
                    {currentOrg?.name || "Select Org"}
                  </span>
                  <ChevronDown className="w-4 h-4" />
                </button>

                {orgDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    {organizations.map((org) => (
                      <button
                        key={org.id}
                        onClick={() => {
                          switchOrganization(org.id);
                          setOrgDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50
                          ${org.id === currentOrg?.id ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-700"}`}
                      >
                        {org.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Admin/Member Toggle + Notifications + User Menu */}
          <div className="flex items-center gap-3">
            {/* Admin ↔ Member toggle for admin-role users */}
            {!isPlatformAdmin && currentRole === "admin" && (
              <div className="hidden sm:flex items-center bg-gray-100 rounded-lg p-1 gap-1">
                <button
                  onClick={() => router.push("/dashboard/member")}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    isOnMemberView
                      ? "bg-white text-indigo-700 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Member
                </button>
                <button
                  onClick={() => router.push("/dashboard/admin")}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    isOnAdminView
                      ? "bg-white text-indigo-700 shadow-sm"
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
              className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
            >
              <Bell className="w-5 h-5 text-gray-600" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>

            {/* User Menu */}
            <div className="relative hidden sm:block">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-semibold">
                  {user?.email?.charAt(0).toUpperCase() || "?"}
                </div>
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user?.email}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">
                      {currentRole}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      signOut();
                      setUserMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              className="sm:hidden p-2 rounded-lg hover:bg-gray-100"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-gray-200 bg-white">
          <div className="px-4 py-3 space-y-2">
            <p className="text-sm text-gray-500 truncate">{user?.email}</p>
            <p className="text-xs text-gray-400 capitalize">{currentRole}</p>
            <button
              onClick={signOut}
              className="w-full text-left text-sm text-red-600 py-2 flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
