"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOrganization } from "@/providers/organization-provider";
import { MeetingsList } from "@/components/meetings/meetings-list";
import { PageHeader } from "@/components/ui/lightning";
import { useLanguage } from "@/providers/language-provider";
import { CalendarDays } from "lucide-react";

export default function PlatformMeetingsPage() {
  const { isPlatformAdmin, loading: orgLoading } = useOrganization();
  const { t } = useLanguage();
  const router = useRouter();

  useEffect(() => {
    if (orgLoading) return;
    if (!isPlatformAdmin) {
      router.replace("/dashboard");
    }
  }, [orgLoading, isPlatformAdmin, router]);

  if (orgLoading || !isPlatformAdmin) return null;

  return (
    <div className="space-y-5">
      <PageHeader
        icon={<CalendarDays className="w-5 h-5 text-white" />}
        eyebrow={t("console.platform")}
        title={t("nav.meetings")}
        breadcrumb={[t("nav.platform"), t("nav.meetings")]}
      />
      <MeetingsList />
    </div>
  );
}
