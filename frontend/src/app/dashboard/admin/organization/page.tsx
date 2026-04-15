"use client";

/**
 * Admin → Organization page
 * Re-uses the full admin page content which manages org members, quotas, and prompts.
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOrganization } from "@/providers/organization-provider";

export default function AdminOrganizationPage() {
  const { currentRole, loading: orgLoading } = useOrganization();
  const router = useRouter();

  useEffect(() => {
    if (orgLoading) return;
    if (currentRole !== "admin") {
      router.replace("/dashboard/member");
    } else {
      // Redirect to the main admin page which contains org management
      router.replace("/dashboard/admin");
    }
  }, [orgLoading, currentRole, router]);

  return null;
}
