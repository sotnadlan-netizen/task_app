"use client";

import { ApprovalInbox } from "@/components/inbox/approval-inbox";
import { PageHeader } from "@/components/ui/lightning";
import { Inbox } from "lucide-react";

export default function InboxPage() {
  return (
    <div className="space-y-5" dir="rtl">
      <PageHeader
        icon={<Inbox className="w-5 h-5 text-white" />}
        eyebrow="Member Console"
        title="תיבת אישורים"
        breadcrumb={["דף בית", "אישורים"]}
      />
      <ApprovalInbox />
    </div>
  );
}
