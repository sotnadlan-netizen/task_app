"use client";

import { TaskList } from "@/components/tasks/task-list";

export default function ParticipantTasksPage() {
  return (
    <div className="space-y-6" dir="rtl">
      <h1 className="text-2xl font-bold text-gray-900">משימות</h1>
      <TaskList readonly />
    </div>
  );
}
