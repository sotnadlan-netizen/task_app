"use client";

import { TaskList } from "@/components/tasks/task-list";
import { useOrganization } from "@/providers/organization-provider";

export default function ParticipantPage() {
  const { currentOrg } = useOrganization();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Tasks</h1>
        <p className="text-sm text-gray-500 mt-1">
          {currentOrg
            ? `Viewing tasks for ${currentOrg.name}`
            : "Select an organization to view tasks"}
        </p>
      </div>

      <TaskList readonly />
    </div>
  );
}
