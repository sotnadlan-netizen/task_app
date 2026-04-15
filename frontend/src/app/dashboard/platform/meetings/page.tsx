"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOrganization } from "@/providers/organization-provider";
import { MeetingsList } from "@/components/meetings/meetings-list";

export default function PlatformMeetingsPage() {
  const { isPlatformAdmin, loading: orgLoading } = useOrganization();
  const router = useRouter();

  useEffect(() => {
    if (orgLoading) return;
    if (!isPlatformAdmin) {
      router.replace("/dashboard");
    }
  }, [orgLoading, isPlatformAdmin, router]);

  if (orgLoading || !isPlatformAdmin) return null;

  return (
    <div className="space-y-6" dir="rtl">
      <h1 className="text-2xl font-bold text-gray-900">פגישות</h1>
      <MeetingsList />
    </div>
  );
}
