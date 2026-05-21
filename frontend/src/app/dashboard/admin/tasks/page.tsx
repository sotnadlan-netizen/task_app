"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOrganization } from "@/providers/organization-provider";
import { TaskList } from "@/components/tasks/task-list";
import { PageHeader } from "@/components/ui/lightning";
import { ListChecks } from "lucide-react";

export default function AdminTasksPage() {
  const { currentRole, loading: orgLoading } = useOrganization();
  const router = useRouter();

  useEffect(() => {
    if (orgLoading) return;
    if (currentRole !== "admin") {
      router.replace("/dashboard/member");
    }
  }, [orgLoading, currentRole, router]);

  if (orgLoading || currentRole !== "admin") return null;

  return (
    <div className="space-y-5" dir="rtl">
      <PageHeader
        icon={<ListChecks className="w-5 h-5 text-white" />}
        eyebrow="Organization Console"
        title="משימות"
        breadcrumb={["ניהול", "משימות"]}
      />
      <TaskList />
    </div>
  );
}
