"use client";

import { MeetingsList } from "@/components/meetings/meetings-list";
import { PageHeader } from "@/components/ui/lightning";
import { CalendarDays } from "lucide-react";

export default function ParticipantMeetingsPage() {
  return (
    <div className="space-y-5" dir="rtl">
      <PageHeader
        icon={<CalendarDays className="w-5 h-5 text-white" />}
        eyebrow="Participant"
        title="פגישות"
        breadcrumb={["דף בית", "פגישות"]}
      />
      <MeetingsList />
    </div>
  );
}
