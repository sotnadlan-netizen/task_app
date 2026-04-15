"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/providers/supabase-provider";
import { useOrganization } from "@/providers/organization-provider";
import { RecordingHub } from "@/components/recording/recording-hub";
import { TaskList } from "@/components/tasks/task-list";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { api } from "@/lib/api";
import type { Session, Task, OrgMembership, Profile } from "@/types";
import {
  BarChart3,
  Clock,
  ListChecks,
  UserPlus,
  Users,
  Pencil,
  Trash2,
  Plus,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
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
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0=Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  const dayHeaders = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];
  const selectedDaySessions = selectedDay ? sessionsByDay[selectedDay] || [] : [];

  return (
    <Modal open onClose={onClose} title="לוח שנה — פגישות">
      <div className="space-y-4" dir="rtl">
        {/* Month navigation */}
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

        {/* Day headers */}
        <div className="grid grid-cols-7 text-center">
          {dayHeaders.map((d) => (
            <div key={d} className="text-xs font-medium text-gray-400 py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
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

        {/* Sessions for selected day */}
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

// ─── Session Detail Modal ─────────────────────────────────────────────────────
function SessionDetailModal({
  session,
  token,
  onClose,
  onRequestDelete,
}: {
  session: Session;
  token: string;
  onClose: () => void;
  onRequestDelete: (s: Session) => void;
}) {
  const { supabase } = useSupabase();
  const { currentOrg } = useOrganization();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // edit state
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    priority: "medium",
    status: "todo",
  });

  // add state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTaskForm, setNewTaskForm] = useState({ title: "", description: "", priority: "medium" });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // delete state
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (!currentOrg) return;
    async function load() {
      setLoading(true);
      const [taskRes, memberRes] = await Promise.all([
        supabase
          .from("tasks")
          .select("*, assignee:profiles!tasks_assignee_id_fkey(*)")
          .eq("session_id", session.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("org_memberships")
          .select("*, profile:profiles(*)")
          .eq("org_id", session.org_id),
      ]);
      if (taskRes.data) setTasks(taskRes.data as Task[]);
      if (memberRes.data) setMembers(memberRes.data as MemberWithProfile[]);
      setLoading(false);
    }
    load();
  }, [supabase, currentOrg, session]);

  const startEdit = (t: Task) => {
    setEditingTaskId(t.id);
    setEditForm({
      title: t.title,
      description: t.description || "",
      priority: t.priority,
      status: t.status,
    });
    setFormError(null);
  };

  const handleSaveEdit = async () => {
    if (!editingTaskId || !editForm.title.trim()) return;
    setSaving(true);
    setFormError(null);
    try {
      const updated = await api.updateTask(editingTaskId, editForm, token) as Task;
      setTasks((prev) => prev.map((t) => (t.id === editingTaskId ? { ...t, ...updated } : t)));
      setEditingTaskId(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "שגיאה בשמירה");
    } finally {
      setSaving(false);
    }
  };

  const handleAddTask = async () => {
    if (!newTaskForm.title.trim() || !currentOrg) return;
    setSaving(true);
    setFormError(null);
    try {
      const created = await api.createTask(
        {
          org_id: currentOrg.id,
          session_id: session.id,
          title: newTaskForm.title.trim(),
          description: newTaskForm.description.trim(),
          priority: newTaskForm.priority,
        },
        token
      ) as Task;
      setTasks((prev) => [created, ...prev]);
      setNewTaskForm({ title: "", description: "", priority: "medium" });
      setShowAddForm(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "שגיאה ביצירת משימה");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    setDeletingTaskId(taskId);
    try {
      await api.deleteTask(taskId, token);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "שגיאה במחיקת משימה");
    } finally {
      setDeletingTaskId(null);
    }
  };

  const durationMin = Math.round(session.duration_seconds / 60);

  return (
    <Modal open onClose={onClose} title={session.title || "פרטי פגישה"}>
      <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1" dir="rtl">
        {/* Meta */}
        <div className="flex items-center gap-3 text-xs text-gray-500 flex-row-reverse justify-end">
          <span>{new Date(session.created_at).toLocaleString("he-IL")}</span>
          {durationMin > 0 && <span>· {durationMin} דק׳</span>}
          {session.sentiment && (
            <span className="capitalize">· {session.sentiment}</span>
          )}
        </div>

        {/* Summary */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-1">סיכום</h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            {session.summary || "אין סיכום זמין."}
          </p>
        </div>

        {/* Participants */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              אנשים בפגישה
            </span>
          </h3>
          {loading ? (
            <p className="text-xs text-gray-400 animate-pulse">טוען...</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-full text-xs text-gray-700"
                >
                  <div className="w-5 h-5 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-semibold text-[10px]">
                    {(m.profile?.full_name || m.profile?.email || m.invited_email || "?")
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                  <span>
                    {m.profile?.full_name || m.profile?.email || m.invited_email || "לא ידוע"}
                  </span>
                  <span className="text-gray-400">
                    ({m.role === "admin" ? "מנהל" : m.role === "member" ? "חבר" : "משתתף"})
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tasks */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => { setShowAddForm(!showAddForm); setFormError(null); }}
              className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              הוסף משימה
            </button>
            <h3 className="text-sm font-semibold text-gray-700">
              משימות ({tasks.length})
            </h3>
          </div>

          {formError && <Alert variant="error" className="mb-2">{formError}</Alert>}

          {/* Add task form */}
          {showAddForm && (
            <div className="mb-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg space-y-2">
              <input
                type="text"
                placeholder="כותרת המשימה *"
                value={newTaskForm.title}
                onChange={(e) => setNewTaskForm((f) => ({ ...f, title: e.target.value }))}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <textarea
                placeholder="תיאור (אופציונלי)"
                value={newTaskForm.description}
                onChange={(e) => setNewTaskForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              />
              <div className="flex items-center gap-2">
                <select
                  value={newTaskForm.priority}
                  onChange={(e) => setNewTaskForm((f) => ({ ...f, priority: e.target.value }))}
                  className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="low">נמוכה</option>
                  <option value="medium">בינונית</option>
                  <option value="high">גבוהה</option>
                  <option value="critical">קריטית</option>
                </select>
                <Button size="sm" onClick={handleAddTask} loading={saving} disabled={!newTaskForm.title.trim()}>
                  צור
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowAddForm(false)}>
                  ביטול
                </Button>
              </div>
            </div>
          )}

          {loading ? (
            <p className="text-xs text-gray-400 animate-pulse">טוען...</p>
          ) : tasks.length === 0 ? (
            <p className="text-sm text-gray-400">לא נוצרו משימות מפגישה זו.</p>
          ) : (
            <div className="space-y-2">
              {tasks.map((t) => {
                const isEditing = editingTaskId === t.id;
                const isDeleting = deletingTaskId === t.id;
                return (
                  <div
                    key={t.id}
                    className={`p-3 rounded-lg border text-sm ${
                      t.status === "done"
                        ? "bg-green-50 border-green-200"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    {isEditing ? (
                      /* Edit form */
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editForm.title}
                          onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                        <textarea
                          value={editForm.description}
                          onChange={(e) =>
                            setEditForm((f) => ({ ...f, description: e.target.value }))
                          }
                          rows={2}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 resize-none"
                        />
                        <div className="flex gap-2">
                          <select
                            value={editForm.priority}
                            onChange={(e) =>
                              setEditForm((f) => ({ ...f, priority: e.target.value }))
                            }
                            className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="low">נמוכה</option>
                            <option value="medium">בינונית</option>
                            <option value="high">גבוהה</option>
                            <option value="critical">קריטית</option>
                          </select>
                          <select
                            value={editForm.status}
                            onChange={(e) =>
                              setEditForm((f) => ({ ...f, status: e.target.value }))
                            }
                            className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="todo">לביצוע</option>
                            <option value="in_progress">בתהליך</option>
                            <option value="done">הושלם</option>
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleSaveEdit} loading={saving}>
                            שמור
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingTaskId(null)}
                          >
                            ביטול
                          </Button>
                        </div>
                      </div>
                    ) : (
                      /* Task display */
                      <div className="flex items-start gap-2">
                        <div className="flex gap-1 flex-shrink-0">
                          {!t.is_locked && (
                            <>
                              <button
                                onClick={() => startEdit(t)}
                                className="p-1 rounded hover:bg-gray-200 transition-colors"
                                aria-label="ערוך משימה"
                              >
                                <Pencil className="w-3.5 h-3.5 text-gray-400" />
                              </button>
                              <button
                                onClick={() => handleDeleteTask(t.id)}
                                disabled={isDeleting}
                                className="p-1 rounded hover:bg-red-100 transition-colors disabled:opacity-40"
                                aria-label="מחק משימה"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                              </button>
                            </>
                          )}
                        </div>
                        <div className="flex items-start justify-between gap-2 flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <Badge variant={priorityColors[t.priority]}>
                              {priorityLabels[t.priority] ?? t.priority}
                            </Badge>
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
                          </div>
                          <div className="flex-1 min-w-0 text-right">
                            <p
                              className={`font-medium ${
                                t.status === "done"
                                  ? "text-green-700 line-through"
                                  : "text-gray-900"
                              }`}
                            >
                              {t.title}
                            </p>
                            {t.description && (
                              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                                {t.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Delete session */}
        <div className="border-t border-gray-100 pt-4">
          <button
            onClick={() => onRequestDelete(session)}
            className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            מחק פגישה זו (וכל המשימות הקשורות)
          </button>
        </div>
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
  const router = useRouter();
  const [allSessions, setAllSessions] = useState<Session[]>([]);
  const [taskCount, setTaskCount] = useState(0);
  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [sessionLimit, setSessionLimit] = useState<5 | 10>(5);
  const [showCalendar, setShowCalendar] = useState(false);
  const [confirmDeleteSession, setConfirmDeleteSession] = useState<Session | null>(null);
  const [deletingSession, setDeletingSession] = useState(false);
  const [deleteSessionError, setDeleteSessionError] = useState<string | null>(null);

  useEffect(() => {
    if (orgLoading) return;
    if (currentRole === "participant") {
      router.replace("/dashboard/participant");
    }
  }, [orgLoading, currentRole, router]);

  const loadStats = useCallback(async () => {
    if (!currentOrg) return;

    const [sessionRes, taskRes] = await Promise.all([
      supabase
        .from("sessions")
        .select("*")
        .eq("org_id", currentOrg.id)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("tasks")
        .select("id", { count: "exact" })
        .eq("org_id", currentOrg.id),
    ]);

    if (sessionRes.data) setAllSessions(sessionRes.data as Session[]);
    if (taskRes.count !== null) setTaskCount(taskRes.count);
  }, [supabase, currentOrg]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

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

  const displayedSessions = allSessions.slice(0, sessionLimit);

  if (orgLoading || currentRole === "participant") return null;

  const token = session?.access_token || "";

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">לוח בקרה</h1>
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

      {/* Recent Sessions */}
      {allSessions.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {/* Calendar button */}
              <button
                onClick={() => setShowCalendar(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm text-gray-600 transition-colors"
                aria-label="פתח לוח שנה"
              >
                <CalendarDays className="w-4 h-4" />
                לוח שנה
              </button>

              {/* Limit toggle */}
              <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
                {([5, 10] as const).map((n) => (
                  <button
                    key={n}
                    onClick={() => setSessionLimit(n)}
                    className={`px-3 py-1.5 transition-colors ${
                      sessionLimit === n
                        ? "bg-indigo-600 text-white"
                        : "bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {n} אחרונות
                  </button>
                ))}
              </div>
            </div>
            <CardTitle>פגישות אחרונות</CardTitle>
          </div>

          <div className="space-y-3">
            {displayedSessions.map((s) => (
              <div key={s.id} className="group relative">
                <button
                  onClick={() => setSelectedSession(s)}
                  className="w-full text-right p-3 rounded-lg bg-gray-50 border border-gray-100
                    hover:bg-indigo-50 hover:border-indigo-200 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-400">
                      {new Date(s.created_at).toLocaleDateString("he-IL")}
                    </span>
                    <h4 className="text-sm font-medium text-gray-900 group-hover:text-indigo-700">
                      {s.title || "פגישה ללא שם"}
                    </h4>
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-2 text-right">{s.summary}</p>
                  <p className="text-xs text-indigo-400 mt-1 text-left opacity-0 group-hover:opacity-100 transition-opacity">
                    ← לחץ לפרטים
                  </p>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDeleteSession(s);
                    setDeleteSessionError(null);
                  }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-100 transition-all"
                  aria-label="מחק פגישה"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Tasks */}
      <TaskList />

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
