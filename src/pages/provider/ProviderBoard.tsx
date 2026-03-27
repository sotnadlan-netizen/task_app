import { useCallback, useEffect, useRef, useState } from "react";
import { useRealtimeTasks } from "@/hooks/useRealtimeTasks";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  UserCog,
  User,
  CheckCircle2,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Layout } from "@/components/Layout";
import { AudioPlayer } from "@/components/features/AudioPlayer";
import {
  apiFetchTasksBySession,
  apiFetchSessions,
  apiToggleTask,
  apiCreateTask,
  apiUpdateTaskDetails,
  apiDeleteTask,
  type ActionItem,
  type Session,
} from "@/lib/storage";
import { toast } from "sonner";

const priorityConfig = {
  High: { label: "גבוהה", bg: "bg-rose-100", color: "text-rose-700" },
  Medium: { label: "בינונית", bg: "bg-amber-100", color: "text-amber-700" },
  Low: { label: "נמוכה", bg: "bg-slate-100", color: "text-slate-500" },
} as const;

// ── TaskCard ───────────────────────────────────────────────────────────────────

function TaskCard({
  item,
  onToggle,
  onEdit,
  onDelete,
}: {
  item: ActionItem;
  onToggle: (id: string) => void;
  onEdit: (
    id: string,
    patch: { title: string; description: string; priority: "High" | "Medium" | "Low" },
  ) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(item.title);
  const [editDescription, setEditDescription] = useState(item.description ?? "");
  const [editPriority, setEditPriority] = useState<"High" | "Medium" | "Low">(item.priority);

  const pri = priorityConfig[item.priority];

  const handleSave = () => {
    if (!editTitle.trim()) return;
    onEdit(item.id, {
      title: editTitle.trim(),
      description: editDescription.trim(),
      priority: editPriority,
    });
    setEditing(false);
  };

  const handleCancel = () => {
    setEditTitle(item.title);
    setEditDescription(item.description ?? "");
    setEditPriority(item.priority);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="rounded-xl border-2 border-indigo-300 bg-white p-3 shadow-sm space-y-2">
        <Input
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          placeholder="Task title"
          className="h-8 text-sm"
          autoFocus
        />
        <Input
          value={editDescription}
          onChange={(e) => setEditDescription(e.target.value)}
          placeholder="Description (optional)"
          className="h-7 text-xs"
        />
        <Select
          value={editPriority}
          onValueChange={(v) => setEditPriority(v as "High" | "Medium" | "Low")}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="High">High — גבוהה</SelectItem>
            <SelectItem value="Medium">Medium — בינונית</SelectItem>
            <SelectItem value="Low">Low — נמוכה</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-1.5 justify-end">
          <Button
            size="sm"
            className="h-7 px-2 bg-emerald-500 hover:bg-emerald-600 text-white"
            onClick={handleSave}
            disabled={!editTitle.trim()}
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-slate-500"
            onClick={handleCancel}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="group relative rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onToggle(item.id)}
    >
      {/* Edit / Delete icons — top-left, visible on hover */}
      <div
        className="absolute top-2 left-2 hidden group-hover:flex gap-1"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="p-0.5 rounded text-slate-300 hover:text-indigo-500 transition-colors"
          onClick={() => setEditing(true)}
          title="Edit task"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          className="p-0.5 rounded text-slate-300 hover:text-red-400 transition-colors"
          onClick={() => onDelete(item.id)}
          title="Delete task"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <span
        className={`absolute top-3.5 right-3.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${pri.bg} ${pri.color}`}
      >
        {pri.label}
      </span>
      <div className="flex gap-3 pr-16">
        <Checkbox
          checked={item.completed}
          onClick={(e) => e.stopPropagation()}
          onCheckedChange={() => onToggle(item.id)}
          className="mt-0.5 shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm font-semibold leading-snug ${
              item.completed ? "line-through text-slate-400" : "text-slate-800"
            }`}
          >
            {item.title}
          </p>
          {item.description && (
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">{item.description}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Column ─────────────────────────────────────────────────────────────────────

function Column({
  title,
  icon: Icon,
  accentBorder,
  accentBadge,
  items,
  assignee,
  onToggle,
  onAddTask,
  onEdit,
  onDelete,
}: {
  title: string;
  icon: React.ElementType;
  accentBorder: string;
  accentBadge: string;
  items: ActionItem[];
  assignee: "Advisor" | "Client";
  onToggle: (id: string) => void;
  onAddTask: (task: { title: string; description: string; priority: string }) => void;
  onEdit: (
    id: string,
    patch: { title: string; description: string; priority: "High" | "Medium" | "Low" },
  ) => void;
  onDelete: (id: string) => void;
}) {
  const [addingTask, setAddingTask] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPriority, setNewPriority] = useState("Medium");

  const pending = items.filter((i) => !i.completed);
  const done = items.filter((i) => i.completed);
  const allDone = pending.length === 0 && items.length > 0;

  const handleAdd = () => {
    if (!newTitle.trim()) {
      toast.error("Task title is required");
      return;
    }
    onAddTask({
      title: newTitle.trim(),
      description: newDescription.trim(),
      priority: newPriority,
    });
    setNewTitle("");
    setNewDescription("");
    setNewPriority("Medium");
    setAddingTask(false);
  };

  const handleCancelAdd = () => {
    setNewTitle("");
    setNewDescription("");
    setNewPriority("Medium");
    setAddingTask(false);
  };

  return (
    <div className={`flex flex-col rounded-2xl border-2 ${accentBorder} overflow-hidden`}>
      {/* Header */}
      <div className="flex items-center gap-2.5 px-5 py-3.5 bg-white border-b border-slate-100">
        <Icon className="h-4 w-4" />
        <span className="text-sm font-bold">{title}</span>
        <span
          className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-semibold ${accentBadge}`}
        >
          {pending.length} pending
        </span>
        {/* FE-017: "+" button in column header */}
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-slate-400 hover:text-indigo-600 ml-1"
          onClick={() => setAddingTask(true)}
          title={`Add task for ${assignee}`}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Body */}
      <div className="flex-1 space-y-2.5 p-4 bg-slate-50/60 min-h-[200px]">
        {/* FE-017: Inline add-task form at TOP of list */}
        {addingTask && (
          <div className="rounded-xl border border-indigo-200 bg-white p-3 shadow-sm space-y-2">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Task title *"
              className="h-8 text-sm"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <Input
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Description (optional)"
              className="h-7 text-xs"
            />
            <Select value={newPriority} onValueChange={setNewPriority}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="High">High — גבוהה</SelectItem>
                <SelectItem value="Medium">Medium — בינונית</SelectItem>
                <SelectItem value="Low">Low — נמוכה</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-1.5">
              <Button
                size="sm"
                className="h-7 px-3 bg-emerald-500 hover:bg-emerald-600 text-white text-xs"
                onClick={handleAdd}
                disabled={!newTitle.trim()}
              >
                Add
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-slate-500"
                onClick={handleCancelAdd}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {items.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-8">No tasks assigned</p>
        ) : allDone ? (
          <>
            {/* FE-021: All Done celebration banner */}
            <div className="animate-in fade-in-0 zoom-in-95 duration-500 flex flex-col items-center justify-center py-6 gap-2">
              <span className="text-4xl">🎉</span>
              <p className="text-base font-bold text-emerald-700">All Done!</p>
              <p className="text-xs text-slate-500">Every task is complete.</p>
            </div>
            {/* Completed tasks at 50% opacity */}
            <div className="space-y-2.5 opacity-50">
              {done.map((item) => (
                <TaskCard
                  key={item.id}
                  item={item}
                  onToggle={onToggle}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </div>
          </>
        ) : (
          <>
            {pending.map((item) => (
              <TaskCard
                key={item.id}
                item={item}
                onToggle={onToggle}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
            {done.length > 0 && (
              <div className="space-y-2.5 opacity-50">
                {done.map((item) => (
                  <TaskCard
                    key={item.id}
                    item={item}
                    onToggle={onToggle}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 bg-white border-t border-slate-100 text-xs text-slate-400">
        {done.length}/{items.length} completed
      </div>
    </div>
  );
}

// ── ProviderBoard ──────────────────────────────────────────────────────────────

export default function ProviderBoard() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<ActionItem[]>([]);
  // Realtime: receive task changes from other sessions or AI pipeline
  useRealtimeTasks(sessionId, setTasks);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // FE-021: track which columns have already fired the "all done" toast
  const allDoneToastedRef = useRef<Set<string>>(new Set());
  const prevAdvisorPendingRef = useRef<number | null>(null);
  const prevClientPendingRef = useRef<number | null>(null);

  const load = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const [sessionTasks, sessions] = await Promise.all([
        apiFetchTasksBySession(sessionId),
        apiFetchSessions(),
      ]);
      setTasks(sessionTasks);
      setSession(sessions.find((s) => s.id === sessionId) ?? null);
    } catch {
      toast.error("Failed to load board data");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    load();
  }, [load]);

  const advisorTasks = tasks.filter((t) => t.assignee === "Advisor");
  const clientTasks = tasks.filter((t) => t.assignee === "Client");
  const totalPending = tasks.filter((t) => !t.completed).length;

  // FE-021: fire "all done" toast once when a column transitions from pending>0 to pending===0
  useEffect(() => {
    if (loading) return;

    const advisorPending = advisorTasks.filter((t) => !t.completed).length;
    const clientPending = clientTasks.filter((t) => !t.completed).length;

    if (
      prevAdvisorPendingRef.current !== null &&
      prevAdvisorPendingRef.current > 0 &&
      advisorPending === 0 &&
      advisorTasks.length > 0 &&
      !allDoneToastedRef.current.has("Advisor")
    ) {
      allDoneToastedRef.current.add("Advisor");
      toast.success("All done!", { description: "Advisor Tasks — all tasks complete" });
    }

    if (
      prevClientPendingRef.current !== null &&
      prevClientPendingRef.current > 0 &&
      clientPending === 0 &&
      clientTasks.length > 0 &&
      !allDoneToastedRef.current.has("Client")
    ) {
      allDoneToastedRef.current.add("Client");
      toast.success("All done!", { description: "Client Tasks — all tasks complete" });
    }

    // Reset dedup if tasks become pending again
    if (advisorPending > 0) allDoneToastedRef.current.delete("Advisor");
    if (clientPending > 0) allDoneToastedRef.current.delete("Client");

    prevAdvisorPendingRef.current = advisorPending;
    prevClientPendingRef.current = clientPending;
  }, [advisorTasks, clientTasks, loading]);

  // ── Toggle ──────────────────────────────────────────────────────────────────
  const handleToggle = useCallback(async (id: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
    try {
      const updated = await apiToggleTask(id);
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
    } catch {
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
      toast.error("Failed to update task");
    }
  }, []);

  // ── Add task ────────────────────────────────────────────────────────────────
  const handleAddTask = useCallback(
    async (
      assignee: "Advisor" | "Client",
      taskData: { title: string; description: string; priority: string },
    ) => {
      if (!sessionId) return;
      try {
        const newTask = await apiCreateTask({
          sessionId,
          title: taskData.title,
          description: taskData.description,
          assignee,
          priority: taskData.priority as "High" | "Medium" | "Low",
        });
        setTasks((prev) => [...prev, newTask]);
        toast.success("Task created");
      } catch {
        toast.error("Failed to create task");
      }
    },
    [sessionId],
  );

  // ── Edit task ───────────────────────────────────────────────────────────────
  const handleEditTask = useCallback(
    async (
      id: string,
      patch: { title: string; description: string; priority: "High" | "Medium" | "Low" },
    ) => {
      // Optimistic update
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
      try {
        const updated = await apiUpdateTaskDetails(id, patch);
        setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
      } catch {
        toast.error("Failed to update task");
        load();
      }
    },
    [load],
  );

  // ── Delete task ─────────────────────────────────────────────────────────────
  const handleDeleteTask = useCallback(
    async (id: string) => {
      setTasks((prev) => prev.filter((t) => t.id !== id));
      try {
        await apiDeleteTask(id);
        toast.success("Task deleted");
      } catch {
        toast.error("Failed to delete task");
        load();
      }
    },
    [load],
  );

  return (
    <Layout
      title="Session Board"
      subtitle={session?.filename ?? "Task checklist for this session"}
    >
      {/* Back + summary */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/provider/dashboard")}
          className="mb-4 -ml-2 text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" /> All Sessions
        </Button>

        {session && (
          <Card className="border-indigo-100 bg-indigo-50/40 shadow-sm mb-6">
            <CardContent className="px-5 py-4 flex items-start gap-4">
              <div className="flex-1">
                <p className="text-sm font-semibold text-indigo-900 mb-1">Session Summary</p>
                <p className="text-sm text-slate-700 leading-relaxed">{session.summary}</p>
                <div className="flex items-center gap-4 mt-2">
                  <p className="text-xs text-slate-400">
                    {new Date(session.createdAt).toLocaleString("he-IL")}
                  </p>
                  {session.clientEmail && (
                    <p className="text-xs text-indigo-600 font-medium">
                      Client: {session.clientEmail}
                    </p>
                  )}
                </div>
              </div>
              <div className="shrink-0 text-center">
                <p className="text-2xl font-bold text-indigo-700">{totalPending}</p>
                <p className="text-[10px] text-indigo-500 uppercase tracking-wide font-semibold">
                  Pending
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Audio playback */}
      <div className="mb-4">
        <AudioPlayer sessionId={sessionId!} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
          <div className="rounded-full bg-slate-100 p-5">
            <CheckCircle2 className="h-7 w-7 text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-500">No tasks for this session</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Column
            title="Advisor Tasks"
            icon={UserCog}
            accentBorder="border-indigo-200"
            accentBadge="bg-indigo-100 text-indigo-700"
            items={advisorTasks}
            assignee="Advisor"
            onToggle={handleToggle}
            onAddTask={(taskData) => handleAddTask("Advisor", taskData)}
            onEdit={handleEditTask}
            onDelete={handleDeleteTask}
          />
          <Column
            title="Client Tasks"
            icon={User}
            accentBorder="border-emerald-200"
            accentBadge="bg-emerald-100 text-emerald-700"
            items={clientTasks}
            assignee="Client"
            onToggle={handleToggle}
            onAddTask={(taskData) => handleAddTask("Client", taskData)}
            onEdit={handleEditTask}
            onDelete={handleDeleteTask}
          />
        </div>
      )}
    </Layout>
  );
}
