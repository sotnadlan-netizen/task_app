"use client";

import { useEffect, useState, useCallback } from "react";
import { useSupabase } from "@/providers/supabase-provider";
import { useOrganization } from "@/providers/organization-provider";
import { useRealtime } from "@/providers/realtime-provider";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { api } from "@/lib/api";
import { useLanguage } from "@/providers/language-provider";
import type { PendingTask } from "@/types";
import { Check, X, ArrowRight } from "lucide-react";

export function ApprovalInbox() {
  const { supabase, session } = useSupabase();
  const { currentOrg } = useOrganization();
  const { subscribe } = useRealtime();
  const { t } = useLanguage();
  const [pendingTasks, setPendingTasks] = useState<PendingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadPendingTasks = useCallback(async () => {
    if (!currentOrg) return;
    setLoading(true);
    const { data } = await supabase
      .from("pending_tasks")
      .select(
        "*, task:tasks(*), requester:profiles!pending_tasks_requested_by_fkey(*)"
      )
      .eq("org_id", currentOrg.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (data) setPendingTasks(data as PendingTask[]);
    setLoading(false);
  }, [supabase, currentOrg]);

  useEffect(() => {
    loadPendingTasks();
  }, [loadPendingTasks]);

  useEffect(() => {
    const unsub = subscribe("pending_tasks", () => {
      loadPendingTasks();
    });
    return unsub;
  }, [subscribe, loadPendingTasks]);

  const handleReview = async (
    id: string,
    action: "approved" | "rejected"
  ) => {
    setActionLoading(id);
    setError(null);
    try {
      await api.reviewEditRequest(id, action, session?.access_token || "");
      setPendingTasks((prev) => prev.filter((pt) => pt.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("inbox.actionFailed"));
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-12">
          <div className="animate-pulse text-sm text-gray-400">
            {t("inbox.loading")}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card padding={false}>
      <div className="p-6 pb-0">
        <CardHeader>
          <CardTitle>{t("inbox.title")}</CardTitle>
          <Badge variant={pendingTasks.length > 0 ? "warning" : "default"}>
            {t("inbox.pendingCount", { count: pendingTasks.length })}
          </Badge>
        </CardHeader>
      </div>

      {error && (
        <div className="px-6">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      {pendingTasks.length === 0 ? (
        <div className="px-6 pb-6 text-center text-sm text-gray-500 py-8">
          {t("inbox.noPending")}
        </div>
      ) : (
        <div className="divide-y divide-[#dddbda]">
          {pendingTasks.map((pt) => (
            <div key={pt.id} className="px-6 py-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {t("inbox.editRequestFor", { title: pt.task?.title ?? "" })}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {t("inbox.by", {
                      name: pt.requester?.full_name || pt.requester?.email || "",
                      date: new Date(pt.created_at).toLocaleDateString(),
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm bg-[#fafaf9] border border-[#dddbda] rounded px-3 py-2 mb-3">
                <Badge variant="default">{pt.field_changed}</Badge>
                <span className="text-gray-500 line-through">
                  {pt.old_value || "—"}
                </span>
                <ArrowRight className="w-4 h-4 text-gray-400" />
                <span className="text-gray-900 font-medium">
                  {pt.new_value}
                </span>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleReview(pt.id, "rejected")}
                  loading={actionLoading === pt.id}
                  disabled={!!actionLoading}
                >
                  <X className="w-4 h-4 me-1" />
                  {t("inbox.reject")}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleReview(pt.id, "approved")}
                  loading={actionLoading === pt.id}
                  disabled={!!actionLoading}
                >
                  <Check className="w-4 h-4 me-1" />
                  {t("inbox.approve")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
