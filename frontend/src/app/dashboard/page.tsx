"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOrganization } from "@/providers/organization-provider";

/**
 * Dashboard root — routes the user to their role-specific page.
 * Platform admin  → /dashboard/platform
 * Admin           → /dashboard/admin
 * Member          → /dashboard/member
 * Participant     → /dashboard/participant
 */
export default function DashboardRootPage() {
  const { currentRole, isPlatformAdmin, loading } = useOrganization();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (isPlatformAdmin) {
      router.replace("/dashboard/platform");
    } else if (currentRole === "admin") {
      router.replace("/dashboard/admin");
    } else if (currentRole === "member") {
      router.replace("/dashboard/member");
    } else if (currentRole === "participant") {
      router.replace("/dashboard/participant");
    }
    // If no role yet (e.g. no-org redirect already in flight), do nothing.
  }, [loading, currentRole, isPlatformAdmin, router]);

  return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
    </div>
  );
}
