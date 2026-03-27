import { useState } from "react";
import { Trash2, Plus, UserCog, User } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AiTask {
  id: string;
  title: string;
  description?: string;
  assignee: "Advisor" | "Client";
  priority: "High" | "Medium" | "Low";
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  tasks: AiTask[];
  summary: string;
  onApprove: (tasks: AiTask[]) => void;
}

// ─── Priority badge ───────────────────────────────────────────────────────────

const priorityColors: Record<string, string> = {
  High: "bg-rose-100 text-rose-700 border-rose-200",
  Medium: "bg-amber-100 text-amber-700 border-amber-200",
  Low: "bg-slate-100 text-slate-600 border-slate-200",
};

// ─── TaskReviewDialog ─────────────────────────────────────────────────────────

export function TaskReviewDialog({
  open,
  onOpenChange,
  tasks: initialTasks,
  summary,
  onApprove,
}: Props) {
  const [tasks, setTasks] = useState<AiTask[]>(() =>
    initialTasks.map((t) => ({ ...t })),
  );

  // Sync when parent re-opens with fresh tasks
  const [lastInitial, setLastInitial] = useState(initialTasks);
  if (initialTasks !== lastInitial) {
    setLastInitial(initialTasks);
    setTasks(initialTasks.map((t) => ({ ...t })));
  }

  // ── Mutations ──────────────────────────────────────────────────────────────

  function updateTask(id: string, patch: Partial<AiTask>) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  function deleteTask(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  function addTask() {
    const newTask: AiTask = {
      id: `new-${Date.now()}`,
      title: "",
      assignee: "Advisor",
      priority: "Medium",
    };
    setTasks((prev) => [...prev, newTask]);
  }

  // ── Approve ────────────────────────────────────────────────────────────────

  function handleApprove() {
    onApprove(tasks.filter((t) => t.title.trim() !== ""));
  }

  // ── Discard ────────────────────────────────────────────────────────────────

  function handleDiscard() {
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-full h-[90vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 shrink-0">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">
              Review & Approve Tasks
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-sm mt-1">
              Edit, reorder, or remove AI-suggested tasks before the client sees them.
            </DialogDescription>
          </DialogHeader>

          {/* Session summary */}
          {summary && (
            <div className="mt-4 rounded-xl bg-indigo-50 border border-indigo-100 px-4 py-3">
              <p className="text-[11px] font-semibold text-indigo-500 uppercase tracking-wide mb-1">
                Session Summary
              </p>
              <p className="text-sm text-slate-700 leading-relaxed">{summary}</p>
            </div>
          )}
        </div>

        {/* Task list */}
        <ScrollArea className="flex-1 px-6 py-4">
          <div className="space-y-3">
            {tasks.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-10">
                No tasks yet. Click "+ Add task" below to add one.
              </p>
            )}

            {tasks.map((task) => (
              <div
                key={task.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3"
              >
                {/* Row 1: title + delete */}
                <div className="flex items-center gap-2">
                  <Input
                    value={task.title}
                    onChange={(e) => updateTask(task.id, { title: e.target.value })}
                    placeholder="Task title"
                    className="flex-1 h-9 text-sm font-medium"
                  />
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                    title="Delete task"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Row 2: priority + assignee toggle */}
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Priority select */}
                  <Select
                    value={task.priority}
                    onValueChange={(v) =>
                      updateTask(task.id, { priority: v as AiTask["priority"] })
                    }
                  >
                    <SelectTrigger className="h-8 w-36 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Low">Low</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Priority badge preview */}
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      priorityColors[task.priority]
                    }`}
                  >
                    {task.priority}
                  </span>

                  {/* Assignee pill toggle */}
                  <div className="ml-auto flex items-center rounded-lg border border-slate-200 overflow-hidden text-xs font-semibold">
                    <button
                      onClick={() => updateTask(task.id, { assignee: "Advisor" })}
                      className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${
                        task.assignee === "Advisor"
                          ? "bg-indigo-600 text-white"
                          : "text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      <UserCog className="h-3.5 w-3.5" />
                      Advisor
                    </button>
                    <button
                      onClick={() => updateTask(task.id, { assignee: "Client" })}
                      className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${
                        task.assignee === "Client"
                          ? "bg-emerald-600 text-white"
                          : "text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      <User className="h-3.5 w-3.5" />
                      Client
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add task button */}
          <button
            onClick={addTask}
            className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 px-4 py-3 text-sm text-slate-400 hover:border-indigo-300 hover:text-indigo-500 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add task
          </button>
        </ScrollArea>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0 bg-white">
          <Button
            variant="ghost"
            onClick={handleDiscard}
            className="text-slate-500 hover:text-red-600 hover:bg-red-50"
          >
            Discard Session
          </Button>

          <Button
            onClick={handleApprove}
            className="bg-indigo-600 hover:bg-indigo-700 gap-2 px-6"
          >
            Approve & Send ({tasks.filter((t) => t.title.trim()).length} tasks)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
