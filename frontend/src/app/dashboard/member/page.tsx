"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/providers/supabase-provider";
import { useOrganization } from "@/providers/organization-provider";
import { useRealtime } from "@/providers/realtime-provider";
import { RecordingHub } from "@/components/recording/recording-hub";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { api } from "@/lib/api";
import type { Session, Task, OrgMembership, Profile } from "@/types";
import { SessionDetailModal } from "@/components/meetings/session-detail-modal";
import {
  BarChart3,
  Clock,
  ListChecks,
  UserPlus,
  Users,
  Trash2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  FolderOpen,
  Eye,
} from "lucide-react";

interface MemberWithProfile extends OrgMembership {
  profile: Profile | null;
}

const priorityLabels: Record<string, string> = {
  low: "נמוכה",
  medium: "בינונית",
  high: "גבוהה",
  critical: "קריטית",
};

const statusLabels: Record<string, string> = {
  todo: "לביצוע",
  in_progress: "בתהליך",
  done: "הושלם",
};

const priorityColors = {
  low: "default" as const,
  medium: "info" as const,
  high: "warning" as const,
  critical: "danger" as const,
};

type MeetingSort = "time" | "project";
type TaskSort = "time" | "project" | "status" | "urgency";

const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const statusOrder: Record<string, number> = { todo: 0, in_progress: 1, done: 2 };

