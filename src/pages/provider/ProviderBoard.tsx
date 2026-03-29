import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
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
  GripVertical,
  Share2,
  Copy,
  Download,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useAuth } from "@/contexts/AuthContext";

const priorityConfig = {
  High:   { label: "גבוהה",   bg: "bg-rose-100",   color: "text-rose-700",   ring: "ring-1 ring-rose-200" },
  Medium: { label: "בינונית", bg: "bg-amber-100",  color: "text-amber-700",  ring: "ring-1 ring-amber-200" },
  Low:    { label: "נמוכה",   bg: "bg-slate-100",  color: "text-slate-500",  ring: "ring-1 ring-slate-200" },
} as const;

// ── TaskCard ───────────────────────────────────────────────────────────────────

function TaskCard({
  item,
  onToggle,
  onEdit,
  onDelete,
  draggable,
}: {
  item: ActionItem;
  onToggle: (id: string) => void;
  onEdit: (
    id: string,
    patch: { title: string; description: string; priority: "High" | "Medium" | "Low" },
  ) => void;
  onDelete: (id: string) => void;
  draggable?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(item.title);
  const [editDescription, setEditDescription] = useState(item.description ?? "");
  const [editPriority, setEditPriority] = useState<"High" | "Medium" | "Low">(item.priority);

  const { t } = useTranslation();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: !draggable });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

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
      <div
        ref={setNodeRef}
        style={style}
        className="rounded-xl border-2 border-indigo-300 bg-white p-3 shadow-sm space-y-2"
      >
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
            <SelectItem value="High">{t('priority.highLabel')}</SelectItem>
            <SelectItem value="Medium">{t('priority.mediumLabel')}</SelectItem>
            <SelectItem value="Low">{t('priority.lowLabel')}</SelectItem>
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
      ref={setNodeRef}
      style={style}
      className="group relative rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md hover:-translate-y-px transition-all cursor-pointer"
      onClick={() => onToggle(item.id)}
    >
      {/* Drag handle — only visible for provider */}
      {draggable && (
        <div
          className="absolute top-1/2 -translate-y-1/2 left-1 hidden group-hover:flex items-center text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing"
          onClick={(e) => e.stopPropagation()}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </div>
      )}

      {/* Edit / Delete icons — top-left, visible on hover */}
      <div
        className={`absolute top-2 hidden group-hover:flex gap-1 ${draggable ? "left-7" : "left-2"}`}
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
        className={`absolute top-4 right-4 inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide ${pri.bg} ${pri.color} ${pri.ring}`}
      >
        {t(`priority.${item.priority.toLowerCase()}`)}
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
  draggable,
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
  draggable?: boolean;
}) {
  const { t } = useTranslation();
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
    <div className={`flex flex-col rounded-2xl border-2 ${accentBorder} overflow-hidden shadow-md`}>
      {/* Header */}
      <div className="flex items-center gap-2.5 px-5 py-4 bg-white border-b border-slate-100">
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
      <div className="flex-1 space-y-3 p-5 bg-slate-50/60 min-h-[200px]">
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
                <SelectItem value="High">{t('priority.highLabel')}</SelectItem>
                <SelectItem value="Medium">{t('priority.mediumLabel')}</SelectItem>
                <SelectItem value="Low">{t('priority.lowLabel')}</SelectItem>
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
            <SortableContext
              items={done.map((i) => i.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3 opacity-50">
                {done.map((item) => (
                  <TaskCard
                    key={item.id}
                    item={item}
                    onToggle={onToggle}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    draggable={draggable}
                  />
                ))}
              </div>
            </SortableContext>
          </>
        ) : (
          <>
            <SortableContext
              items={pending.map((i) => i.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {pending.map((item) => (
                  <TaskCard
                    key={item.id}
                    item={item}
                    onToggle={onToggle}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    draggable={draggable}
                  />
                ))}
              </div>
            </SortableContext>
            {done.length > 0 && (
              <SortableContext
                items={done.map((i) => i.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3 opacity-50">
                  {done.map((item) => (
                    <TaskCard
                      key={item.id}
                      item={item}
                      onToggle={onToggle}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      draggable={draggable}
                    />
                  ))}
                </div>
              </SortableContext>
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

// ── Export helpers ────────────────────────────────────────────────────────────

function formatSessionExport(session: Session, tasks: ActionItem[]): string {
  const date = new Date(session.createdAt).toLocaleString("en-GB");
  const advisorTasks = tasks.filter((t) => t.assignee === "Advisor");
  const clientTasks  = tasks.filter((t) => t.assignee === "Client");

  const taskLines = (list: ActionItem[]) =>
    list.length === 0
      ? "  (none)"
      : list
          .map((t) => `  [${t.completed ? "x" : " "}] ${t.title} (${t.priority})${t.description ? `\n      ${t.description}` : ""}`)
          .join("\n");

  return [
    `SESSION SUMMARY`,
    `===============`,
    `Title:   ${session.title || session.filename}`,
    `Date:    ${date}`,
    `File:    ${session.filename}`,
    session.clientEmail ? `Client:  ${session.clientEmail}` : null,
    session.sentiment   ? `Mood:    ${session.sentiment}` : null,
    ``,
    `SUMMARY`,
    `-------`,
    session.summary,
    ``,
    `ADVISOR TASKS (${advisorTasks.length})`,
    `${"─".repeat(20)}`,
    taskLines(advisorTasks),
    ``,
    `CLIENT TASKS (${clientTasks.length})`,
    `${"─".repeat(20)}`,
    taskLines(clientTasks),
    ...(session.followUpQuestions?.length
      ? [``, `FOLLOW-UP QUESTIONS`, `${"─".repeat(20)}`, ...session.followUpQuestions.map((q, i) => `  ${i + 1}. ${q}`)]
      : []),
  ]
    .filter((l) => l !== null)
    .join("\n");
}

function downloadTextFile(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── ProviderBoard ──────────────────────────────────────────────────────────────

export default function ProviderBoard() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { role } = useAuth();
  const isProvider = role === "provider";
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

  // ── Drag-and-drop (FE-020) ──────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      setTasks((prev) => {
        const activeIdx = prev.findIndex((t) => t.id === active.id);
        const overIdx = prev.findIndex((t) => t.id === over.id);
        if (activeIdx === -1 || overIdx === -1) return prev;
        // Only allow reordering within the same column (same assignee)
        if (prev[activeIdx].assignee !== prev[overIdx].assignee) return prev;
        return arrayMove(prev, activeIdx, overIdx);
      });
    },
    [],
  );

  const boardContent = (
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
        draggable={isProvider}
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
        draggable={isProvider}
      />
    </div>
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
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-indigo-900">Session Summary</p>
                  {session.sentiment && (
                    <span className={[
                      "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
                      session.sentiment === "Positive" && "bg-emerald-100 text-emerald-700",
                      session.sentiment === "At-Risk"  && "bg-red-100 text-red-700",
                      session.sentiment === "Neutral"  && "bg-slate-100 text-slate-600",
                    ].filter(Boolean).join(" ")}>
                      {session.sentiment === "Positive" && "✓ Positive"}
                      {session.sentiment === "Neutral"  && "Neutral"}
                      {session.sentiment === "At-Risk"  && "⚠ At-Risk"}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">{session.summary}</p>
                {session.followUpQuestions && session.followUpQuestions.length > 0 && (
                  <div className="mt-2 border-t border-indigo-100 pt-2">
                    <p className="text-xs font-semibold text-indigo-700 mb-1">Follow-up Questions</p>
                    <ul className="space-y-0.5">
                      {session.followUpQuestions.map((q, i) => (
                        <li key={i} className="text-xs text-slate-600 flex gap-1.5">
                          <span className="text-indigo-400 shrink-0">›</span>
                          {q}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="flex items-center gap-4 mt-1">
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
              <div className="shrink-0 flex flex-col items-center gap-3">
                <div className="text-center">
                  <p className="text-2xl font-bold text-indigo-700">{totalPending}</p>
                  <p className="text-[10px] text-indigo-500 uppercase tracking-wide font-semibold">
                    Pending
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                      <Share2 className="h-3.5 w-3.5" /> Share
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem
                      onClick={() => {
                        const text = formatSessionExport(session, tasks);
                        navigator.clipboard.writeText(text).then(() =>
                          toast.success("Copied to clipboard")
                        ).catch(() => toast.error("Clipboard not available"));
                      }}
                      className="gap-2 text-xs"
                    >
                      <Copy className="h-3.5 w-3.5" /> Copy as text
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        const text = formatSessionExport(session, tasks);
                        const slug = (session.title || session.filename).replace(/[^a-z0-9]/gi, "-").toLowerCase();
                        downloadTextFile(text, `${slug}-summary.txt`);
                        toast.success("Downloaded");
                      }}
                      className="gap-2 text-xs"
                    >
                      <Download className="h-3.5 w-3.5" /> Download .txt
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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
      ) : isProvider ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          {boardContent}
        </DndContext>
      ) : (
        boardContent
      )}
    </Layout>
  );
}
