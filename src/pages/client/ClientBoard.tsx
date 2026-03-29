import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useRealtimeTasks } from "@/hooks/useRealtimeTasks";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, UserCog, User, CheckCircle2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ClientLayout } from "@/components/layouts/ClientLayout";
import {
  apiFetchTasksBySession,
  apiFetchSessions,
  apiToggleTask,
  type ActionItem,
  type Session,
} from "@/lib/storage";
import { toast } from "sonner";

const priorityConfig = {
  High:   { label: "גבוהה",   bg: "bg-rose-100",  color: "text-rose-700",  ring: "ring-1 ring-rose-200" },
  Medium: { label: "בינונית", bg: "bg-amber-100", color: "text-amber-700", ring: "ring-1 ring-amber-200" },
  Low:    { label: "נמוכה",   bg: "bg-slate-100", color: "text-slate-500", ring: "ring-1 ring-slate-200" },
} as const;

function ClientTaskCard({
  item,
  onToggle,
}: {
  item: ActionItem;
  onToggle: (id: string) => void;
}) {
  const { t } = useTranslation();
  const pri = priorityConfig[item.priority];
  return (
    <div
      className="group relative rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md hover:-translate-y-px transition-all cursor-pointer"
      onClick={() => onToggle(item.id)}
    >
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

function AdvisorTaskCard({ item }: { item: ActionItem }) {
  const { t } = useTranslation();
  const pri = priorityConfig[item.priority];
  return (
    <div className="relative rounded-xl border border-slate-200 bg-white p-5 shadow-sm opacity-60 cursor-not-allowed">
      <span
        className={`absolute top-4 right-4 inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide ${pri.bg} ${pri.color} ${pri.ring}`}
      >
        {t(`priority.${item.priority.toLowerCase()}`)}
      </span>
      <div className="flex gap-3 pr-16">
        <Checkbox
          checked={item.completed}
          disabled
          className="mt-0.5 shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm font-semibold leading-snug ${
              item.completed ? "line-through text-slate-400" : "text-slate-600"
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

export default function ClientBoard() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<ActionItem[]>([]);
  // Realtime: advisor task changes appear instantly for the client
  useRealtimeTasks(sessionId, setTasks);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const celebratedRef = useRef(false);

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
    } catch (err: unknown) {
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error("Failed to update task", { description: msg });
    }
  }, []);

  const advisorTasks = tasks.filter((t) => t.assignee === "Advisor");
  const clientTasks  = tasks.filter((t) => t.assignee === "Client");
  const totalPending = tasks.filter((t) => !t.completed).length;
  const allClientDone = clientTasks.length > 0 && clientTasks.every((t) => t.completed);

  useEffect(() => {
    if (allClientDone && !celebratedRef.current && clientTasks.length > 0) {
      toast.success("All done! 🎉", { description: "You've completed all your tasks." });
      celebratedRef.current = true;
    }
    if (!allClientDone) {
      celebratedRef.current = false;
    }
  }, [allClientDone, clientTasks.length]);

  return (
    <ClientLayout
      title="Session Board"
      subtitle={session?.filename ?? "Task checklist for this session"}
    >
      {/* Back + summary */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/client/dashboard")}
          className="mb-4 -ml-2 text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" /> My Sessions
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
              <div className="shrink-0 flex flex-col items-center gap-3">
                <div className="text-center">
                  <p className="text-2xl font-bold text-indigo-700">{totalPending}</p>
                  <p className="text-[10px] text-indigo-500 uppercase tracking-wide font-semibold">
                    Pending
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                  onClick={() => {
                    const myTasks = tasks.filter((t) => t.assignee === "Client");
                    const lines = [
                      `SESSION: ${session.title || session.filename}`,
                      `Date: ${new Date(session.createdAt).toLocaleString("en-GB")}`,
                      ``,
                      `SUMMARY`,
                      session.summary,
                      ``,
                      `MY TASKS (${myTasks.length})`,
                      ...myTasks.map((t) => `  [${t.completed ? "x" : " "}] ${t.title} (${t.priority})`),
                    ].join("\n");
                    navigator.clipboard.writeText(lines)
                      .then(() => toast.success("Copied to clipboard"))
                      .catch(() => toast.error("Clipboard not available"));
                  }}
                >
                  <Copy className="h-3.5 w-3.5" /> Copy
                </Button>
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
          {/* Advisor column — read-only */}
          <div className="flex flex-col rounded-2xl border-2 border-indigo-200 overflow-hidden">
            <div className="flex items-center gap-2.5 px-5 py-3.5 bg-white border-b border-slate-100">
              <UserCog className="h-4 w-4 text-slate-500" />
              <span className="text-sm font-bold">Advisor Tasks</span>
              <span className="ml-auto rounded-full px-2 py-0.5 text-[11px] font-semibold bg-slate-100 text-slate-500">
                read-only
              </span>
            </div>
            <div className="flex-1 space-y-3 p-5 bg-slate-50/60 min-h-[200px]">
              {advisorTasks.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">No tasks assigned</p>
              ) : (
                advisorTasks.map((item) => (
                  <AdvisorTaskCard key={item.id} item={item} />
                ))
              )}
            </div>
            <div className="px-5 py-3 bg-white border-t border-slate-100 text-xs text-slate-400">
              {advisorTasks.filter((t) => t.completed).length}/{advisorTasks.length} completed
            </div>
          </div>

          {/* Client column — interactive */}
          <div className="flex flex-col rounded-2xl border-2 border-emerald-200 overflow-hidden">
            <div className="flex items-center gap-2.5 px-5 py-3.5 bg-white border-b border-slate-100">
              <User className="h-4 w-4" />
              <span className="text-sm font-bold">My Tasks</span>
              <span className="ml-auto rounded-full px-2 py-0.5 text-[11px] font-semibold bg-emerald-100 text-emerald-700">
                {clientTasks.filter((t) => !t.completed).length} pending
              </span>
            </div>
            <div className="flex-1 space-y-3 p-5 bg-slate-50/60 min-h-[200px]">
              {clientTasks.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">No tasks assigned</p>
              ) : (
                <>
                  {clientTasks.filter((t) => !t.completed).map((item) => (
                    <ClientTaskCard key={item.id} item={item} onToggle={handleToggle} />
                  ))}
                  {clientTasks.filter((t) => t.completed).length > 0 && (
                    <>
                      {allClientDone && (
                        <div className="flex flex-col items-center justify-center py-6 gap-2 animate-in fade-in-0 zoom-in-95 duration-500">
                          <span className="text-4xl select-none">🎉</span>
                          <p className="text-sm font-bold text-emerald-700">All Done!</p>
                          <p className="text-xs text-emerald-600">You've completed all your tasks.</p>
                        </div>
                      )}
                      <div className="space-y-2.5 opacity-50">
                        {clientTasks.filter((t) => t.completed).map((item) => (
                          <ClientTaskCard key={item.id} item={item} onToggle={handleToggle} />
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
            <div className="px-5 py-3 bg-white border-t border-slate-100 text-xs text-slate-400">
              {clientTasks.filter((t) => t.completed).length}/{clientTasks.length} completed
            </div>
          </div>
        </div>
      )}
    </ClientLayout>
  );
}