// ─── Calendar Modal ───────────────────────────────────────────────────────────
function CalendarModal({
  sessions,
  onClose,
  onSelectSession,
}: {
  sessions: Session[];
  onClose: () => void;
  onSelectSession: (s: Session) => void;
}) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const sessionsByDay = useMemo(() => {
    const map: Record<string, Session[]> = {};
    sessions.forEach((s) => {
      const day = new Date(s.created_at).toISOString().split("T")[0];
      if (!map[day]) map[day] = [];
      map[day].push(s);
    });
    return map;
  }, [sessions]);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  const dayHeaders = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];
  const selectedDaySessions = selectedDay ? sessionsByDay[selectedDay] || [] : [];

  return (
    <Modal open onClose={onClose} title="לוח שנה — פגישות">
      <div className="space-y-4" dir="rtl">
        <div className="flex items-center justify-between">
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="חודש הבא"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="font-semibold text-gray-800">
            {currentMonth.toLocaleString("he-IL", { month: "long", year: "numeric" })}
          </span>
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="חודש קודם"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 text-center">
          {dayHeaders.map((d) => (
            <div key={d} className="text-xs font-medium text-gray-400 py-1">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const hasSessions = !!sessionsByDay[dateStr];
            const isSelected = selectedDay === dateStr;
            return (
              <button
                key={day}
                onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                className={`relative py-2 rounded-lg text-sm text-center transition-colors ${
                  isSelected
                    ? "bg-indigo-600 text-white"
                    : hasSessions
                      ? "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold"
                      : "hover:bg-gray-100 text-gray-700"
                }`}
              >
                {day}
                {hasSessions && !isSelected && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-400" />
                )}
              </button>
            );
          })}
        </div>

        {selectedDay && (
          <div className="border-t border-gray-100 pt-3 space-y-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              {selectedDaySessions.length > 0
                ? `פגישות — ${new Date(selectedDay).toLocaleDateString("he-IL")}`
                : "אין פגישות ביום זה"}
            </p>
            {selectedDaySessions.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  onSelectSession(s);
                  onClose();
                }}
                className="w-full text-right p-2.5 rounded-lg bg-gray-50 hover:bg-indigo-50 border border-transparent hover:border-indigo-200 text-sm transition-colors"
              >
                <p className="font-medium text-gray-900">{s.title || "פגישה ללא שם"}</p>
                {s.summary && (
                  <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{s.summary}</p>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── Add Participant Modal ────────────────────────────────────────────────────
function AddParticipantModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { session } = useSupabase();
  const { currentOrg } = useOrganization();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!currentOrg) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const trimmedEmail = email.trim();
    const token = session?.access_token || "";

    try {
      await api.addOrgMember(currentOrg.id, { email: trimmedEmail, role: "participant" }, token);
      setSuccess(`${trimmedEmail} נוסף כמשתתף.`);
      setEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בהוספת משתתף");
    }
    setLoading(false);
  };

  return (
    <Modal open={open} onClose={onClose} title="הוסף משתתף">
      <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
        <Alert variant="warning">
          למשתתפים יש גישת קריאה בלבד למשימות ואינם צורכים קיבולת הקלטה.
        </Alert>

        {error && <Alert variant="error">{error}</Alert>}
        {success && (
          <div className="px-3 py-2 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
            {success}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">כתובת אימייל</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            required
            dir="ltr"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-400 mt-1">
            אם המשתמש טרם נכנס למערכת, הוא יקושר אוטומטית בהתחברות הראשונה.
          </p>
        </div>

        <div className="flex justify-start gap-3 pt-2">
          <Button type="submit" loading={loading}>
            <UserPlus className="w-4 h-4 ml-1" />
            הוסף משתתף
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            סגור
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Member Page ──────────────────────────────────────────────────────────────
export default function MemberPage() {
  const { supabase, session } = useSupabase();
  const { currentOrg, capacity, currentRole, loading: orgLoading } = useOrganization();
  const { subscribe } = useRealtime();
  const router = useRouter();

  const [allSessions, setAllSessions] = useState<Session[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [taskCountTotal, setTaskCountTotal] = useState(0);
  const [taskCounts, setTaskCounts] = useState<Record<string, { total: number; done: number }>>({});
  const [projects, setProjects] = useState<Record<string, string>>({}); // id -> name

  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [confirmDeleteSession, setConfirmDeleteSession] = useState<Session | null>(null);
  const [deletingSession, setDeletingSession] = useState(false);
  const [deleteSessionError, setDeleteSessionError] = useState<string | null>(null);

  // Meeting table state
  const [meetingSort, setMeetingSort] = useState<MeetingSort>("time");
  const [meetingPage, setMeetingPage] = useState(0);

  // Task table state
  const [taskSort, setTaskSort] = useState<TaskSort>("time");
  const [taskPage, setTaskPage] = useState(0);

  const ITEMS_PER_PAGE = 5;

  useEffect(() => {
    if (orgLoading) return;
    if (currentRole === "participant") {
      router.replace("/dashboard/participant");
    }
  }, [orgLoading, currentRole, router]);

  const loadStats = useCallback(async () => {
    if (!currentOrg) return;

    const [sessionRes, taskRes, taskCountRes, projRes] = await Promise.all([
      supabase
        .from("sessions")
        .select("*")
        .eq("org_id", currentOrg.id)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("tasks")
        .select("*, assignee:profiles!tasks_assignee_id_fkey(*)")
        .eq("org_id", currentOrg.id)
        .order("created_at", { ascending: false })
        .limit(100),
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

    if (sessionRes.data) setAllSessions(sessionRes.data as Session[]);
    if (taskRes.data) {
      setAllTasks(taskRes.data as Task[]);
      setTaskCountTotal(taskRes.data.length);
    }

    if (taskCountRes.data) {
      const counts: Record<string, { total: number; done: number }> = {};
      (taskCountRes.data as { session_id: string; status: string }[]).forEach((t) => {
        if (!t.session_id) return;
        if (!counts[t.session_id]) counts[t.session_id] = { total: 0, done: 0 };
        counts[t.session_id].total++;
        if (t.status === "done") counts[t.session_id].done++;
      });
      setTaskCounts(counts);
    }

    if (projRes.data) {
      const map: Record<string, string> = {};
      (projRes.data as { id: string; name: string }[]).forEach((p) => { map[p.id] = p.name; });
      setProjects(map);
    }
  }, [supabase, currentOrg]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    const unsub = subscribe("sessions", () => loadStats());
    return unsub;
  }, [subscribe, loadStats]);

  const handleDeleteSession = async () => {
    if (!confirmDeleteSession) return;
    setDeletingSession(true);
    setDeleteSessionError(null);
    try {
      await api.deleteSession(confirmDeleteSession.id, token);
      setAllSessions((prev) => prev.filter((s) => s.id !== confirmDeleteSession.id));
      if (selectedSession?.id === confirmDeleteSession.id) setSelectedSession(null);
      setConfirmDeleteSession(null);
    } catch (err) {
      setDeleteSessionError(err instanceof Error ? err.message : "שגיאה במחיקת פגישה");
    } finally {
      setDeletingSession(false);
    }
  };

  // Sorted/paginated meetings
  const sortedMeetings = useMemo(() => {
    const copy = [...allSessions];
    if (meetingSort === "project") {
      copy.sort((a, b) => {
        const pa = a.project_id ? (projects[a.project_id] || "") : "";
        const pb = b.project_id ? (projects[b.project_id] || "") : "";
        return pa.localeCompare(pb, "he");
      });
    }
    return copy;
  }, [allSessions, meetingSort, projects]);

  const meetingTotalPages = Math.ceil(sortedMeetings.length / ITEMS_PER_PAGE);
  const pagedMeetings = sortedMeetings.slice(meetingPage * ITEMS_PER_PAGE, (meetingPage + 1) * ITEMS_PER_PAGE);

  // Sorted/paginated tasks
  const sortedTasks = useMemo(() => {
    const copy = [...allTasks];
    if (taskSort === "urgency") {
      copy.sort((a, b) => (priorityOrder[a.priority] ?? 4) - (priorityOrder[b.priority] ?? 4));
    } else if (taskSort === "status") {
      copy.sort((a, b) => (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3));
    } else if (taskSort === "project") {
      copy.sort((a, b) => {
        const pa = a.project_id ? (projects[a.project_id] || "") : "";
        const pb = b.project_id ? (projects[b.project_id] || "") : "";
        return pa.localeCompare(pb, "he");
      });
    }
    return copy;
  }, [allTasks, taskSort, projects]);

  const taskTotalPages = Math.ceil(sortedTasks.length / ITEMS_PER_PAGE);
  const pagedTasks = sortedTasks.slice(taskPage * ITEMS_PER_PAGE, (taskPage + 1) * ITEMS_PER_PAGE);

  if (orgLoading || currentRole === "participant") return null;

  const token = session?.access_token || "";

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">דף בית</h1>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setShowAddParticipant(true)}
        >
          <UserPlus className="w-4 h-4 ml-1" />
          הוסף משתתף
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">פגישות</p>
              <p className="text-xl font-bold">{allSessions.length}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
              <ListChecks className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">סה״כ משימות</p>
              <p className="text-xl font-bold">{taskCountTotal}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">נותר</p>
              <p className="text-xl font-bold">
                {capacity?.remaining_minutes ?? "—"} דק׳
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Recording Hub */}
      <RecordingHub />

      {/* Meetings Table */}
      {allSessions.length > 0 && (
        <Card padding={false}>
          <div className="p-5 pb-3 flex items-center justify-between">
            <CardHeader>
              <CardTitle>פגישות אחרונות</CardTitle>
            </CardHeader>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCalendar(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-xs text-gray-600 transition-colors"
              >
                <CalendarDays className="w-3.5 h-3.5" />
                לוח שנה
              </button>
              <button
                onClick={() => { setMeetingSort(meetingSort === "time" ? "project" : "time"); setMeetingPage(0); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-xs text-gray-600 transition-colors"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                {meetingSort === "time" ? "לפי פרויקט" : "לפי זמן"}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-y border-gray-200">
                <tr>
                  <th className="text-right px-5 py-2.5 font-medium text-gray-500 text-xs">תאריך</th>
                  <th className="text-right px-5 py-2.5 font-medium text-gray-500 text-xs">כותרת</th>
                  <th className="text-right px-5 py-2.5 font-medium text-gray-500 text-xs">פרויקט</th>
                  <th className="text-right px-5 py-2.5 font-medium text-gray-500 text-xs">התקדמות</th>
                  <th className="px-5 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pagedMeetings.map((s) => {
                  const tc = taskCounts[s.id];
                  return (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-5 py-2.5 text-gray-500 text-xs whitespace-nowrap">
                        {new Date(s.created_at).toLocaleDateString("he-IL")}
                      </td>
                      <td className="px-5 py-2.5 font-medium text-gray-900 max-w-[200px] truncate">
                        {s.title || "פגישה ללא שם"}
                      </td>
                      <td className="px-5 py-2.5 text-xs text-gray-500">
                        {s.project_id && projects[s.project_id] ? (
                          <span className="flex items-center gap-1">
                            <FolderOpen className="w-3 h-3 text-indigo-400" />
                            {projects[s.project_id]}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-5 py-2.5">
                        {tc ? (
                          <Badge variant={tc.done === tc.total ? "success" : "default"}>
                            {tc.done}/{tc.total} ✓
                          </Badge>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-5 py-2.5">
                        <button
                          onClick={() => setSelectedSession(s)}
                          className="p-1.5 rounded hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition-colors"
                          aria-label="צפה בפרטים"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {meetingTotalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-2.5 border-t border-gray-100">
              <span className="text-xs text-gray-400">{meetingPage + 1} / {meetingTotalPages}</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setMeetingPage((p) => Math.max(0, p - 1))}
                  disabled={meetingPage === 0}
                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setMeetingPage((p) => Math.min(meetingTotalPages - 1, p + 1))}
                  disabled={meetingPage >= meetingTotalPages - 1}
                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Tasks Table */}
      {allTasks.length > 0 && (
        <Card padding={false}>
          <div className="p-5 pb-3 flex items-center justify-between">
            <CardHeader>
              <CardTitle>משימות אחרונות</CardTitle>
            </CardHeader>
            <div className="flex items-center gap-1.5">
              {(["time", "project", "status", "urgency"] as TaskSort[]).map((s) => {
                const labels: Record<TaskSort, string> = {
                  time: "זמן",
                  project: "פרויקט",
                  status: "סטטוס",
                  urgency: "דחיפות",
                };
                return (
                  <button
                    key={s}
                    onClick={() => { setTaskSort(s); setTaskPage(0); }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border ${
                      taskSort === s
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "text-gray-600 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {labels[s]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-y border-gray-200">
                <tr>
                  <th className="text-right px-5 py-2.5 font-medium text-gray-500 text-xs">כותרת</th>
                  <th className="text-right px-5 py-2.5 font-medium text-gray-500 text-xs">פרויקט</th>
                  <th className="text-right px-5 py-2.5 font-medium text-gray-500 text-xs">סטטוס</th>
                  <th className="text-right px-5 py-2.5 font-medium text-gray-500 text-xs">עדיפות</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pagedTasks.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-5 py-2.5 font-medium text-gray-900 max-w-[200px] truncate">
                      <span className={t.status === "done" ? "line-through text-gray-400" : ""}>
                        {t.title}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-xs text-gray-500">
                      {t.project_id && projects[t.project_id] ? (
                        <span className="flex items-center gap-1">
                          <FolderOpen className="w-3 h-3 text-indigo-400" />
                          {projects[t.project_id]}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-2.5">
                      <Badge
                        variant={
                          t.status === "done"
                            ? "success"
                            : t.status === "in_progress"
                              ? "info"
                              : "default"
                        }
                      >
                        {statusLabels[t.status] ?? t.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-2.5">
                      <Badge variant={priorityColors[t.priority]}>
                        {priorityLabels[t.priority] ?? t.priority}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {taskTotalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-2.5 border-t border-gray-100">
              <span className="text-xs text-gray-400">{taskPage + 1} / {taskTotalPages}</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setTaskPage((p) => Math.max(0, p - 1))}
                  disabled={taskPage === 0}
                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setTaskPage((p) => Math.min(taskTotalPages - 1, p + 1))}
                  disabled={taskPage >= taskTotalPages - 1}
                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Session Detail Modal */}
      {selectedSession && (
        <SessionDetailModal
          session={selectedSession}
          token={token}
          onClose={() => setSelectedSession(null)}
          onRequestDelete={(s) => {
            setSelectedSession(null);
            setConfirmDeleteSession(s);
            setDeleteSessionError(null);
          }}
          onSessionUpdate={(updated) => {
            setAllSessions((prev) =>
              prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s))
            );
            setSelectedSession((prev) => prev ? { ...prev, ...updated } : prev);
          }}
        />
      )}

      {/* Confirm Delete Session Modal */}
      {confirmDeleteSession && (
        <Modal
          open
          onClose={() => !deletingSession && setConfirmDeleteSession(null)}
          title="מחיקת פגישה"
        >
          <div className="space-y-4" dir="rtl">
            <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <Trash2 className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-800">
                <p className="font-semibold mb-1">
                  האם למחוק את הפגישה &quot;{confirmDeleteSession.title || "פגישה ללא שם"}&quot;?
                </p>
                <p>
                  פעולה זו תמחק לצמיתות את סיכום הפגישה ואת <strong>כל המשימות הקשורות</strong> אליה.
                  לא ניתן לבטל פעולה זו.
                </p>
              </div>
            </div>

            {deleteSessionError && (
              <Alert variant="error">{deleteSessionError}</Alert>
            )}

            <div className="flex gap-3 justify-start">
              <Button
                variant="danger"
                onClick={handleDeleteSession}
                loading={deletingSession}
              >
                <Trash2 className="w-4 h-4 ml-1" />
                מחק לצמיתות
              </Button>
              <Button
                variant="secondary"
                onClick={() => setConfirmDeleteSession(null)}
                disabled={deletingSession}
              >
                ביטול
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Calendar Modal */}
      {showCalendar && (
        <CalendarModal
          sessions={allSessions}
          onClose={() => setShowCalendar(false)}
          onSelectSession={(s) => setSelectedSession(s)}
        />
      )}

      {/* Add Participant Modal */}
      <AddParticipantModal
        open={showAddParticipant}
        onClose={() => setShowAddParticipant(false)}
      />
    </div>
  );
}
