"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOrganization } from "@/providers/organization-provider";
import { TaskList } from "@/components/tasks/task-list";
import { PageHeader } from "@/components/ui/lightning";
import { ListChecks } from "lucide-react";

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
    <div className="space-y-5" dir="rtl">
      <PageHeader
        icon={<ListChecks className="w-5 h-5 text-white" />}
        eyebrow="Member Console"
        title="משימות"
        breadcrumb={["דף בית", "משימות"]}
      />
      <TaskList />
    </div>
  );
}
