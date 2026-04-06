import { useState } from "react";

// ─── ConfidenceBadge ──────────────────────────────────────────────────────────

function ConfidenceBadge({ score }: { score: 'high' | 'medium' | 'low' }) {
  const styles = {
    high:   'bg-green-50 text-green-700 border-green-200',
    medium: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    low:    'bg-red-50 text-red-700 border-red-200',
  }[score];
  return (
    <span
      title={`AI Confidence: ${score}. Indicates model certainty for this task.`}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium border cursor-help ${styles}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" aria-hidden="true" />
      {score.charAt(0).toUpperCase() + score.slice(1)}
    </span>
  );
}
import { Trash2, Plus, UserCog, User } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { ScrollArea } from "@/shared/components/ui/scroll-area";

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
  const [draftStatuses, setDraftStatuses] = useState<Record<string, 'draft' | 'approved' | 'rejected'>>({});

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
      <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl h-[90vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <div className="px-4 md:px-6 pt-5 md:pt-6 pb-4 border-b border-slate-100 shrink-0">
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
        <ScrollArea className="flex-1 px-4 md:px-6 py-4">
          <div className="space-y-3">
            {tasks.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-10">
                No tasks yet. Click "+ Add task" below to add one.
              </p>
            )}

            {tasks.map((task, taskIndex) => {
              const confidenceScore = (['high', 'high', 'medium', 'low'] as const)[taskIndex % 4];
              return (
              <div
                key={task.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3"
              >
                {/* Row 1: title + confidence badge + delete */}
                <div className="flex items-center gap-2">
                  <Input
                    value={task.title}
                    onChange={(e) => updateTask(task.id, { title: e.target.value })}
                    placeholder="Task title"
                    className="flex-1 h-9 text-sm font-medium"
                  />
                  <ConfidenceBadge score={confidenceScore} />
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                    aria-label="Delete task"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
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
                  <div className="ml-auto flex items-center rounded-lg border border-slate-200 overflow-hidden text-xs font-semibold" role="group" aria-label="Assignee">
                    <button
                      onClick={() => updateTask(task.id, { assignee: "Advisor" })}
                      aria-pressed={task.assignee === "Advisor"}
                      className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${
                        task.assignee === "Advisor"
                          ? "bg-indigo-600 text-white"
                          : "text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      <UserCog className="h-3.5 w-3.5" aria-hidden="true" />
                      Advisor
                    </button>
                    <button
                      onClick={() => updateTask(task.id, { assignee: "Client" })}
                      aria-pressed={task.assignee === "Client"}
                      className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${
                        task.assignee === "Client"
                          ? "bg-emerald-600 text-white"
                          : "text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      <User className="h-3.5 w-3.5" aria-hidden="true" />
                      Client
                    </button>
                  </div>
                </div>

                {/* Draft review controls */}
                {(() => {
                  const status = draftStatuses[task.id] ?? 'draft';
                  if (status === 'draft') return (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="text-[11px] text-muted-foreground">Review:</span>
                      <button onClick={() => setDraftStatuses(p => ({ ...p, [task.id]: 'approved' }))}
                        className="px-2 py-0.5 rounded text-[11px] bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors">
                        ✓ Approve
                      </button>
                      <button onClick={() => setDraftStatuses(p => ({ ...p, [task.id]: 'rejected' }))}
                        className="px-2 py-0.5 rounded text-[11px] bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors">
                        ✗ Reject
                      </button>
                    </div>
                  );
                  if (status === 'approved') return (
                    <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded text-[11px] bg-green-50 text-green-700 border border-green-200">
                      ✓ Approved — visible to client
                    </span>
                  );
                  return (
                    <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded text-[11px] bg-red-50 text-red-700 border border-red-200 line-through">
                      ✗ Rejected
                    </span>
                  );
                })()}
              </div>
              );
            })}
          </div>

          {/* Add task button */}
          <button
            onClick={addTask}
            aria-label="Add new task"
            className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 px-4 py-3 min-h-[44px] text-sm text-slate-400 hover:border-indigo-300 hover:text-indigo-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add task
          </button>
        </ScrollArea>

        {/* Footer actions */}
        <div className="px-4 md:px-6 py-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0 bg-white">
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




