"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/providers/supabase-provider";
import { useOrganization } from "@/providers/organization-provider";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { api } from "@/lib/api";
import { useLanguage } from "@/providers/language-provider";
import type { Session, Task, OrgMembership, Profile, Project } from "@/types";
import { buildGoogleCalendarUrl } from "@/lib/calendar-url";
import { Users, Pencil, Trash2, Plus, FolderOpen, CalendarPlus } from "lucide-react";

interface MemberWithProfile extends OrgMembership {
  profile: Profile | undefined;
}

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
  const { t } = useLanguage();

  const priorityLabels: Record<string, string> = {
    low: t("tasks.priorityLow"),
    medium: t("tasks.priorityMedium"),
    high: t("tasks.priorityHigh"),
    critical: t("tasks.priorityCritical"),
  };
  const statusLabels: Record<string, string> = {
    todo: t("tasks.statusTodo"),
    in_progress: t("tasks.statusInProgress"),
    done: t("tasks.statusDone"),
  };

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
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(new Set());
  const [togglingTaskId, setTogglingTaskId] = useState<string | null>(null);

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
  const [inviteEmail, setInviteEmail] = useState("");
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
      setMeetingError(err instanceof Error ? err.message : t("tasks.errSave"));
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
      setMembers((prev) => [...prev, { ...newMember, profile: undefined }]);
      // Use membership ID — always available regardless of login status
      setEditParticipantIds((prev) => [...prev, newMember.id]);
      setInviteSuccess(emailToInvite);
      setParticipantSearch("");
    } catch (err) {
      setMeetingError(err instanceof Error ? err.message : t("sessionDetail.errAddParticipant"));
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
      setFormError(err instanceof Error ? err.message : t("tasks.errSave"));
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
      setFormError(err instanceof Error ? err.message : t("tasks.errCreate"));
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
      setFormError(err instanceof Error ? err.message : t("tasks.errDelete"));
    } finally {
      setDeletingTaskId(null);
    }
  };

  const toggleExpanded = (taskId: string) => {
    setExpandedTaskIds((prev) => {
      const next = new Set(prev);
      next.has(taskId) ? next.delete(taskId) : next.add(taskId);
      return next;
    });
  };

  const handleToggleDone = async (t: Task) => {
    if (t.is_locked || togglingTaskId) return;
    const newStatus = t.status === "done" ? "todo" : "done";
    setTogglingTaskId(t.id);
    try {
      const updated = await api.updateTask(t.id, { status: newStatus }, token) as Task;
      setTasks((prev) => prev.map((task) => (task.id === t.id ? { ...task, ...updated } : task)));
    } catch {
      // silently ignore — status badge still shows truth
    } finally {
      setTogglingTaskId(null);
    }
  };

  const durationMin = Math.round((session.duration_seconds ?? 0) / 60);
  const currentProjectName = projects.find((p) => p.id === (editProjectId || session.project_id))?.name;

  return (
    <Modal open onClose={onClose} title={session.title || t("sessionDetail.fallbackTitle")}>
      <div className="space-y-5 max-h-[80vh] overflow-y-auto pe-1">

        {/* Meta */}
        <div className="flex items-center gap-3 text-xs text-gray-500 justify-start">
          <span>{new Date(session.created_at).toLocaleString()}</span>
          {durationMin > 0 && <span>· {t("meetings.durationMin", { count: durationMin })}</span>}
          {session.sentiment && <span className="capitalize">· {session.sentiment}</span>}
        </div>

        {/* Summary */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-1">{t("sessionDetail.summary")}</h3>
          <p className="text-sm text-gray-600 leading-relaxed">{session.summary || t("sessionDetail.noSummary")}</p>
        </div>

        {/* Calendar Event */}
        {session.calendar_event?.is_detected && (
          <div className="flex justify-end">
            <a
              href={buildGoogleCalendarUrl(session.calendar_event)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded bg-[#0070d2] hover:bg-[#005fb2] text-white text-sm font-medium transition-all shadow-sm"
            >
              <CalendarPlus className="w-4 h-4 flex-shrink-0" />
              {t("sessionDetail.addToGoogleCalendar")}
            </a>
          </div>
        )}

        {/* ── Project ──────────────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <button
              onClick={() => { setShowEditProject((v) => !v); setMeetingError(null); }}
              className="text-xs text-[#0070d2] hover:text-[#005fb2] font-medium transition-colors"
            >
              {t("sessionDetail.editProject")}
            </button>
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <FolderOpen className="w-4 h-4 text-gray-400" />
              {currentProjectName ?? t("recording.noProject")}
            </div>
          </div>

          {showEditProject && (
            <div className="p-3 bg-[#fafaf9] border border-[#dddbda] rounded space-y-2">
              {meetingError && <Alert variant="error">{meetingError}</Alert>}
              {!showNewProject ? (
                <div className="flex gap-2">
                  <select
                    value={editProjectId}
                    onChange={(e) => setEditProjectId(e.target.value)}
                    className="flex-1 px-2 py-1.5 text-sm border border-[#dddbda] rounded focus:ring-2 focus:ring-[#0070d2]/30 bg-white"
                  >
                    <option value="">{t("recording.noProject")}</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setShowNewProject(true)}
                    className="text-xs text-[#0070d2] hover:text-[#005fb2] whitespace-nowrap"
                  >
                    {t("sessionDetail.newShort")}
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={t("recording.newProjectName")}
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    className="flex-1 px-2 py-1.5 text-sm border border-[#dddbda] rounded focus:ring-2 focus:ring-[#0070d2]/30 bg-white"
                  />
                  <button
                    onClick={() => setShowNewProject(false)}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    {t("common.cancel")}
                  </button>
                </div>
              )}
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveMeeting} loading={savingMeeting}>{t("common.save")}</Button>
                <Button size="sm" variant="ghost" onClick={() => { setShowEditProject(false); setMeetingError(null); }}>{t("common.cancel")}</Button>
              </div>
            </div>
          )}
        </div>

        {/* ── Participants ─────────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <button
              onClick={() => { setShowEditParticipants((v) => !v); setMeetingError(null); }}
              className="text-xs text-[#0070d2] hover:text-[#005fb2] font-medium transition-colors"
            >
              {t("sessionDetail.editParticipants")}
            </button>
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-semibold text-gray-700">{t("sessionDetail.participantsInMeeting")}</span>
            </div>
          </div>

          {loading ? (
            <p className="text-xs text-gray-400 animate-pulse">{t("common.loading")}</p>
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
                  const label = m.profile?.full_name || m.profile?.email || m.invited_email || t("recording.unknown");
                  const roleLabel = isCreator ? t("sessionDetail.creator") : t(`roles.${m.role}`);
                  return (
                    <div key={m.id} className="flex items-center gap-1.5 px-2.5 py-1 bg-[#ecf5fe] rounded-full text-xs text-[#3e3e3c] border border-[#b3d9f6]">
                      <div className="w-5 h-5 bg-gradient-to-br from-[#1ab9ff] to-[#0070d2] text-white rounded-full flex items-center justify-center font-semibold text-[10px]">
                        {label.charAt(0).toUpperCase()}
                      </div>
                      <span>{label}</span>
                      <span className="text-gray-400">({roleLabel})</span>
                    </div>
                  );
                })}
                {allDisplayed.length === 0 && (
                  <p className="text-xs text-gray-400">{t("sessionDetail.noParticipants")}</p>
                )}
              </div>
            );
          })()}

          {showEditParticipants && (
            <div className="p-3 bg-[#fafaf9] border border-[#dddbda] rounded space-y-2">
              {meetingError && <Alert variant="error">{meetingError}</Alert>}
              {inviteSuccess && (
                <p className="text-xs text-green-600">{t("sessionDetail.addedSuccess", { email: inviteSuccess })}</p>
              )}

              {/* Search / filter input */}
              <input
                type="text"
                placeholder={t("sessionDetail.searchPlaceholder")}
                value={participantSearch}
                onChange={(e) => { setParticipantSearch(e.target.value); setInviteSuccess(null); }}
                className="w-full px-2.5 py-1.5 text-sm border border-[#dddbda] rounded focus:ring-2 focus:ring-[#0070d2]/30 bg-white"
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
                      <div className="max-h-40 overflow-y-auto space-y-0.5 border border-[#dddbda] rounded p-2 bg-white">
                        {filtered.map((m) => {
                          const checked = editParticipantIds.includes(m.id);
                          const label = m.profile?.full_name || m.profile?.email || m.invited_email || t("recording.unknown");
                          const roleLabel = t(`roles.${m.role}`);
                          return (
                            <label
                              key={m.id}
                              className="flex items-center gap-2 cursor-pointer hover:bg-[#fafaf9] px-1 py-1 rounded text-sm"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleParticipant(m.id)}
                                className="rounded border-[#dddbda] text-[#0070d2] focus:ring-[#0070d2]"
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
                        className="w-full text-start px-2.5 py-1.5 text-sm rounded bg-white border border-dashed border-[#b3d9f6] text-[#0070d2] hover:bg-[#ecf5fe] transition-colors disabled:opacity-50"
                      >
                        {inviting ? t("sessionDetail.adding") : t("sessionDetail.addAsNew", { name: participantSearch.trim() })}
                      </button>
                    )}

                    {filtered.length === 0 && !isEmailInput && (
                      <p className="text-xs text-gray-400 text-center py-1">{t("sessionDetail.notFound")}</p>
                    )}
                  </>
                );
              })()}

              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={handleSaveMeeting} loading={savingMeeting}>{t("common.save")}</Button>
                <Button size="sm" variant="ghost" onClick={() => { setShowEditParticipants(false); setMeetingError(null); setParticipantSearch(""); setInviteSuccess(null); }}>{t("common.cancel")}</Button>
              </div>
            </div>
          )}
        </div>

        {/* ── Tasks ─────────────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => { setShowAddForm(!showAddForm); setFormError(null); }}
              className="flex items-center gap-1 text-xs text-[#0070d2] hover:text-[#005fb2] font-medium transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              {t("tasks.add")}
            </button>
            <h3 className="text-sm font-semibold text-gray-700">{t("sessionDetail.tasksCount", { count: tasks.length })}</h3>
          </div>

          {formError && <Alert variant="error" className="mb-2">{formError}</Alert>}

          {/* Add form */}
          {showAddForm && (
            <div className="mb-3 p-3 bg-[#fafaf9] border border-[#dddbda] rounded space-y-2">
              <input
                type="text"
                placeholder={t("tasks.titlePlaceholder")}
                value={newTaskForm.title}
                onChange={(e) => setNewTaskForm((f) => ({ ...f, title: e.target.value }))}
                className="w-full px-3 py-1.5 text-sm border border-[#dddbda] rounded focus:ring-2 focus:ring-[#0070d2]/30 focus:border-transparent bg-white"
              />
              <textarea
                placeholder={t("tasks.descPlaceholder")}
                value={newTaskForm.description}
                onChange={(e) => setNewTaskForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
                className="w-full px-3 py-1.5 text-sm border border-[#dddbda] rounded focus:ring-2 focus:ring-[#0070d2]/30 focus:border-transparent resize-none bg-white"
              />
              <div className="flex items-center gap-2">
                <select
                  value={newTaskForm.priority}
                  onChange={(e) => setNewTaskForm((f) => ({ ...f, priority: e.target.value }))}
                  className="flex-1 px-2 py-1.5 text-sm border border-[#dddbda] rounded focus:ring-2 focus:ring-[#0070d2]/30 bg-white"
                >
                  <option value="low">{t("tasks.priorityLow")}</option>
                  <option value="medium">{t("tasks.priorityMedium")}</option>
                  <option value="high">{t("tasks.priorityHigh")}</option>
                  <option value="critical">{t("tasks.priorityCritical")}</option>
                </select>
                <Button size="sm" onClick={handleAddTask} loading={saving} disabled={!newTaskForm.title.trim()}>
                  {t("common.create")}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowAddForm(false)}>
                  {t("common.cancel")}
                </Button>
              </div>
            </div>
          )}

          {loading ? (
            <p className="text-xs text-gray-400 animate-pulse">{t("common.loading")}</p>
          ) : tasks.length === 0 ? (
            <p className="text-sm text-gray-400">{t("sessionDetail.noTasksFromSession")}</p>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => {
                const isEditing = editingTaskId === task.id;
                const isDeleting = deletingTaskId === task.id;
                return (
                  <div
                    key={task.id}
                    className={`p-3 rounded border text-sm ${
                      task.status === "done" ? "bg-[#ddf0d4]/40 border-[#a3d99b]" : "bg-white border-[#dddbda]"
                    }`}
                  >
                    {isEditing ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editForm.title}
                          onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                          className="w-full px-2 py-1.5 text-sm border border-[#dddbda] rounded focus:ring-2 focus:ring-[#0070d2]/30"
                        />
                        <textarea
                          value={editForm.description}
                          onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                          rows={2}
                          className="w-full px-2 py-1.5 text-sm border border-[#dddbda] rounded focus:ring-2 focus:ring-[#0070d2]/30 resize-none"
                        />
                        <div className="flex gap-2">
                          <select
                            value={editForm.priority}
                            onChange={(e) => setEditForm((f) => ({ ...f, priority: e.target.value }))}
                            className="flex-1 px-2 py-1 text-sm border border-[#dddbda] rounded focus:ring-2 focus:ring-[#0070d2]/30"
                          >
                            <option value="low">{t("tasks.priorityLow")}</option>
                            <option value="medium">{t("tasks.priorityMedium")}</option>
                            <option value="high">{t("tasks.priorityHigh")}</option>
                            <option value="critical">{t("tasks.priorityCritical")}</option>
                          </select>
                          <select
                            value={editForm.status}
                            onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                            className="flex-1 px-2 py-1 text-sm border border-[#dddbda] rounded focus:ring-2 focus:ring-[#0070d2]/30"
                          >
                            <option value="todo">{t("tasks.statusTodo")}</option>
                            <option value="in_progress">{t("tasks.statusInProgress")}</option>
                            <option value="done">{t("tasks.statusDone")}</option>
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleSaveEdit} loading={saving}>{t("common.save")}</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingTaskId(null)}>{t("common.cancel")}</Button>
                        </div>
                      </div>
                    ) : (() => {
                      const isExpanded = expandedTaskIds.has(task.id);
                      const isDone = task.status === "done";
                      const isToggling = togglingTaskId === task.id;
                      return (
                        <div className="flex items-start gap-3">
                          {/* Checkbox */}
                          <button
                            onClick={() => handleToggleDone(task)}
                            disabled={task.is_locked || isToggling}
                            className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                              isDone
                                ? "bg-emerald-500 border-emerald-500"
                                : "border-gray-300 hover:border-[#0070d2]"
                            } disabled:opacity-40`}
                            aria-label={isDone ? t("tasks.markIncomplete") : t("tasks.markComplete")}
                          >
                            {isDone && (
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12">
                                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </button>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            {/* Title row — clickable to expand */}
                            <button
                              onClick={() => toggleExpanded(task.id)}
                              className="w-full text-start flex items-start justify-between gap-2 group"
                            >
                              <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
                                <Badge variant={priorityColors[task.priority]}>
                                  {priorityLabels[task.priority] ?? task.priority}
                                </Badge>
                              </div>
                              <span className={`flex-1 text-sm font-medium text-start leading-snug ${
                                isDone ? "line-through text-gray-400" : "text-gray-900"
                              }`}>
                                {task.title}
                              </span>
                            </button>

                            {/* Expanded detail */}
                            {isExpanded && (
                              <div className="mt-2 space-y-2 text-start">
                                {task.description && (
                                  <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 rounded-lg px-3 py-2">
                                    {task.description}
                                  </p>
                                )}
                                {task.deadline && (
                                  <p className="text-xs text-[#0070d2] font-medium">⏰ {task.deadline}</p>
                                )}
                                <div className="flex items-center justify-between gap-2 pt-1">
                                  <div className="flex gap-1">
                                    {!task.is_locked && (
                                      <>
                                        <button
                                          onClick={() => startEdit(task)}
                                          className="p-1 rounded hover:bg-[#f3f3f3] transition-colors"
                                          aria-label={t("tasks.editAria")}
                                        >
                                          <Pencil className="w-3.5 h-3.5 text-[#706e6b]" />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteTask(task.id)}
                                          disabled={isDeleting}
                                          className="p-1 rounded hover:bg-[#fde9e7] transition-colors disabled:opacity-40"
                                          aria-label={t("tasks.deleteAria")}
                                        >
                                          <Trash2 className="w-3.5 h-3.5 text-[#c23934]" />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                  <Badge variant={task.status === "done" ? "success" : task.status === "in_progress" ? "info" : "default"}>
                                    {statusLabels[task.status] ?? task.status}
                                  </Badge>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Delete session ─────────────────────────────────────────────── */}
        <div className="border-t border-[#dddbda] pt-4">
          <button
            onClick={() => onRequestDelete(session)}
            className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600 font-medium transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {t("sessionDetail.deleteSession")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
