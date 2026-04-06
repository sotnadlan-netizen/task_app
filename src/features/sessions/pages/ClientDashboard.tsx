import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/core/state/AuthContext";
import { useRealtimeSessions } from "@/shared/hooks/useRealtimeSessions";
import { useNavigate } from "react-router-dom";
import {
  ChevronRight,
  CheckCircle2,
  Clock,
  ListTodo,
  Layers,
  Bell,
  X,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { ClientLayout } from "@/shared/components/layout/ClientLayout";
import { apiFetchSessions, type Session } from "@/core/utils/storage";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { toast } from "sonner";
import { ProgressGraph } from "@/features/clients/components/ProgressGraph";
import { TimeCapsule } from "@/features/clients/components/TimeCapsule";

function SkeletonRow() {
  return (
    <TableRow>
      <TableCell className="pl-5 py-3.5">
        <Skeleton className="h-4 w-48 mb-1" />
        <Skeleton className="h-3 w-64" />
      </TableCell>
      <TableCell><Skeleton className="h-3 w-20" /></TableCell>
      <TableCell><Skeleton className="h-3 w-10" /></TableCell>
      <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
      <TableCell className="pr-5"><Skeleton className="h-7 w-20 rounded-md" /></TableCell>
    </TableRow>
  );
}

function StatusBadge({ taskCount, completedCount }: { taskCount: number; completedCount: number }) {
  if (taskCount === 0)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-500">
        No tasks
      </span>
    );
  if (completedCount === taskCount)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
        <CheckCircle2 className="h-3 w-3" /> Complete
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 text-[11px] font-medium text-indigo-700">
      <Clock className="h-3 w-3" /> Active
    </span>
  );
}

