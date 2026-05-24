"use client";

import { ApprovalInbox } from "@/components/inbox/approval-inbox";
import { PageHeader } from "@/components/ui/lightning";
import { useLanguage } from "@/providers/language-provider";
import { Inbox } from "lucide-react";

export default function InboxPage() {
  const { t } = useLanguage();
  return (
    <div className="space-y-5">
      <PageHeader
        icon={<Inbox className="w-5 h-5 text-white" />}
        eyebrow={t("console.member")}
        title={t("console.approvalsTitle")}
        breadcrumb={[t("nav.home"), t("console.approvalsCrumb")]}
      />
      <ApprovalInbox />
    </div>
  );
}
