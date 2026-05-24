"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOrganization } from "@/providers/organization-provider";
import { TaskList } from "@/components/tasks/task-list";
import { PageHeader } from "@/components/ui/lightning";
import { useLanguage } from "@/providers/language-provider";
import { ListChecks } from "lucide-react";

export default function AdminTasksPage() {
  const { currentRole, loading: orgLoading } = useOrganization();
  const { t } = useLanguage();
  const router = useRouter();

  useEffect(() => {
    if (orgLoading) return;
    if (currentRole !== "admin") {
      router.replace("/dashboard/member");
    }
  }, [orgLoading, currentRole, router]);

  if (orgLoading || currentRole !== "admin") return null;

  return (
    <div className="space-y-5">
      <PageHeader
        icon={<ListChecks className="w-5 h-5 text-white" />}
        eyebrow={t("console.organization")}
        title={t("nav.tasks")}
        breadcrumb={[t("nav.admin"), t("nav.tasks")]}
      />
      <TaskList />
    </div>
  );
}
