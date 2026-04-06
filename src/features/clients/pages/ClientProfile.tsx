import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  ListTodo,
  Layers,
  CalendarDays,
} from "lucide-react";
import { Layout } from "@/shared/components/layout/Layout";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { cn } from "@/core/utils/utils";
import {
  apiFetchSessions,
  apiFetchTasksByClient,
  apiToggleTask,
  type Session,
  type ActionItem,
} from "@/core/utils/storage";
import { toast } from "sonner";
import i18n from "@/i18n";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(email: string) {
  return email.slice(0, 2).toUpperCase();
}

function daysAgo(d: string) {
  return Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000);
}

function SentimentIcon({ rate }: { rate: number }) {
  if (rate >= 80) return <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />;
  if (rate >= 30) return <Clock className="h-4 w-4 shrink-0 text-amber-400" />;
  return <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />;
}

const PRIORITY_COLORS: Record<string, string> = {
  High:   "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
  Medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  Low:    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

// ─── Task Row ─────────────────────────────────────────────────────────────────

function TaskRow({
  task,
  onToggle,
  dimmed = false,
}: {
  task: ActionItem;
  onToggle: (id: string) => void;
  dimmed?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-lg border p-2.5 transition-colors",
        dimmed
          ? "border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/30 opacity-60"
          : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900"
      )}
    >
      <button
        onClick={() => onToggle(task.id)}
        className={cn(
          "mt-0.5 h-4 w-4 rounded border-2 shrink-0 transition-all no-min-height flex items-center justify-center",
          task.completed
            ? "bg-emerald-500 border-emerald-500 text-white"
            : "border-slate-300 dark:border-slate-600 hover:border-indigo-400"
        )}
        aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
      >
        {task.completed && <CheckCircle2 className="h-3 w-3" />}
      </button>

      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-xs font-medium leading-snug",
            dimmed
              ? "line-through text-slate-400 dark:text-slate-500"
              : "text-slate-800 dark:text-slate-100"
          )}
        >
          {task.title}
        </p>
        {task.description && (
          <p className="text-[10px] text-slate-400 mt-0.5 truncate">{task.description}</p>
        )}
      </div>

      <Badge
        className={cn(
          "text-[9px] px-1 py-0 rounded border-0 shrink-0 no-min-height leading-4",
          PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS["Low"]
        )}
      >
        {task.priority}
      </Badge>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ClientProfile() {
  const { clientEmail: encoded } = useParams<{ clientEmail: string }>();
  const clientEmail = decodeURIComponent(encoded ?? "");
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [tasks, setTasks] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      apiFetchSessions().then((all) =>
        all
          .filter((s) => (s.clientEmail ?? "") === clientEmail)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      ),
      apiFetchTasksByClient(clientEmail),
    ])
      .then(([s, tk]) => {
        setSessions(s);
        setTasks(tk);
      })
      .catch(() => toast.error("Failed to load client profile"))
      .finally(() => setLoading(false));
  }, [clientEmail]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleToggle(taskId: string) {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t))
    );
    try {
      await apiToggleTask(taskId);
    } catch {
      toast.error("Failed to update task");
      load();
    }
  }

  // ── Derived stats ────────────────────────────────────────────────────────────
  const completedCount = tasks.filter((t) => t.completed).length;
  const totalTasks = tasks.length;
  const completionRate = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;
  const status: "green" | "yellow" | "red" =
    totalTasks === 0 ? "red" : completionRate >= 80 ? "green" : completionRate >= 30 ? "yellow" : "red";

  const avatarBg = {
    green:  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    yellow: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    red:    "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  }[status];

  const badgeClass = {
    green:  "bg-emerald-100 text-emerald-700",
    yellow: "bg-amber-100 text-amber-700",
    red:    "bg-red-100 text-red-700",
  }[status];

  const statusLabel = {
    green:  t("clients.healthy"),
    yellow: t("clients.neutral"),
    red:    t("clients.atRisk"),
  }[status];

  const pendingTasks = tasks.filter((t) => !t.completed);
  const doneTasks    = tasks.filter((t) => t.completed);

  const locale =
    i18n.language === "he" ? "he-IL" : i18n.language === "ru" ? "ru-RU" : "en-US";

  // ── Skeleton loading ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Layout title="Client Profile">
        <Skeleton className="h-8 w-24 rounded mb-4" />
        <Skeleton className="h-24 w-full rounded-xl mb-6" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={clientEmail} subtitle={t("clients.subtitle")}>

      {/* Back navigation */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/provider/clients")}
        className="gap-1.5 mb-4 -ms-2 h-8 text-slate-500 hover:text-slate-800 dark:hover:text-slate-100 no-min-height"
      >
        <ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
        {t("common.back")}
      </Button>

      {/* Client header card */}
      <Card className="mb-6 border-slate-200 dark:border-slate-800 shadow-sm">
        <CardContent className="p-4 flex items-center gap-4">
          <div
            className={cn(
              "h-14 w-14 rounded-full flex items-center justify-center text-lg font-bold shrink-0",
              avatarBg
            )}
            aria-hidden="true"
          >
            {initials(clientEmail)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                {clientEmail}
              </p>
              <Badge className={cn("text-[10px] px-1.5 py-0.5 rounded-full border-0", badgeClass)}>
                {statusLabel}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t("clients.sessions", { count: sessions.length })}
              {sessions.length > 0 && (
                <> · {t("clients.lastSession", { count: daysAgo(sessions[0].createdAt) })}</>
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: t("dashboard.totalSessions"), value: sessions.length,  icon: Layers,       color: "text-indigo-600",  bg: "bg-indigo-50 dark:bg-indigo-950/40" },
          { label: t("dashboard.totalTasks"),    value: totalTasks,        icon: ListTodo,     color: "text-slate-600",   bg: "bg-slate-100 dark:bg-slate-800" },
          { label: t("dashboard.completedTasks"),value: completedCount,    icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/40" },
          { label: "Completion",                  value: `${completionRate}%`, icon: CalendarDays, color: "text-amber-600",   bg: "bg-amber-50 dark:bg-amber-950/40" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardContent className="p-3 flex items-center gap-3">
              <div className={cn("rounded-lg p-2 shrink-0", bg)}>
                <Icon className={cn("h-4 w-4", color)} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-slate-500 uppercase tracking-wide truncate">{label}</p>
                <p className="text-xl font-bold text-slate-900 dark:text-slate-100 leading-none mt-0.5">
                  {value}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sessions + Tasks two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Sessions timeline ──────────────────────────────────────────────── */}
        <section aria-labelledby="sessions-heading">
          <h2
            id="sessions-heading"
            className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2"
          >
            <Layers className="h-4 w-4 text-indigo-500" aria-hidden="true" />
            {t("dashboard.recentSessions")}
            <span className="text-xs font-normal text-slate-400">({sessions.length})</span>
          </h2>

          {sessions.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">{t("clients.noSessions")}</p>
          ) : (
            <div className="space-y-2">
              {sessions.map((s) => {
                const total = s.taskCount ?? 0;
                const done  = s.completedCount ?? 0;
                const rate  = total > 0 ? Math.round((done / total) * 100) : 0;
                return (
                  <button
                    key={s.id}
                    onClick={() => navigate(`/provider/board/${s.id}`)}
                    className="w-full text-start flex items-start gap-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                  >
                    <SentimentIcon rate={rate} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                        {s.title ?? s.filename}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(s.createdAt).toLocaleDateString(locale, {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                      <div className="mt-2 space-y-0.5">
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span>{t("board.tasks")}</span>
                          <span dir="ltr">{done}/{total}</span>
                        </div>
                        <div className="h-1 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              rate >= 80 ? "bg-emerald-500" : rate >= 30 ? "bg-amber-400" : "bg-red-400"
                            )}
                            style={{ width: `${rate}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <ChevronRight
                      className="h-4 w-4 text-slate-300 group-hover:text-indigo-400 shrink-0 mt-1 rtl:rotate-180 transition-colors"
                      aria-hidden="true"
                    />
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Tasks board ────────────────────────────────────────────────────── */}
        <section aria-labelledby="tasks-heading">
          <h2
            id="tasks-heading"
            className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2"
          >
            <ListTodo className="h-4 w-4 text-emerald-500" aria-hidden="true" />
            {t("nav.tasks")}
            <span className="text-xs font-normal text-slate-400">
              · {pendingTasks.length} {t("board.pending")}
            </span>
          </h2>

          {/* Overall progress */}
          {totalTasks > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                <span>{t("tasks.pendingCount", { done: completedCount, total: totalTasks })}</span>
                <span>{completionRate}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    status === "green" ? "bg-emerald-500"
                    : status === "yellow" ? "bg-amber-400"
                    : "bg-red-500"
                  )}
                  style={{ width: `${completionRate}%` }}
                />
              </div>
            </div>
          )}

          {tasks.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">{t("board.noTasks")}</p>
          ) : (
            <div className="space-y-1.5">
              {pendingTasks.map((task) => (
                <TaskRow key={task.id} task={task} onToggle={handleToggle} />
              ))}

              {doneTasks.length > 0 && pendingTasks.length > 0 && (
                <div className="border-t border-slate-100 dark:border-slate-800 pt-2 mt-2">
                  <p className="text-[10px] text-slate-400 mb-1.5 uppercase tracking-wide">
                    {t("board.done")}
                  </p>
                </div>
              )}

              {doneTasks.map((task) => (
                <TaskRow key={task.id} task={task} onToggle={handleToggle} dimmed />
              ))}
            </div>
          )}
        </section>

      </div>
    </Layout>
  );
}
