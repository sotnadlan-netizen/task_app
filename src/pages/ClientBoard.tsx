import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, UserCog, User, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Layout } from "@/components/Layout";
import {
  apiFetchTasksBySession,
  apiFetchSessions,
  apiToggleTask,
  type ActionItem,
  type Session,
} from "@/lib/storage";
import { toast } from "sonner";

const priorityConfig = {
  High: { label: "גבוהה", bg: "bg-rose-100", color: "text-rose-700" },
  Medium: { label: "בינונית", bg: "bg-amber-100", color: "text-amber-700" },
  Low: { label: "נמוכה", bg: "bg-slate-100", color: "text-slate-500" },
} as const;

function TaskCard({
  item,
  onToggle,
}: {
  item: ActionItem;
  onToggle: (id: string) => void;
}) {
  const pri = priorityConfig[item.priority];
  return (
    <div
      className="group relative rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onToggle(item.id)}
    >
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

function Column({
  title,
  icon: Icon,
  accentBorder,
  accentBadge,
  items,
  onToggle,
}: {
  title: string;
  icon: React.ElementType;
  accentBorder: string;
  accentBadge: string;
  items: ActionItem[];
  onToggle: (id: string) => void;
}) {
  const pending = items.filter((i) => !i.completed);
  const done = items.filter((i) => i.completed);

  return (
    <div className={`flex flex-col rounded-2xl border-2 ${accentBorder} overflow-hidden`}>
      <div className="flex items-center gap-2.5 px-5 py-3.5 bg-white border-b border-slate-100">
        <Icon className="h-4 w-4" />
        <span className="text-sm font-bold">{title}</span>
        <span
          className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-semibold ${accentBadge}`}
        >
          {pending.length} pending
        </span>
      </div>
      <div className="flex-1 space-y-2.5 p-4 bg-slate-50/60 min-h-[200px]">
        {items.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-8">No tasks assigned</p>
        ) : (
          <>
            {pending.map((item) => (
              <TaskCard key={item.id} item={item} onToggle={onToggle} />
            ))}
            {done.length > 0 && (
              <div className="space-y-2.5 opacity-50">
                {done.map((item) => (
                  <TaskCard key={item.id} item={item} onToggle={onToggle} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
      <div className="px-5 py-3 bg-white border-t border-slate-100 text-xs text-slate-400">
        {done.length}/{items.length} completed
      </div>
    </div>
  );
}

export default function ClientBoard() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<ActionItem[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => { load(); }, [load]);

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

  const advisorTasks = tasks.filter((t) => t.assignee === "Advisor");
  const clientTasks = tasks.filter((t) => t.assignee === "Client");
  const totalPending = tasks.filter((t) => !t.completed).length;

  return (
    <Layout
      title="Client Board"
      subtitle={session?.filename ?? "Task checklist for this session"}
    >
      {/* Back + summary */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/dashboard")}
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
                <p className="text-xs text-slate-400 mt-2">
                  {new Date(session.createdAt).toLocaleString("he-IL")}
                </p>
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
            onToggle={handleToggle}
          />
          <Column
            title="Client Tasks"
            icon={User}
            accentBorder="border-emerald-200"
            accentBadge="bg-emerald-100 text-emerald-700"
            items={clientTasks}
            onToggle={handleToggle}
          />
        </div>
      )}
    </Layout>
  );
}
