"use client";

import { MeetingsList } from "@/components/meetings/meetings-list";

export default function ParticipantMeetingsPage() {
  return (
    <div className="space-y-6" dir="rtl">
      <h1 className="text-2xl font-bold text-gray-900">פגישות</h1>
      <MeetingsList />
    </div>
  );
}
