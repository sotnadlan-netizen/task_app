"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { SupabaseProvider, useSupabase } from "@/providers/supabase-provider";
import { OrganizationProvider } from "@/providers/organization-provider";
import { RealtimeProvider } from "@/providers/realtime-provider";
import { GlobalNav } from "@/components/navigation/global-nav";
import { AccessibilityWidget } from "@/components/accessibility/accessibility-widget";
import { NotificationLoader } from "@/components/inbox/notification-loader";

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useSupabase();
  const router = useRouter();
  const pathname = usePathname();

  // The member home route renders the full-bleed Lightning console (its own
  // header replaces the GlobalNav). All other routes keep the shared chrome.
  const fullBleed = pathname === "/dashboard/member";

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#0070d2] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <OrganizationProvider>
      <RealtimeProvider>
        <NotificationLoader />
        {fullBleed ? (
          <div className="min-h-screen">
            {children}
            <AccessibilityWidget />
          </div>
        ) : (
          <div className="min-h-screen">
            <GlobalNav />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              {children}
            </main>
            <AccessibilityWidget />
          </div>
        )}
      </RealtimeProvider>
    </OrganizationProvider>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SupabaseProvider>
      <DashboardShell>{children}</DashboardShell>
    </SupabaseProvider>
  );
}