export default function ClientDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  // Realtime: receive new/updated/deleted sessions instantly
  useRealtimeSessions(setSessions, null, user?.email ?? null);
  const [loading, setLoading] = useState(true);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [lastVisit] = useState<number>(() => {
    const stored = localStorage.getItem("client_last_visit");
    return stored ? parseInt(stored, 10) : 0;
  });

  const loadSessions = useCallback(() => {
    setLoading(true);
    apiFetchSessions()
      .then(setSessions)
      .catch(() => toast.error("Failed to load sessions"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  useEffect(() => {
    if (!loading) {
      localStorage.setItem("client_last_visit", Date.now().toString());
    }
  }, [loading]);

  const newSessions = sessions.filter(
    (s) => new Date(s.createdAt).getTime() > lastVisit
  );

  const totalTasks = sessions.reduce((a, s) => a + (s.taskCount ?? 0), 0);
  const totalCompleted = sessions.reduce((a, s) => a + (s.completedCount ?? 0), 0);
  const activeSessions = sessions.filter(
    (s) => (s.taskCount ?? 0) > 0 && (s.completedCount ?? 0) < (s.taskCount ?? 0)
  ).length;

  const stats = [
    { label: "Total Sessions", value: sessions.length, icon: Layers, color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "Active Sessions", value: activeSessions, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Total Tasks", value: totalTasks, icon: ListTodo, color: "text-slate-600", bg: "bg-slate-100" },
    { label: "Completed Tasks", value: totalCompleted, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
  ];

  const mostRecent = sessions[0];

  return (
    <ClientLayout title="My Sessions" subtitle="Advisory sessions assigned to you">
      {/* New sessions notification banner */}
      {!loading && !bannerDismissed && newSessions.length > 0 && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3">
          <Bell className="h-4 w-4 text-indigo-600 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-indigo-800">
              {newSessions.length === 1
                ? "1 new session has been shared with you"
                : `${newSessions.length} new sessions have been shared with you`}
            </p>
            <p className="text-xs text-indigo-600 mt-0.5">
              Your advisor has shared new advisory sessions since your last visit.
            </p>
          </div>
          <button onClick={() => setBannerDismissed(true)} aria-label="Dismiss notification" className="no-min-height text-indigo-500 hover:text-indigo-700 transition-colors shrink-0 focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-1 rounded">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Progress Map */}
      {!loading && (
        <>
          <ProgressGraph
            totalTasks={totalTasks}
            completedTasks={totalCompleted}
            sessionCount={sessions.length}
          />
          {mostRecent && mostRecent.summary && (
            <TimeCapsule
              summary={mostRecent.summary}
              createdAt={mostRecent.createdAt}
              filename={mostRecent.filename}
            />
          )}
        </>
      )}

      {/* Executive Summary */}
      <div className="glass shadow-glass rounded-2xl p-6 mb-6">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-3 mb-3">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Your Journey Summary</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Updated after each session with your advisor</p>
          </div>
          <span className="shrink-0 px-2.5 py-1 rounded-full bg-primary/15 text-primary text-xs font-medium border border-primary/25">
            In Progress
          </span>
        </div>
        <p className="text-base text-foreground/80 leading-relaxed">
          You&apos;re making excellent progress on your mortgage application. Your advisor has reviewed your documents and identified priority actions. Complete these steps to move to the next stage.
        </p>
        <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-border/50 text-sm text-muted-foreground">
          <span>📁 Documents: <strong className="text-foreground">4/6 submitted</strong></span>
          <span>✅ Tasks: <strong className="text-foreground">2/5 complete</strong></span>
        </div>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl p-4 border border-border bg-card space-y-2">
              <Skeleton className="h-3 w-14 rounded" />
              <Skeleton className="h-7 w-20 rounded" />
              <Skeleton className="h-3 w-16 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8">
          {stats.map(({ label, value, icon: Icon, color, bg }) => (
            <Card key={label} className="border-slate-200 shadow-sm">
              <CardContent className="p-4 md:p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] md:text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
                    <p className="text-2xl md:text-3xl font-bold text-slate-900 mt-1">{value}</p>
                  </div>
                  <div className={`rounded-lg ${bg} p-2 md:p-2.5`}>
                    <Icon className={`h-4 w-4 ${color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Progress Checklist */}
      <div className="glass shadow-glass rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Steps to Completion</h2>
        <ol className="space-y-3">
          {[
            { step: 'Initial consultation completed', done: true },
            { step: 'Submit proof of income documents', done: true },
            { step: 'Advisor review of credit history', done: false, active: true },
            { step: 'Pre-approval application submitted', done: false },
            { step: 'Property valuation & final approval', done: false },
          ].map((item, i) => (
            <li key={i} className={`flex items-center gap-3 text-sm ${item.done ? 'text-muted-foreground' : item.active ? 'text-foreground font-medium' : 'text-muted-foreground/50'}`}>
              <span className={`flex-none w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 ${item.done ? 'bg-success/20 border-success text-success' : item.active ? 'bg-primary/20 border-primary text-primary' : 'border-border text-muted-foreground/30'}`}>
                {item.done ? '✓' : i + 1}
              </span>
              <span className={item.done ? 'line-through' : ''}>{item.step}</span>
              {item.active && (
                <span className="ml-auto text-[11px] px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25">
                  Current
                </span>
              )}
            </li>
          ))}
        </ol>
      </div>

      {/* Sessions table */}
      <Card className="border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-800">Your Sessions</p>
          <p className="text-xs text-slate-400">{sessions.length} total</p>
        </div>
        {loading ? (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide pl-5">Session</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">My Tasks</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide pr-5" />
              </TableRow>
            </TableHeader>
            <TableBody>
              <SkeletonRow /><SkeletonRow /><SkeletonRow /><SkeletonRow /><SkeletonRow />
            </TableBody>
          </Table>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <circle cx="40" cy="40" r="40" fill="#F0FDF4" />
              <rect x="22" y="24" width="36" height="32" rx="4" fill="#BBF7D0" />
              <rect x="28" y="32" width="24" height="2.5" rx="1.25" fill="#4ADE80" />
              <rect x="28" y="38" width="18" height="2.5" rx="1.25" fill="#86EFAC" />
              <rect x="28" y="44" width="20" height="2.5" rx="1.25" fill="#86EFAC" />
              <circle cx="55" cy="55" r="10" fill="#22C55E" />
              <path d="M51 55l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-700">No sessions yet</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Your advisor will share advisory sessions with you here once they've been recorded and processed.
              </p>
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide pl-5">
                  Session
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Date
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  My Tasks
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Status
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide pr-5" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((s) => (
                <TableRow
                  key={s.id}
                  className="cursor-pointer hover:bg-slate-50/80 transition-colors"
                  onClick={() => navigate(`/client/board/${s.id}`)}
                >
                  <TableCell className="pl-5 py-3.5">
                    <p className="text-sm font-semibold text-slate-900 truncate max-w-[240px]">
                      {s.title || s.filename}
                    </p>
                    <p className="text-xs text-slate-400 truncate max-w-[280px] mt-0.5">
                      {s.summary}
                    </p>
                  </TableCell>
                  <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                    {new Date(s.createdAt).toLocaleDateString("he-IL", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                    <br />
                    <span className="text-slate-400">
                      {new Date(s.createdAt).toLocaleTimeString("he-IL", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-semibold text-slate-700">
                      {s.completedCount ?? 0}
                      <span className="font-normal text-slate-400">/{s.taskCount ?? 0}</span>
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      taskCount={s.taskCount ?? 0}
                      completedCount={s.completedCount ?? 0}
                    />
                  </TableCell>
                  <TableCell className="pr-5">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-3 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/client/board/${s.id}`);
                      }}
                    >
                      View Tasks <ChevronRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </ClientLayout>
  );
}
