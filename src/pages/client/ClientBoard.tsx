import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useRealtimeTasks } from "@/hooks/useRealtimeTasks";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, UserCog, User, CheckCircle2, Copy, FileText, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ClientLayout } from "@/components/layouts/ClientLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion, AnimatePresence } from "framer-motion";
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
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<'summary' | 'tasks'>('tasks');
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

  const handleCopy = () => {
    if (!session) return;
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
  };

  // ---- Mobile sub-components ----

  const mobileHeader = (
    <div className="sticky top-0 z-20 glass border-b border-border/50 px-4 py-2.5 flex items-center gap-2 md:hidden">
      <button
        onClick={() => navigate('/client/dashboard')}
        className="p-1.5 rounded-md hover:bg-accent -ml-1 no-min-height"
        aria-label="Back"
      >
        <ArrowLeft className="w-4 h-4 text-muted-foreground rtl:rotate-180" aria-hidden="true" />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">
          {session?.title || session?.filename || 'Session Board'}
        </p>
      </div>
      <span className="shrink-0 text-xs text-muted-foreground ltr-in-rtl">
        {session && new Date(session.createdAt).toLocaleDateString('he-IL')}
      </span>
    </div>
  );

  const MobileSummaryTab = () => (
    <div className="p-4 pb-24 space-y-3">
      {/* Summary bento card */}
      <div className="glass shadow-glass rounded-2xl p-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Session Summary</p>
        <p className="text-base text-foreground leading-relaxed">{session?.summary}</p>
      </div>

      {/* Stats */}
      <div className="glass shadow-glass rounded-2xl p-4 flex items-center gap-6">
        <div className="text-center">
          <p className="text-2xl font-bold text-primary">{totalPending}</p>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-semibold">Pending</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-emerald-600">{tasks.filter(t => t.completed).length}</p>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-semibold">Done</p>
        </div>
        <div className="ms-auto">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50"
            onClick={handleCopy}
          >
            <Copy className="h-3.5 w-3.5" /> Copy
          </Button>
        </div>
      </div>

      {/* Date + metadata */}
      <div className="glass shadow-glass rounded-2xl px-4 py-3 text-sm text-muted-foreground">
        <span className="ltr-in-rtl">{session && new Date(session.createdAt).toLocaleString('he-IL')}</span>
      </div>
    </div>
  );

  const MobileTasksTab = () => (
    <div className="p-4 pb-24">
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
          <div className="rounded-full bg-muted p-5">
            <CheckCircle2 className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
          </div>
          <p className="text-sm text-muted-foreground">No tasks for this session</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Client tasks — interactive, shown first on mobile */}
          {clientTasks.length > 0 && (
            <div className="flex flex-col rounded-2xl border-2 border-emerald-200 overflow-hidden">
              <div className="flex items-center gap-2.5 px-4 py-3 bg-white dark:bg-card border-b border-slate-100 dark:border-border sticky top-[52px] z-10">
                <span className="text-sm font-bold">My Tasks</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {clientTasks.filter(t => t.completed).length}/{clientTasks.length}
                </span>
              </div>
              <div className="space-y-3 p-4 bg-slate-50/60 dark:bg-muted/20">
                {clientTasks.map(item => (
                  <ClientTaskCard key={item.id} item={item} onToggle={handleToggle} />
                ))}
              </div>
            </div>
          )}

          {/* Advisor tasks — read-only, shown below client tasks */}
          {advisorTasks.length > 0 && (
            <details className="rounded-2xl border-2 border-indigo-200 overflow-hidden">
              <summary className="flex items-center gap-2.5 px-4 py-3 bg-white dark:bg-card border-b border-slate-100 dark:border-border cursor-pointer list-none sticky top-[52px] z-10">
                <span className="text-sm font-bold">Advisor Tasks</span>
                <span className="ml-auto text-xs text-muted-foreground">read-only</span>
              </summary>
              <div className="space-y-3 p-4 bg-slate-50/60 dark:bg-muted/20">
                {advisorTasks.map(item => (
                  <AdvisorTaskCard key={item.id} item={item} />
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );

  const mobileTabBar = (
    <div className="fixed bottom-0 inset-x-0 z-30 md:hidden glass border-t border-border/50 flex">
      {[
        { id: 'summary', label: 'Summary', Icon: FileText },
        { id: 'tasks',   label: 'Tasks',   Icon: ListChecks },
      ].map(({ id, label, Icon }) => (
        <button
          key={id}
          onClick={() => setActiveTab(id as typeof activeTab)}
          className={[
            'flex-1 flex flex-col items-center justify-center gap-1 py-3 text-[11px] font-medium transition-colors no-min-height',
            activeTab === id ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
          ].join(' ')}
          aria-label={label}
          aria-selected={activeTab === id}
        >
          <Icon className="w-5 h-5" aria-hidden="true" />
          {label}
        </button>
      ))}
    </div>
  );

  // ---- Render ----

  return (
    <ClientLayout
      title="Session Board"
      subtitle={session?.filename ?? "Task checklist for this session"}
    >
      {isMobile ? (
        <div className="flex flex-col min-h-[100dvh] -mx-4 -mt-4">
          {mobileHeader}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
              >
                {activeTab === 'summary' && <MobileSummaryTab />}
                {activeTab === 'tasks' && <MobileTasksTab />}
              </motion.div>
            </AnimatePresence>
          </div>
          {mobileTabBar}
        </div>
      ) : (
        <>
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
                <CardContent className="px-4 md:px-5 py-4 flex flex-col sm:flex-row items-start gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-indigo-900 mb-1">Session Summary</p>
                    <p className="text-sm text-slate-700 leading-relaxed">{session.summary}</p>
                    <p className="text-xs text-slate-400 mt-2">
                      {new Date(session.createdAt).toLocaleString("he-IL")}
                    </p>
                  </div>
                  <div className="sm:shrink-0 flex flex-row sm:flex-col items-center gap-3">
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
                      onClick={handleCopy}
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
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
              {/* Advisor column — read-only */}
              <div className="flex flex-col rounded-2xl border-2 border-indigo-200 overflow-hidden">
                <div className="flex items-center gap-2.5 px-5 py-3.5 bg-white border-b border-slate-100">
                  <UserCog className="h-4 w-4 text-slate-500" />
                  <span className="text-sm font-bold">Advisor Tasks</span>
                  <span className="ml-auto rounded-full px-2 py-0.5 text-[11px] font-semibold bg-slate-100 text-slate-500">
                    read-only
                  </span>
                </div>
                <div className="flex-1 space-y-3 p-5 bg-slate-50/60 min-h-[200px] overflow-y-auto overscroll-contain">
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
                <div className="flex-1 space-y-3 p-5 bg-slate-50/60 min-h-[200px] overflow-y-auto overscroll-contain">
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
        </>
      )}
    </ClientLayout>
  );
}
