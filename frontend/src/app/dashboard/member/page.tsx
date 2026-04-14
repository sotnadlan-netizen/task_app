"use client";

import { useEffect, useState, useCallback } from "react";
import { useSupabase } from "@/providers/supabase-provider";
import { useOrganization } from "@/providers/organization-provider";
import { RecordingHub } from "@/components/recording/recording-hub";
import { TaskList } from "@/components/tasks/task-list";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import type { Session } from "@/types";
import { BarChart3, Clock, ListChecks } from "lucide-react";

export default function MemberPage() {
  const { supabase } = useSupabase();
  const { currentOrg, capacity } = useOrganization();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [taskCount, setTaskCount] = useState(0);

  const loadStats = useCallback(async () => {
    if (!currentOrg) return;

    const [sessionRes, taskRes] = await Promise.all([
      supabase
        .from("sessions")
        .select("*")
        .eq("org_id", currentOrg.id)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("tasks")
        .select("id", { count: "exact" })
        .eq("org_id", currentOrg.id),
    ]);

    if (sessionRes.data) setSessions(sessionRes.data as Session[]);
    if (taskRes.count !== null) setTaskCount(taskRes.count);
  }, [supabase, currentOrg]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Member Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Sessions</p>
              <p className="text-xl font-bold">{sessions.length}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
              <ListChecks className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Tasks</p>
              <p className="text-xl font-bold">{taskCount}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Remaining</p>
              <p className="text-xl font-bold">
                {capacity?.remaining_minutes ?? "—"} min
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Recording Hub */}
      <RecordingHub onSuccess={loadStats} />

      {/* Recent Sessions */}
      {sessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Sessions</CardTitle>
          </CardHeader>
          <div className="space-y-3">
            {sessions.map((s) => (
              <div
                key={s.id}
                className="p-3 rounded-lg bg-gray-50 border border-gray-100"
              >
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-medium text-gray-900">
                    {s.title || "Untitled Session"}
                  </h4>
                  <span className="text-xs text-gray-400">
                    {new Date(s.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs text-gray-600 line-clamp-2">
                  {s.summary}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Tasks */}
      <TaskList />
    </div>
  );
}
