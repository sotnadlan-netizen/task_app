"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/providers/supabase-provider";
import { useOrganization } from "@/providers/organization-provider";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { api } from "@/lib/api";
import type { Session, Task, OrgMembership, Profile, Project } from "@/types";
import { Users, Pencil, Trash2, Plus, FolderOpen } from "lucide-react";

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

const priorityColors: Record<string, "default" | "info" | "warning" | "danger"> = {
  low: "default",
  medium: "info",
  high: "warning",
  critical: "danger",
};

export function SessionDetailModal({
  session,
  token,
  onClose,
  onRequestDelete,
  onSessionUpdate,
}: {
  session: Session;
  token: string;
  onClose: () => void;
  onRequestDelete: (s: Session) => void;
  onSessionUpdate?: (updated: Partial<Session> & { id: string }) => void;
}) {
  const { supabase } = useSupabase();
  const { currentOrg } = useOrganization();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Task edit / add state
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: "", description: "", priority: "medium", status: "todo" });
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTaskForm, setNewTaskForm] = useState({ title: "", description: "", priority: "medium" });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

  // Meeting edit state
  const [showEditMeeting, setShowEditMeeting] = useState(false);
  const [editProjectId, setEditProjectId] = useState<string>(session.project_id ?? "");
  const [newProjectName, setNewProjectName] = useState("");
  const [showNewProject, setShowNewProject] = useState(false);
  const [editParticipantIds, setEditParticipantIds] = useState<string[]>(session.participant_ids ?? []);
  const [savingMeeting, setSavingMeeting] = useState(false);
  const [meetingError, setMeetingError] = useState<string | null>(null);

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

      try {
        const projs = await api.getProjects(session.org_id, token);
        setProjects(projs);
      } catch {
        // non-critical
      }
    }
    load();
  }, [supabase, currentOrg, session, token]);

  // ── Meeting edit handlers ────────────────────────────────────────────────────
  const toggleParticipant = (userId: string) => {
    setEditParticipantIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSaveMeeting = async () => {
    setSavingMeeting(true);
    setMeetingError(null);
    try {
      let projectId = editProjectId;
      if (showNewProject && newProjectName.trim()) {
        const created = await api.createProject({ org_id: session.org_id, name: newProjectName.trim() }, token);
        projectId = created.id;
        setProjects((prev) => [...prev, created]);
        setNewProjectName("");
        setShowNewProject(false);
      }
      await api.updateSession(session.id, {
        project_id: projectId || undefined,
        participant_ids: editParticipantIds,
      }, token);
      setEditProjectId(projectId);
      setShowEditMeeting(false);
      onSessionUpdate?.({ id: session.id, project_id: projectId || null, participant_ids: editParticipantIds });
    } catch (err) {
      setMeetingError(err instanceof Error ? err.message : "שגיאה בשמירה");
    } finally {
      setSavingMeeting(false);
    }
  };

  // ── Task handlers ────────────────────────────────────────────────────────────
  const startEdit = (t: Task) => {
    setEditingTaskId(t.id);
    setEditForm({ title: t.title, description: t.description || "", priority: t.priority, status: t.status });
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

  const durationMin = Math.round((session.duration_seconds ?? 0) / 60);
  const currentProjectName = projects.find((p) => p.id === (editProjectId || session.project_id))?.name;

  return (
    <Modal open onClose={onClose} title={session.title || "פרטי פגישה"}>
      <div className="space-y-5 max-h-[80vh] overflow-y-auto pr-1" dir="rtl">

        {/* Meta */}
        <div className="flex items-center gap-3 text-xs text-gray-500 flex-row-reverse justify-end">
          <span>{new Date(session.created_at).toLocaleString("he-IL")}</span>
          {durationMin > 0 && <span>· {durationMin} דק׳</span>}
          {session.sentiment && <span className="capitalize">· {session.sentiment}</span>}
        </div>

        {/* Summary */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-1">סיכום</h3>
          <p className="text-sm text-gray-600 leading-relaxed">{session.summary || "אין סיכום זמין."}</p>
        </div>

        {/* ── Project + Participants + Edit ──────────────────────────────── */}
        <div className="space-y-3">
          {/* Header row: current project + edit button */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => { setShowEditMeeting((v) => !v); setMeetingError(null); }}
              className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              ערוך פגישה
            </button>
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <FolderOpen className="w-4 h-4 text-gray-400" />
              {currentProjectName ?? "ללא פרויקט"}
            </div>
          </div>

          {/* Participants chips */}
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Users className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-semibold text-gray-700">משתתפים בפגישה</span>
            </div>
            {loading ? (
              <p className="text-xs text-gray-400 animate-pulse">טוען...</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {members
                  .filter((m) => editParticipantIds.length > 0 ? editParticipantIds.includes(m.user_id ?? "") : true)
                  .map((m) => {
                    const label = m.profile?.full_name || m.profile?.email || m.invited_email || "לא ידוע";
                    return (
                      <div key={m.id} className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-full text-xs text-gray-700">
                        <div className="w-5 h-5 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-semibold text-[10px]">
                          {label.charAt(0).toUpperCase()}
                        </div>
                        <span>{label}</span>
                        <span className="text-gray-400">
                          ({m.role === "admin" ? "מנהל" : m.role === "member" ? "חבר" : "משתתף"})
                        </span>
                      </div>
                    );
                  })}
                {editParticipantIds.length === 0 && !loading && (
                  <p className="text-xs text-gray-400">לא נבחרו משתתפים</p>
                )}
              </div>
            )}
          </div>

          {/* Edit panel */}
          {showEditMeeting && (
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg space-y-3">
              {meetingError && <Alert variant="error">{meetingError}</Alert>}

              {/* Project selector */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">פרויקט</label>
                {!showNewProject ? (
                  <div className="flex gap-2">
                    <select
                      value={editProjectId}
                      onChange={(e) => setEditProjectId(e.target.value)}
                      className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">ללא פרויקט</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => setShowNewProject(true)}
                      className="text-xs text-indigo-600 hover:text-indigo-800 whitespace-nowrap"
                    >
                      + חדש
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="שם פרויקט חדש"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      onClick={() => setShowNewProject(false)}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      ביטול
                    </button>
                  </div>
                )}
              </div>

              {/* Participants multi-select */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">משתתפים</label>
                <div className="max-h-36 overflow-y-auto space-y-1 border border-gray-200 rounded-lg p-2 bg-white">
                  {members.map((m) => {
                    const uid = m.user_id ?? "";
                    const checked = editParticipantIds.includes(uid);
                    const label = m.profile?.full_name || m.profile?.email || m.invited_email || "לא ידוע";
                    return (
                      <label
                        key={m.id}
                        className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleParticipant(uid)}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="flex-1">{label}</span>
                        <span className="text-xs text-gray-400">
                          {m.role === "admin" ? "מנהל" : m.role === "member" ? "חבר" : "משתתף"}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveMeeting} loading={savingMeeting}>
                  שמור שינויים
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setShowEditMeeting(false); setMeetingError(null); }}>
                  ביטול
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* ── Tasks ─────────────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => { setShowAddForm(!showAddForm); setFormError(null); }}
              className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              הוסף משימה
            </button>
            <h3 className="text-sm font-semibold text-gray-700">משימות ({tasks.length})</h3>
          </div>

          {formError && <Alert variant="error" className="mb-2">{formError}</Alert>}

          {/* Add form */}
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
                      t.status === "done" ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    {isEditing ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editForm.title}
                          onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                        <textarea
                          value={editForm.description}
                          onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                          rows={2}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 resize-none"
                        />
                        <div className="flex gap-2">
                          <select
                            value={editForm.priority}
                            onChange={(e) => setEditForm((f) => ({ ...f, priority: e.target.value }))}
                            className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="low">נמוכה</option>
                            <option value="medium">בינונית</option>
                            <option value="high">גבוהה</option>
                            <option value="critical">קריטית</option>
                          </select>
                          <select
                            value={editForm.status}
                            onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                            className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="todo">לביצוע</option>
                            <option value="in_progress">בתהליך</option>
                            <option value="done">הושלם</option>
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleSaveEdit} loading={saving}>שמור</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingTaskId(null)}>ביטול</Button>
                        </div>
                      </div>
                    ) : (
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
                            <Badge variant={t.status === "done" ? "success" : t.status === "in_progress" ? "info" : "default"}>
                              {statusLabels[t.status] ?? t.status}
                            </Badge>
                          </div>
                          <div className="flex-1 min-w-0 text-right">
                            <p className={`font-medium ${t.status === "done" ? "text-green-700 line-through" : "text-gray-900"}`}>
                              {t.title}
                            </p>
                            {t.description && (
                              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{t.description}</p>
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

        {/* ── Delete session ─────────────────────────────────────────────── */}
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
