"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOrganization } from "@/providers/organization-provider";
import { TaskList } from "@/components/tasks/task-list";

export default function MemberTasksPage() {
  const { currentRole, loading: orgLoading } = useOrganization();
  const router = useRouter();

  useEffect(() => {
    if (orgLoading) return;
    if (currentRole === "participant") {
      router.replace("/dashboard/participant");
    }
  }, [orgLoading, currentRole, router]);

  if (orgLoading || currentRole === "participant") return null;

  return (
    <div className="space-y-6" dir="rtl">
      <h1 className="text-2xl font-bold text-gray-900">משימות</h1>
      <TaskList />
    </div>
  );
}
