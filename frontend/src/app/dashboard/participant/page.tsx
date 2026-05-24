"use client";

import { TaskList } from "@/components/tasks/task-list";
import { useOrganization } from "@/providers/organization-provider";
import { PageHeader } from "@/components/ui/lightning";
import { useLanguage } from "@/providers/language-provider";
import { ListChecks } from "lucide-react";

export default function ParticipantPage() {
  const { currentOrg } = useOrganization();
  const { t } = useLanguage();

  return (
    <div className="space-y-5">
      <PageHeader
        icon={<ListChecks className="w-5 h-5 text-white" />}
        eyebrow={t("console.participant")}
        title={t("console.myTasks")}
        breadcrumb={[currentOrg?.name || t("nav.organization"), t("nav.tasks")]}
      />
      <TaskList readonly />
    </div>
  );
}
