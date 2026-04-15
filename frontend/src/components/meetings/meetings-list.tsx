"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSupabase } from "@/providers/supabase-provider";
import { useOrganization } from "@/providers/organization-provider";
import { useRealtime } from "@/providers/realtime-provider";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { api } from "@/lib/api";
import type { Session, Task } from "@/types";
import { SessionDetailModal } from "@/components/meetings/session-detail-modal";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Trash2,
  ArrowUpDown,
  FolderOpen,
} from "lucide-react";

type SortMode = "time" | "project";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

interface TaskCount {
  total: number;
  done: number;
}

export function MeetingsList() {
  const { supabase, session } = useSupabase();
  const { currentOrg } = useOrganization();
  const { subscribe } = useRealtime();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [taskCounts, setTaskCounts] = useState<Record<string, TaskCount>>({});
  const [projects, setProjects] = useState<Record<string, string>>({}); // id -> name
  const [loading, setLoading] = useState(true);
  const [sortMode, setSortMode] = useState<SortMode>("time");
  const [projectFilter, setProjectFilter] = useState<string>("");
  const [page, setPage] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState<Session | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  const PAGE_SIZE = 10;
  const token = session?.access_token || "";

  const loadData = useCallback(async () => {
    if (!currentOrg) return;
    setLoading(true);

    const [sessRes, taskRes, projRes] = await Promise.all([
      supabase
        .from("sessions")
        .select("*")
        .eq("org_id", currentOrg.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("tasks")
        .select("session_id, status")
        .eq("org_id", currentOrg.id)
        .not("session_id", "is", null),
      supabase
        .from("projects")
        .select("id, name")
        .eq("org_id", currentOrg.id),
    ]);

    if (sessRes.data) setSessions(sessRes.data as Session[]);

    // Build task count map
    if (taskRes.data) {
      const counts: Record<string, TaskCount> = {};
      (taskRes.data as Pick<Task, "session_id" | "status">[]).forEach((t) => {
        if (!t.session_id) return;
        if (!counts[t.session_id]) counts[t.session_id] = { total: 0, done: 0 };
        counts[t.session_id].total++;
        if (t.status === "done") counts[t.session_id].done++;
      });
      setTaskCounts(counts);
    }

    if (projRes.data) {
      const map: Record<string, string> = {};
      (projRes.data as { id: string; name: string }[]).forEach((p) => {
        map[p.id] = p.name;
      });
      setProjects(map);
    }

    setLoading(false);
  }, [supabase, currentOrg]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const unsub = subscribe("sessions", loadData);
    return unsub;
  }, [subscribe, loadData]);

  const sorted = useMemo(() => {
    let copy = projectFilter
      ? sessions.filter((s) => s.project_id === projectFilter)
      : [...sessions];
    if (sortMode === "project") {
      copy.sort((a, b) => {
        const pa = a.project_id ? (projects[a.project_id] || "") : "";
        const pb = b.project_id ? (projects[b.project_id] || "") : "";
        return pa.localeCompare(pb, "he");
      });
    }
    return copy;
  }, [sessions, sortMode, projectFilter, projects]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paged = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.deleteSession(confirmDelete.id, token);
      setSessions((prev) => prev.filter((s) => s.id !== confirmDelete.id));
      if (selectedSession?.id === confirmDelete.id) setSelectedSession(null);
      setConfirmDelete(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "שגיאה במחיקה");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-12">
          <div className="animate-pulse text-sm text-gray-400">טוען פגישות...</div>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card padding={false}>
        <div className="p-5 pb-3 flex items-center justify-between" dir="rtl">
          <CardHeader>
            <CardTitle>פגישות ({sessions.length})</CardTitle>
          </CardHeader>
          <div className="flex items-center gap-2">
            {Object.keys(projects).length > 0 && (
              <select
                value={projectFilter}
                onChange={(e) => { setProjectFilter(e.target.value); setPage(0); }}
                className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">כל הפרויקטים</option>
                {Object.entries(projects).map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
            )}
            <button
              onClick={() => { setSortMode(sortMode === "time" ? "project" : "time"); setPage(0); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-xs text-gray-600 transition-colors"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              {sortMode === "time" ? "מיין לפי פרויקט" : "מיין לפי זמן"}
            </button>
          </div>
        </div>

        {sessions.length === 0 ? (
          <div className="px-6 pb-8 text-center text-sm text-gray-400" dir="rtl">
            אין פגישות עדיין. התחל הקלטה כדי ליצור פגישה.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" dir="rtl">
                <thead className="bg-gray-50 border-y border-gray-200">
                  <tr>
                    <th className="text-right px-5 py-3 font-medium text-gray-500">תאריך</th>
                    <th className="text-right px-5 py-3 font-medium text-gray-500">כותרת</th>
                    <th className="text-right px-5 py-3 font-medium text-gray-500">פרויקט</th>
                    <th className="text-right px-5 py-3 font-medium text-gray-500">התקדמות</th>
                    <th className="text-right px-5 py-3 font-medium text-gray-500">משך</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paged.map((s) => {
                    const tc = taskCounts[s.id];
                    const durationMin = s.duration_seconds ? Math.round(s.duration_seconds / 60) : null;
                    return (
                      <tr
                        key={s.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => setSelectedSession(s)}
                      >
                        <td className="px-5 py-3 text-gray-500 text-xs whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <CalendarDays className="w-3.5 h-3.5 text-gray-400" />
                            {formatDate(s.created_at)}
                          </div>
                        </td>
                        <td className="px-5 py-3 font-medium text-gray-900 max-w-xs truncate">
                          {s.title || "פגישה ללא שם"}
                        </td>
                        <td className="px-5 py-3 text-gray-500 text-xs">
                          {s.project_id && projects[s.project_id] ? (
                            <span className="flex items-center gap-1">
                              <FolderOpen className="w-3.5 h-3.5 text-indigo-400" />
                              {projects[s.project_id]}
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          {tc ? (
                            <Badge variant={tc.done === tc.total ? "success" : "default"}>
                              {tc.done}/{tc.total} ✓
                            </Badge>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-gray-500 text-xs">
                          {durationMin != null ? (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-gray-400" />
                              {durationMin} דק׳
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => { setConfirmDelete(s); setDeleteError(null); }}
                            className="p-1.5 rounded-lg hover:bg-red-100 transition-colors text-gray-400 hover:text-red-500"
                            aria-label="מחק פגישה"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100" dir="rtl">
                <span className="text-xs text-gray-500">
                  עמוד {page + 1} מתוך {totalPages}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40"
                    aria-label="עמוד הבא"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40"
                    aria-label="עמוד קודם"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Delete Confirm Modal */}
      {confirmDelete && (
        <Modal open onClose={() => !deleting && setConfirmDelete(null)} title="מחיקת פגישה">
          <div className="space-y-4" dir="rtl">
            <Alert variant="warning">
              האם למחוק את הפגישה &quot;{confirmDelete.title || "פגישה ללא שם"}&quot;?
              פעולה זו תמחק גם את <strong>כל המשימות הקשורות</strong>.
            </Alert>
            {deleteError && <Alert variant="error">{deleteError}</Alert>}
            <div className="flex gap-3">
              <Button variant="danger" onClick={handleDelete} loading={deleting}>
                <Trash2 className="w-4 h-4 ml-1" />
                מחק
              </Button>
              <Button variant="secondary" onClick={() => setConfirmDelete(null)} disabled={deleting}>
                ביטול
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Full session detail modal — tasks, edit meeting, delete */}
      {selectedSession && (
        <SessionDetailModal
          session={selectedSession}
          token={token}
          onClose={() => setSelectedSession(null)}
          onRequestDelete={(s) => {
            setSelectedSession(null);
            setConfirmDelete(s);
            setDeleteError(null);
          }}
          onSessionUpdate={(updated) => {
            setSessions((prev) =>
              prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s))
            );
            setSelectedSession((prev) => prev ? { ...prev, ...updated } : prev);
          }}
        />
      )}
    </>
  );
}
