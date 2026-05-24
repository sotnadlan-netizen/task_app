"use client";

import { MeetingsList } from "@/components/meetings/meetings-list";
import { PageHeader } from "@/components/ui/lightning";
import { useLanguage } from "@/providers/language-provider";
import { CalendarDays } from "lucide-react";

export default function ParticipantMeetingsPage() {
  const { t } = useLanguage();
  return (
    <div className="space-y-5">
      <PageHeader
        icon={<CalendarDays className="w-5 h-5 text-white" />}
        eyebrow={t("console.participant")}
        title={t("nav.meetings")}
        breadcrumb={[t("nav.home"), t("nav.meetings")]}
      />
      <MeetingsList />
    </div>
  );
}
