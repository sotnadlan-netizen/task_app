"use client";

import { TaskList } from "@/components/tasks/task-list";
import { PageHeader } from "@/components/ui/lightning";
import { ListChecks } from "lucide-react";

export default function ParticipantTasksPage() {
  return (
    <div className="space-y-5" dir="rtl">
      <PageHeader
        icon={<ListChecks className="w-5 h-5 text-white" />}
        eyebrow="Participant"
        title="משימות"
        breadcrumb={["דף בית", "משימות"]}
      />
      <TaskList readonly />
    </div>
  );
}
