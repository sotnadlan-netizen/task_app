"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOrganization } from "@/providers/organization-provider";
import { MeetingsList } from "@/components/meetings/meetings-list";
import { PageHeader } from "@/components/ui/lightning";
import { CalendarDays } from "lucide-react";

export default function AdminMeetingsPage() {
  const { currentRole, loading: orgLoading } = useOrganization();
  const router = useRouter();

  useEffect(() => {
    if (orgLoading) return;
    if (currentRole !== "admin") {
      router.replace("/dashboard/member");
    }
  }, [orgLoading, currentRole, router]);

  if (orgLoading || currentRole !== "admin") return null;

  return (
    <div className="space-y-5" dir="rtl">
      <PageHeader
        icon={<CalendarDays className="w-5 h-5 text-white" />}
        eyebrow="Organization Console"
        title="פגישות"
        breadcrumb={["ניהול", "פגישות"]}
      />
      <MeetingsList />
    </div>
  );
}
