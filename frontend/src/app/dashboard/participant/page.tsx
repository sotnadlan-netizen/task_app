"use client";

import { TaskList } from "@/components/tasks/task-list";
import { useOrganization } from "@/providers/organization-provider";
import { PageHeader } from "@/components/ui/lightning";
import { ListChecks } from "lucide-react";

export default function ParticipantPage() {
  const { currentOrg } = useOrganization();

  return (
    <div className="space-y-5" dir="rtl">
      <PageHeader
        icon={<ListChecks className="w-5 h-5 text-white" />}
        eyebrow="Participant"
        title="המשימות שלי"
        breadcrumb={[currentOrg?.name || "Organization", "משימות"]}
      />
      <TaskList readonly />
    </div>
  );
}
