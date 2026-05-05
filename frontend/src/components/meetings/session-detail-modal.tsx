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
import { buildGoogleCalendarUrl } from "@/lib/calendar-url";
import { Users, Pencil, Trash2, Plus, FolderOpen, CalendarPlus } from "lucide-react";

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
  const [showEditProject, setShowEditProject] = useState(false);
  const [showEditParticipants, setShowEditParticipants] = useState(false);
  const [editProjectId, setEditProjectId] = useState<string>(session.project_id ?? "");
  const [newProjectName, setNewProjectName] = useState("");
  const [showNewProject, setShowNewProject] = useState(false);
  const [editParticipantIds, setEditParticipantIds] = useState<string[]>(session.participant_ids ?? []);
  const [savingMeeting, setSavingMeeting] = useState(false);
  const [meetingError, setMeetingError] = useState<string | null>(null);
  const [participantSearch, setParticipantSearch] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!currentOrg) return;
    async function load() {
      setLoading(true);
      const [taskRes] = await Promise.all([
        supabase
          .from("tasks")
          .select("*, assignee:profiles!tasks_assignee_id_fkey(*)")
          .eq("session_id", session.id)
          .order("created_at", { ascending: false }),
      ]);
      if (taskRes.data) setTasks(taskRes.data as Task[]);

      try {
        const [memberData, projs] = await Promise.all([
          api.getOrgMembers(session.org_id, token),
          api.getProjects(session.org_id, token),
        ]);
        setMembers(memberData as MemberWithProfile[]);
        setProjects(projs);
      } catch {
        // non-critical
      }
      setLoading(false);
    }
    load();
  }, [supabase, currentOrg, session, token]);

  // ── Meeting edit handlers ────────────────────────────────────────────────────
  const toggleParticipant = (membershipId: string) => {
    setEditParticipantIds((prev) =>
      prev.includes(membershipId) ? prev.filter((id) => id !== membershipId) : [...prev, membershipId]
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
      setShowEditProject(false);
      setShowEditParticipants(false);
      onSessionUpdate?.({ id: session.id, project_id: projectId || null, participant_ids: editParticipantIds });
    } catch (err) {
      setMeetingError(err instanceof Error ? err.message : "שגיאה בשמירה");
    } finally {
      setSavingMeeting(false);
    }
  };

  const handleInviteParticipant = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteSuccess(null);
    setMeetingError(null);
    try {
      const emailToInvite = participantSearch.trim();
      const newMember = await api.addOrgMember(
        session.org_id,
        { email: emailToInvite, role: "participant" },
        token
      ) as OrgMembership;
      setMembers((prev) => [...prev, { ...newMember, profile: null }]);
      // Use membership ID — always available regardless of login status
      setEditParticipantIds((prev) => [...prev, newMember.id]);
      setInviteSuccess(emailToInvite);
      setParticipantSearch("");
    } catch (err) {
      setMeetingError(err instanceof Error ? err.message : "שגיאה בהוספת משתתף");
    } finally {
      setInviting(false);
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

        {/* Calendar Event */}
        {session.calendar_event?.is_detected && (
          <div className="flex justify-end">
            <a
              href={buildGoogleCalendarUrl(session.calendar_event)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-br from-violet-400 to-pink-400 hover:scale-105 text-white text-sm font-medium transition-all shadow-sm"
            >
              <CalendarPlus className="w-4 h-4 flex-shrink-0" />
              הוסף ליומן גוגל
            </a>
          </div>
        )}

        {/* ── Project ──────────────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <button
              onClick={() => { setShowEditProject((v) => !v); setMeetingError(null); }}
              className="text-xs text-violet-500 hover:text-violet-700 font-medium transition-colors"
            >
              ערוך פרויקט
            </button>
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <FolderOpen className="w-4 h-4 text-gray-400" />
              {currentProjectName ?? "ללא פרויקט"}
            </div>
          </div>

          {showEditProject && (
            <div className="p-3 bg-violet-50/60 border border-violet-100 rounded-2xl space-y-2">
              {meetingError && <Alert variant="error">{meetingError}</Alert>}
              {!showNewProject ? (
                <div className="flex gap-2">
                  <select
                    value={editProjectId}
                    onChange={(e) => setEditProjectId(e.target.value)}
                    className="flex-1 px-2 py-1.5 text-sm border border-violet-100 rounded-xl focus:ring-2 focus:ring-violet-200 bg-white/80"
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
                    className="flex-1 px-2 py-1.5 text-sm border border-violet-100 rounded-xl focus:ring-2 focus:ring-violet-200 bg-white/80"
                  />
                  <button
                    onClick={() => setShowNewProject(false)}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    ביטול
                  </button>
                </div>
              )}
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveMeeting} loading={savingMeeting}>שמור</Button>
                <Button size="sm" variant="ghost" onClick={() => { setShowEditProject(false); setMeetingError(null); }}>ביטול</Button>
              </div>
            </div>
          )}
        </div>

        {/* ── Participants ─────────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <button
              onClick={() => { setShowEditParticipants((v) => !v); setMeetingError(null); }}
              className="text-xs text-violet-500 hover:text-violet-700 font-medium transition-colors"
            >
              ערוך משתתפים
            </button>
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-semibold text-gray-700">משתתפים בפגישה</span>
            </div>
          </div>

          {loading ? (
            <p className="text-xs text-gray-400 animate-pulse">טוען...</p>
          ) : (() => {
            const creatorMember = members.find((m) => m.user_id === session.created_by);
            const taggedMembers = members.filter(
              (m) => editParticipantIds.includes(m.id) && m.user_id !== session.created_by
            );
            const allDisplayed = [
              ...(creatorMember ? [{ member: creatorMember, isCreator: true }] : []),
              ...taggedMembers.map((m) => ({ member: m, isCreator: false })),
            ];

            return (
              <div className="flex flex-wrap gap-2">
                {allDisplayed.map(({ member: m, isCreator }) => {
                  const label = m.profile?.full_name || m.profile?.email || m.invited_email || "לא ידוע";
                  const roleLabel = isCreator ? "יוצר" : m.role === "admin" ? "מנהל" : m.role === "member" ? "חבר" : "משתתף";
                  return (
                    <div key={m.id} className="flex items-center gap-1.5 px-2.5 py-1 bg-violet-50/60 rounded-full text-xs text-gray-600 border border-violet-100">
                      <div className="w-5 h-5 bg-gradient-to-br from-violet-300 to-pink-300 text-white rounded-full flex items-center justify-center font-semibold text-[10px]">
                        {label.charAt(0).toUpperCase()}
                      </div>
                      <span>{label}</span>
                      <span className="text-gray-400">({roleLabel})</span>
                    </div>
                  );
                })}
                {allDisplayed.length === 0 && (
                  <p className="text-xs text-gray-400">לא נבחרו משתתפים</p>
                )}
              </div>
            );
          })()}

          {showEditParticipants && (
            <div className="p-3 bg-violet-50/60 border border-violet-100 rounded-2xl space-y-2">
              {meetingError && <Alert variant="error">{meetingError}</Alert>}
              {inviteSuccess && (
                <p className="text-xs text-green-600">{inviteSuccess} נוסף בהצלחה</p>
              )}

              {/* Search / filter input */}
              <input
                type="text"
                placeholder="חפש לפי שם או אימייל..."
                value={participantSearch}
                onChange={(e) => { setParticipantSearch(e.target.value); setInviteSuccess(null); }}
                className="w-full px-2.5 py-1.5 text-sm border border-violet-100 rounded-2xl focus:ring-2 focus:ring-violet-200 bg-white/80"
              />

              {/* Results appear only when searching */}
              {participantSearch.trim() && (() => {
                const q = participantSearch.trim().toLowerCase();
                const filtered = members.filter((m) => {
                  const label = (m.profile?.full_name || m.profile?.email || m.invited_email || "").toLowerCase();
                  return label.includes(q);
                });
                const isEmailInput = q.includes("@");
                const exactMatch = members.some((m) =>
                  (m.profile?.email || m.invited_email || "").toLowerCase() === q
                );

                return (
                  <>
                    {filtered.length > 0 && (
                      <div className="max-h-40 overflow-y-auto space-y-0.5 border border-violet-100 rounded-2xl p-2 bg-white/80">
                        {filtered.map((m) => {
                          const checked = editParticipantIds.includes(m.id);
                          const label = m.profile?.full_name || m.profile?.email || m.invited_email || "לא ידוע";
                          const roleLabel = m.role === "admin" ? "מנהל" : m.role === "member" ? "חבר" : "משתתף";
                          return (
                            <label
                              key={m.id}
                              className="flex items-center gap-2 cursor-pointer hover:bg-violet-50/60 px-1 py-1 rounded-lg text-sm"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleParticipant(m.id)}
                                className="rounded border-violet-200 text-violet-500 focus:ring-violet-300"
                              />
                              <span className="flex-1">{label}</span>
                              <span className="text-xs text-gray-400">{roleLabel}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {isEmailInput && !exactMatch && (
                      <button
                        onClick={handleInviteParticipant}
                        disabled={inviting}
                        className="w-full text-right px-2.5 py-1.5 text-sm rounded-2xl bg-white/80 border border-dashed border-violet-200 text-violet-500 hover:bg-violet-50/60 transition-colors disabled:opacity-50"
                      >
                        {inviting ? "מוסיף..." : `+ הוסף "${participantSearch.trim()}" כמשתתף חדש`}
                      </button>
                    )}

                    {filtered.length === 0 && !isEmailInput && (
                      <p className="text-xs text-gray-400 text-center py-1">לא נמצאו. הקלד אימייל להוספה.</p>
                    )}
                  </>
                );
              })()}

              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={handleSaveMeeting} loading={savingMeeting}>שמור</Button>
                <Button size="sm" variant="ghost" onClick={() => { setShowEditParticipants(false); setMeetingError(null); setParticipantSearch(""); setInviteSuccess(null); }}>ביטול</Button>
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
            <div className="mb-3 p-3 bg-violet-50/60 border border-violet-100 rounded-2xl space-y-2">
              <input
                type="text"
                placeholder="כותרת המשימה *"
                value={newTaskForm.title}
                onChange={(e) => setNewTaskForm((f) => ({ ...f, title: e.target.value }))}
                className="w-full px-3 py-1.5 text-sm border border-violet-100 rounded-2xl focus:ring-2 focus:ring-violet-200 focus:border-transparent bg-white/80"
              />
              <textarea
                placeholder="תיאור (אופציונלי)"
                value={newTaskForm.description}
                onChange={(e) => setNewTaskForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
                className="w-full px-3 py-1.5 text-sm border border-violet-100 rounded-2xl focus:ring-2 focus:ring-violet-200 focus:border-transparent resize-none bg-white/80"
              />
              <div className="flex items-center gap-2">
                <select
                  value={newTaskForm.priority}
                  onChange={(e) => setNewTaskForm((f) => ({ ...f, priority: e.target.value }))}
                  className="flex-1 px-2 py-1.5 text-sm border border-violet-100 rounded-xl focus:ring-2 focus:ring-violet-200 bg-white/80"
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
                    className={`p-3 rounded-2xl border text-sm ${
                      t.status === "done" ? "bg-emerald-50/60 border-emerald-100" : "bg-white/60 border-violet-100"
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
                                className="p-1 rounded-lg hover:bg-violet-100/60 transition-colors"
                                aria-label="ערוך משימה"
                              >
                                <Pencil className="w-3.5 h-3.5 text-gray-400" />
                              </button>
                              <button
                                onClick={() => handleDeleteTask(t.id)}
                                disabled={isDeleting}
                                className="p-1 rounded-lg hover:bg-red-100/60 transition-colors disabled:opacity-40"
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
        <div className="border-t border-violet-50 pt-4">
          <button
            onClick={() => onRequestDelete(session)}
            className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600 font-medium transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            מחק פגישה זו (וכל המשימות הקשורות)
          </button>
        </div>
      </div>
    </Modal>
  );
}
