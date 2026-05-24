"use client";

import { useEffect, useState, useCallback } from "react";
import { useSupabase } from "@/providers/supabase-provider";
import { useOrganization } from "@/providers/organization-provider";
import { useRealtime } from "@/providers/realtime-provider";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { TaskEditRequestForm } from "./task-edit-request-form";
import { api } from "@/lib/api";
import { useLanguage } from "@/providers/language-provider";
import type { Task } from "@/types";
import {
  Lock,
  ExternalLink,
  Pencil,
  CheckCircle2,
  Circle,
  Trash2,
  Plus,
  X,
} from "lucide-react";

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
  const [projects, setProjects] = useState<Record<string, string>>({}); // id -> name
  const [projectFilter, setProjectFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [editRequestTaskId, setEditRequestTaskId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Inline edit state
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    priority: "medium",
    status: "todo",
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Add task state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTaskForm, setNewTaskForm] = useState({ title: "", description: "", priority: "medium" });

  // Delete state
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const token = session?.access_token || "";

  const loadTasks = useCallback(async () => {
    if (!currentOrg) return;
    setLoading(true);
    const [taskRes, projRes] = await Promise.all([
      supabase
        .from("tasks")
        .select("*, assignee:profiles!tasks_assignee_id_fkey(*)")
        .eq("org_id", currentOrg.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("projects")
        .select("id, name")
        .eq("org_id", currentOrg.id),
    ]);

    if (taskRes.data) setTasks(taskRes.data as Task[]);
    if (projRes.data) {
      const map: Record<string, string> = {};
      (projRes.data as { id: string; name: string }[]).forEach((p) => { map[p.id] = p.name; });
      setProjects(map);
    }
    setLoading(false);
  }, [supabase, currentOrg]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    const unsub = subscribe("tasks", () => {
      loadTasks();
    });
    return unsub;
  }, [subscribe, loadTasks]);

  const handleToggleDone = async (task: Task) => {
    if (task.is_locked) return;
    setTogglingId(task.id);
    const newStatus = task.status === "done" ? "todo" : "done";
    try {
      await api.updateTask(task.id, { status: newStatus }, token);
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
      );
    } catch {
      // silently fail — task remains unchanged
    }
    setTogglingId(null);
  };

  const startEdit = (task: Task) => {
    setEditingTaskId(task.id);
    setEditForm({
      title: task.title,
      description: task.description || "",
      priority: task.priority,
      status: task.status,
    });
    setFormError(null);
    setEditRequestTaskId(null);
    setConfirmDeleteId(null);
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
    setFormError(null);
    try {
      await api.deleteTask(taskId, token);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      setConfirmDeleteId(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t("tasks.errDelete"));
    } finally {
      setDeletingTaskId(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-12">
          <div className="animate-pulse text-sm text-gray-400">{t("tasks.loading")}</div>
        </div>
      </Card>
    );
  }

  return (
    <Card padding={false}>
      <div className="p-6 pb-0">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>{t("tasks.title")}</CardTitle>
            <Badge>{tasks.length}</Badge>
          </div>
          {!readonly && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setShowAddForm(!showAddForm);
                setFormError(null);
                setEditingTaskId(null);
              }}
            >
              <Plus className="w-4 h-4 me-1" />
              {t("tasks.add")}
            </Button>
          )}
        </CardHeader>
      </div>

      {formError && (
        <div className="px-6 pt-3">
          <Alert variant="error">{formError}</Alert>
        </div>
      )}

      {/* Add task form */}
      {!readonly && showAddForm && (
        <div className="mx-6 mt-3 p-3 bg-[#fafaf9] border border-[#dddbda] rounded space-y-2">
          <div className="flex items-center justify-between mb-1">
            <button onClick={() => setShowAddForm(false)} className="p-1 hover:bg-[#dddbda]/60 rounded">
              <X className="w-4 h-4 text-[#706e6b]" />
            </button>
            <p className="text-xs font-semibold text-[#0070d2]">{t("tasks.newTask")}</p>
          </div>
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
            className="w-full px-3 py-1.5 text-sm border border-[#dddbda] rounded focus:ring-2 focus:ring-[#0070d2]/30 resize-none bg-white"
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
          </div>
        </div>
      )}

      {Object.keys(projects).length > 0 && (
        <div className="px-6 pb-0 pt-2">
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded border border-[#dddbda] text-xs text-[#706e6b] bg-white focus:ring-2 focus:ring-[#0070d2]/30 focus:border-transparent"
          >
            <option value="">{t("tasks.allProjects")}</option>
            {Object.entries(projects).map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        </div>
      )}

      {(() => {
        const filtered = projectFilter ? tasks.filter((t) => t.project_id === projectFilter) : tasks;
        return filtered.length === 0 ? (
        <div className="px-6 pb-6 text-center text-sm text-gray-500 py-8">
          {projectFilter ? t("tasks.emptyInProject") : t("tasks.emptyHint")}
        </div>
      ) : (
        <div className="divide-y divide-[#dddbda] mt-3">
          {filtered.map((task) => {
            const isDone = task.status === "done";
            const isEditing = editingTaskId === task.id;
            const isConfirmingDelete = confirmDeleteId === task.id;
            const isDeleting = deletingTaskId === task.id;

            return (
              <div
                key={task.id}
                className={`px-6 py-4 transition-colors ${
                  isDone ? "bg-[#ddf0d4]/40 hover:bg-[#ddf0d4]/70" : "hover:bg-[#fafaf9]"
                }`}
              >
                {isEditing ? (
                  /* Inline edit form */
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editForm.title}
                      onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                      className="w-full px-3 py-1.5 text-sm border border-[#dddbda] rounded focus:ring-2 focus:ring-[#0070d2]/30 bg-white"
                    />
                    <textarea
                      value={editForm.description}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, description: e.target.value }))
                      }
                      rows={2}
                      className="w-full px-3 py-1.5 text-sm border border-[#dddbda] rounded focus:ring-2 focus:ring-[#0070d2]/30 resize-none bg-white"
                    />
                    <div className="flex gap-2">
                      <select
                        value={editForm.priority}
                        onChange={(e) => setEditForm((f) => ({ ...f, priority: e.target.value }))}
                        className="flex-1 px-2 py-1.5 text-sm border border-[#dddbda] rounded focus:ring-2 focus:ring-[#0070d2]/30 bg-white"
                      >
                        <option value="low">{t("tasks.priorityLow")}</option>
                        <option value="medium">{t("tasks.priorityMedium")}</option>
                        <option value="high">{t("tasks.priorityHigh")}</option>
                        <option value="critical">{t("tasks.priorityCritical")}</option>
                      </select>
                      <select
                        value={editForm.status}
                        onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                        className="flex-1 px-2 py-1.5 text-sm border border-[#dddbda] rounded focus:ring-2 focus:ring-[#0070d2]/30 bg-white"
                      >
                        <option value="todo">{t("tasks.statusTodo")}</option>
                        <option value="in_progress">{t("tasks.statusInProgress")}</option>
                        <option value="done">{t("tasks.statusDone")}</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveEdit} loading={saving}>
                        {t("common.save")}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingTaskId(null)}>
                        {t("common.cancel")}
                      </Button>
                    </div>
                  </div>
                ) : isConfirmingDelete ? (
                  /* Delete confirmation */
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setConfirmDeleteId(null)}
                      >
                        {t("common.cancel")}
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleDeleteTask(task.id)}
                        loading={isDeleting}
                      >
                        {t("common.delete")}
                      </Button>
                    </div>
                    <p className="text-sm text-gray-700">
                      {t("tasks.confirmDelete", { title: task.title })}
                    </p>
                  </div>
                ) : (
                  /* Normal task row */
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Badge variant={priorityColors[task.priority]}>
                        {priorityLabels[task.priority] ?? task.priority}
                      </Badge>
                      <Badge
                        variant={
                          isDone ? "success" : task.status === "in_progress" ? "info" : "default"
                        }
                      >
                        {statusLabels[task.status] ?? task.status}
                      </Badge>

                      {/* Action buttons for non-readonly, non-locked tasks */}
                      {!readonly && !task.is_locked && (
                        <>
                          <button
                            onClick={() => startEdit(task)}
                            className="p-1.5 rounded hover:bg-[#f3f3f3] transition-colors"
                            aria-label={t("tasks.editAria")}
                          >
                            <Pencil className="w-3.5 h-3.5 text-[#706e6b]" />
                          </button>
                          <button
                            onClick={() => {
                              setConfirmDeleteId(task.id);
                              setEditingTaskId(null);
                              setEditRequestTaskId(null);
                            }}
                            className="p-1.5 rounded hover:bg-[#fde9e7] transition-colors"
                            aria-label={t("tasks.deleteAria")}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-[#c23934]" />
                          </button>
                        </>
                      )}

                      {/* Edit request for readonly, non-locked tasks */}
                      {readonly && !task.is_locked && (
                        <button
                          onClick={() =>
                            setEditRequestTaskId(
                              editRequestTaskId === task.id ? null : task.id
                            )
                          }
                          className="p-1.5 rounded hover:bg-[#f3f3f3] transition-colors"
                          aria-label={t("tasks.requestEditAria")}
                        >
                          <Pencil className="w-4 h-4 text-[#706e6b]" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="flex-1 min-w-0 text-start">
                        <div className="flex items-center justify-start gap-2 mb-1">
                          {task.external_sync_id && (
                            <ExternalLink
                              className="w-3.5 h-3.5 text-[#0070d2] flex-shrink-0"
                              aria-label={t("tasks.syncedAria")}
                            />
                          )}
                          {task.is_locked && (
                            <Lock
                              className="w-3.5 h-3.5 text-gray-400 flex-shrink-0"
                              aria-label={t("tasks.lockedAria")}
                            />
                          )}
                          <h4
                            className={`text-sm font-semibold truncate ${
                              isDone ? "text-[#04844b] line-through" : "text-[#080707]"
                            }`}
                          >
                            {task.title}
                          </h4>
                        </div>
                        <p
                          className={`text-sm line-clamp-2 ${
                            isDone ? "text-[#04844b]/80" : "text-[#3e3e3c]"
                          }`}
                        >
                          {task.description}
                        </p>
                      </div>

                      {/* Done toggle — only for non-readonly, non-locked tasks */}
                      {!readonly && (
                        <button
                          onClick={() => handleToggleDone(task)}
                          disabled={task.is_locked || togglingId === task.id}
                          className="mt-0.5 flex-shrink-0 text-[#dddbda] hover:text-[#04844b] disabled:opacity-40 transition-colors"
                          aria-label={isDone ? t("tasks.markIncomplete") : t("tasks.markComplete")}
                        >
                          {isDone ? (
                            <CheckCircle2 className="w-5 h-5 text-[#04844b]" />
                          ) : (
                            <Circle className="w-5 h-5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {editRequestTaskId === task.id && (
                  <TaskEditRequestForm
                    task={task}
                    token={token}
                    onClose={() => setEditRequestTaskId(null)}
                  />
                )}
              </div>
            );
          })}
        </div>
      );
      })()}
    </Card>
  );
}
