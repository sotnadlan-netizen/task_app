import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Circle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Layout } from "@/components/Layout";
import { cn } from "@/lib/utils";
import { apiFetchSessions, type Session } from "@/lib/storage";
import { useRealtimeSessions } from "@/hooks/useRealtimeSessions";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// ─── Types & helpers ──────────────────────────────────────────────────────────

interface PendingTask {
  sessionId:   string;
  sessionTitle: string;
  clientEmail: string;
  createdAt:   string;
  taskIndex:   number;
  totalTasks:  number;
  completed:   number;
  daysOld:     number;
}

function buildPendingList(sessions: Session[]): PendingTask[] {
  return sessions
    .filter((s) => (s.taskCount ?? 0) > (s.completedCount ?? 0))
    .map((s) => ({
      sessionId:    s.id,
      sessionTitle: s.title ?? s.filename,
      clientEmail:  s.clientEmail ?? "(no email)",
      createdAt:    s.createdAt,
      taskIndex:    0,
      totalTasks:   s.taskCount    ?? 0,
      completed:    s.completedCount ?? 0,
      daysOld:      Math.floor((Date.now() - new Date(s.createdAt).getTime()) / 86_400_000),
    }))
    .sort((a, b) => b.daysOld - a.daysOld);
}

function urgencyClass(days: number) {
  if (days >= 14) return "text-red-600 bg-red-50";
  if (days >= 7)  return "text-amber-600 bg-amber-50";
  return "text-slate-500 bg-slate-50";
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProviderTasks() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useRealtimeSessions(setSessions, user?.id ?? null);

  const load = useCallback(() => {
    setLoading(true);
    apiFetchSessions()
      .then(setSessions)
      .catch(() => toast.error("Failed to load tasks"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const tasks = useMemo(() => buildPendingList(sessions), [sessions]);

  return (
    <Layout title="משימות פתוחות" subtitle="מרכז משימות — כל הפגישות עם פעולות ממתינות">
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 rounded-xl border border-slate-100 bg-white p-4">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center py-24 gap-3 text-center">
          <CheckCircle2 className="h-10 w-10 text-emerald-400" />
          <p className="text-sm font-semibold text-slate-600">כל המשימות הושלמו!</p>
          <p className="text-xs text-slate-400">אין פגישות עם משימות פתוחות כרגע.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-slate-400 mb-4">
            <span dir="ltr" className="inline font-semibold text-slate-700">{tasks.length}</span>
            {" "}פגישות עם משימות ממתינות
          </p>
          {tasks.map((t) => {
            const pending = t.totalTasks - t.completed;
            return (
              <div
                key={t.sessionId}
                className="flex items-center gap-4 rounded-xl border border-slate-100 bg-white dark:bg-slate-800 dark:border-slate-700 p-4 shadow-sm"
              >
                {/* Icon */}
                <div className={cn("h-9 w-9 rounded-full flex items-center justify-center shrink-0", urgencyClass(t.daysOld))}>
                  {t.daysOld >= 7 ? <Clock className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                    {t.sessionTitle}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">
                    {t.clientEmail} · לפני{" "}
                    <span dir="ltr" className="inline">{t.daysOld}</span> ימים
                  </p>
                </div>

                {/* Task count */}
                <div className="text-end shrink-0">
                  <p className="text-xs text-slate-500 dark:text-slate-400">משימות פתוחות</p>
                  <p className="text-base font-bold text-indigo-600" dir="ltr">{pending}/{t.totalTasks}</p>
                </div>

                {/* Urgency badge */}
                {t.daysOld >= 7 && (
                  <Badge className={cn("text-[10px] border-0 shrink-0", t.daysOld >= 14 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700")}>
                    {t.daysOld >= 14 ? "דחוף" : "מעוכב"}
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
}
