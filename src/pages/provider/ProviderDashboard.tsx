import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mic,
  Database,
  Loader2,
  ChevronRight,
  CheckCircle2,
  Clock,
  ListTodo,
  Layers,
  Sparkles,
  ShieldCheck,
  Trash2,
  Search,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Layout } from "@/components/Layout";
import { RecordDialog } from "@/components/features/RecordDialog";
import {
  apiFetchSessions,
  apiProcessAudio,
  apiLoadMockData,
  apiFetchConfig,
  apiDeleteSession,
  type Session,
} from "@/lib/storage";
import { toast } from "sonner";

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

function SkeletonRow() {
  return (
    <TableRow>
      <TableCell className="pl-5 py-3.5">
        <Skeleton className="h-4 w-48" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-3 w-32" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-3 w-24" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-3 w-12" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-16 rounded-full" />
      </TableCell>
      <TableCell className="pr-5">
        <Skeleton className="h-7 w-20" />
      </TableCell>
    </TableRow>
  );
}

export default function ProviderDashboard() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [recordOpen, setRecordOpen] = useState(false);
  const [processingStage, setProcessingStage] = useState<null | "uploading" | "analyzing">(null);
  const processing = processingStage !== null;
  const [loadingMock, setLoadingMock] = useState(false);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Session | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadSessions = useCallback(() => {
    setLoading(true);
    apiFetchSessions()
      .then(setSessions)
      .catch(() => toast.error("Failed to load sessions"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  async function handleRecordingComplete(blob: Blob, clientEmail: string) {
    setRecordOpen(false);
    setProcessingStage("uploading");
    try {
      const { systemPrompt } = await apiFetchConfig();
      setProcessingStage("analyzing");
      const { session, tasks } = await apiProcessAudio(blob, systemPrompt, "recording.webm", clientEmail);
      toast.success(`${tasks.length} tasks extracted`, { description: session.filename });
      loadSessions();
      navigate(`/provider/board/${session.id}`);
    } catch (err: unknown) {
      console.error("[ProviderDashboard] process-audio failed:", err);
      toast.error("Processing failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setProcessingStage(null);
    }
  }

  async function handleLoadMock() {
    setLoadingMock(true);
    try {
      const { sessions: s, tasks: t } = await apiLoadMockData();
      toast.success(`Demo data loaded`, { description: `${s} sessions · ${t} tasks` });
      loadSessions();
    } catch {
      toast.error("Failed to load demo data");
    } finally {
      setLoadingMock(false);
    }
  }

  async function handleDeleteConfirmed() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiDeleteSession(deleteTarget.id);
      toast.success("Session deleted");
      setSessions((prev) => prev.filter((s) => s.id !== deleteTarget.id));
    } catch {
      toast.error("Failed to delete session");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  const filteredSessions = sessions.filter((s) => {
    // FE-011: Search filter by client email (case-insensitive)
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!s.clientEmail?.toLowerCase().includes(q)) return false;
    }
    // FE-013: Date from filter
    if (dateFrom) {
      const sessionDate = new Date(s.createdAt);
      const fromDate = new Date(dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      if (sessionDate < fromDate) return false;
    }
    // FE-013: Date to filter
    if (dateTo) {
      const sessionDate = new Date(s.createdAt);
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      if (sessionDate > toDate) return false;
    }
    return true;
  });

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

  return (
    <Layout title="Dashboard" subtitle="Recent advisory sessions and extracted insights">
      {/* Processing overlay */}
      {processing && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-5 rounded-2xl bg-white p-10 shadow-2xl max-w-sm text-center">
            <div className="relative">
              <div className="h-16 w-16 rounded-full bg-indigo-100 flex items-center justify-center">
                <Sparkles className="h-7 w-7 text-indigo-600" />
              </div>
              <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
            </div>
            <div>
              <p className="text-base font-bold text-slate-900">
                {processingStage === "uploading" ? "Uploading recording..." : "AI Agent is listening"}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                {processingStage === "uploading"
                  ? "Sending audio to the server..."
                  : "Extracting insights and action items..."}
              </p>
            </div>
            <div className="flex gap-1">
              {[0, 0.15, 0.3].map((delay, i) => (
                <div
                  key={i}
                  className="h-2 w-2 rounded-full bg-indigo-500 animate-bounce"
                  style={{ animationDelay: `${delay}s` }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="border-slate-200 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
                </div>
                <div className={`rounded-lg ${bg} p-2.5`}>
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <Button
          onClick={() => setRecordOpen(true)}
          className="h-10 bg-indigo-600 hover:bg-indigo-700 gap-2 shadow-sm shadow-indigo-200"
        >
          <Mic className="h-4 w-4" />
          Record Meeting
        </Button>
        <Button
          variant="outline"
          onClick={handleLoadMock}
          disabled={loadingMock}
          className="h-10 border-slate-200 text-slate-600 gap-2"
        >
          {loadingMock ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
          Load Demo Data
        </Button>
      </div>

      {/* Sessions table */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-800">Recent Sessions</p>
            <p className="text-xs text-slate-400">
              {filteredSessions.length} of {sessions.length}
            </p>
          </div>
          {/* FE-011 + FE-013: Filter controls row */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by client email…"
                className="pl-9 h-9 border-slate-200 text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-slate-400 shrink-0" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="border border-slate-200 rounded-md px-3 py-1.5 text-xs text-slate-700 bg-white"
                aria-label="From date"
              />
              <span className="text-xs text-slate-400">—</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="border border-slate-200 rounded-md px-3 py-1.5 text-xs text-slate-700 bg-white"
                aria-label="To date"
              />
            </div>
          </div>
        </div>
        {/* FE-037: Skeleton loading rows */}
        {loading ? (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide pl-5">
                  Session
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Client
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Date
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Tasks
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Status
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide pr-5" />
              </TableRow>
            </TableHeader>
            <TableBody>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </TableBody>
          </Table>
        ) : filteredSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <div className="rounded-full bg-slate-100 p-4">
              <Mic className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-500">
              {search || dateFrom || dateTo ? "No sessions match your filters" : "No sessions yet"}
            </p>
            {!search && !dateFrom && !dateTo && (
              <p className="text-xs text-slate-400">
                Click <span className="font-semibold">Record Meeting</span> or load demo data to get started.
              </p>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide pl-5">
                  Session
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Client
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Date
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Tasks
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Status
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide pr-5" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSessions.map((s) => (
                <TableRow
                  key={s.id}
                  className="cursor-pointer hover:bg-slate-50/80 transition-colors"
                  onClick={() => navigate(`/provider/board/${s.id}`)}
                >
                  <TableCell className="pl-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-800 truncate max-w-[200px]">
                        {s.filename}
                      </p>
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 border border-green-200 px-2 py-0.5 text-[10px] font-medium text-green-700 whitespace-nowrap shrink-0">
                        <ShieldCheck className="h-3 w-3" /> Audio Deleted
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 truncate max-w-[280px] mt-0.5">
                      {s.summary}
                    </p>
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {s.clientEmail ?? <span className="text-slate-300 italic">—</span>}
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
                  {/* FE-012: Delete button + View Board */}
                  <TableCell className="pr-5">
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-3 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                        onClick={() => navigate(`/provider/board/${s.id}`)}
                      >
                        View Board <ChevronRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(s); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <RecordDialog
        open={recordOpen}
        onClose={() => setRecordOpen(false)}
        onRecordingComplete={handleRecordingComplete}
      />

      {/* FE-012: Delete confirmation AlertDialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete session?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the session{" "}
              <strong>{deleteTarget?.filename}</strong> and all its tasks. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirmed}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
