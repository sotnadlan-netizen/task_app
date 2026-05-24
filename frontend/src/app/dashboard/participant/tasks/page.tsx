"use client";

import { TaskList } from "@/components/tasks/task-list";
import { PageHeader } from "@/components/ui/lightning";
import { useLanguage } from "@/providers/language-provider";
import { ListChecks } from "lucide-react";

export default function ParticipantTasksPage() {
  const { t } = useLanguage();
  return (
    <div className="space-y-5">
      <PageHeader
        icon={<ListChecks className="w-5 h-5 text-white" />}
        eyebrow={t("console.participant")}
        title={t("nav.tasks")}
        breadcrumb={[t("nav.home"), t("nav.tasks")]}
      />
      <TaskList readonly />
    </div>
  );
}
