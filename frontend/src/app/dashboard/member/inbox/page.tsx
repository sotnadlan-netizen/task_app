"use client";

import { ApprovalInbox } from "@/components/inbox/approval-inbox";

export default function InboxPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Approval Inbox</h1>
      <p className="text-sm text-gray-500">
        Review and approve or reject task edit requests from Participants.
      </p>
      <ApprovalInbox />
    </div>
  );
}
