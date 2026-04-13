"use client";

import { useEffect, useState, useCallback } from "react";
import { useSupabase } from "@/providers/supabase-provider";
import { useOrganization } from "@/providers/organization-provider";
import { useRealtime } from "@/providers/realtime-provider";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TaskEditRequestForm } from "./task-edit-request-form";
import type { Task } from "@/types";
import { Lock, ExternalLink, Pencil } from "lucide-react";

const statusColors = {
  todo: "default" as const,
  in_progress: "info" as const,
  done: "success" as const,
};

const priorityColors = {
  low: "default" as const,
  medium: "info" as const,
  high: "warning" as const,
  critical: "danger" as const,
};

export function TaskList({ readonly = false }: { readonly?: boolean }) {
  const { supabase, session } = useSupabase();
  const { currentOrg } = useOrganization();
  const { subscribe } = useRealtime();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    if (!currentOrg) return;
    setLoading(true);
    const { data } = await supabase
      .from("tasks")
      .select("*, assignee:profiles!tasks_assignee_id_fkey(*)")
      .eq("org_id", currentOrg.id)
      .order("created_at", { ascending: false });

    if (data) setTasks(data as Task[]);
    setLoading(false);
  }, [supabase, currentOrg]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Real-time sync
  useEffect(() => {
    const unsub = subscribe("tasks", () => {
      loadTasks();
    });
    return unsub;
  }, [subscribe, loadTasks]);

  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-12">
          <div className="animate-pulse text-sm text-gray-400">
            Loading tasks...
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card padding={false}>
      <div className="p-6 pb-0">
        <CardHeader>
          <CardTitle>Tasks</CardTitle>
          <Badge>{tasks.length}</Badge>
        </CardHeader>
      </div>

      {tasks.length === 0 ? (
        <div className="px-6 pb-6 text-center text-sm text-gray-500 py-8">
          No tasks yet. Start a recording session to generate tasks.
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="px-6 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      {task.title}
                    </h4>
                    {task.is_locked && (
                      <Lock
                        className="w-3.5 h-3.5 text-gray-400 flex-shrink-0"
                        aria-label="Synced and locked"
                      />
                    )}
                    {task.external_sync_id && (
                      <ExternalLink
                        className="w-3.5 h-3.5 text-blue-400 flex-shrink-0"
                        aria-label="Synced to external platform"
                      />
                    )}
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {task.description}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant={priorityColors[task.priority]}>
                    {task.priority}
                  </Badge>
                  <Badge variant={statusColors[task.status]}>
                    {task.status.replace("_", " ")}
                  </Badge>
                  {readonly && !task.is_locked && (
                    <button
                      onClick={() =>
                        setEditingTaskId(
                          editingTaskId === task.id ? null : task.id
                        )
                      }
                      className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
                      aria-label="Request edit"
                    >
                      <Pencil className="w-4 h-4 text-gray-500" />
                    </button>
                  )}
                </div>
              </div>

              {editingTaskId === task.id && (
                <TaskEditRequestForm
                  task={task}
                  token={session?.access_token || ""}
                  onClose={() => setEditingTaskId(null)}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
