import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Layout } from "@/components/Layout";
import { RecordDialog } from "@/components/features/RecordDialog";
import {
  apiFetchSessions,
  apiProcessAudio,
  apiLoadMockData,
  apiFetchConfig,
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

export default function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [recordOpen, setRecordOpen] = useState(false);
  const [processingStage, setProcessingStage] = useState<null | "uploading" | "analyzing">(null);
  const processing = processingStage !== null;
  const [loadingMock, setLoadingMock] = useState(false);

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
      navigate(`/board/${session.id}`);
    } catch (err: unknown) {
      console.error("[Dashboard] process-audio failed:", err);
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

  // Aggregate stats
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
      <div className="flex items-center gap-3 mb-6">
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
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-800">Recent Sessions</p>
          <p className="text-xs text-slate-400">{sessions.length} total</p>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <div className="rounded-full bg-slate-100 p-4">
              <Mic className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-500">No sessions yet</p>
            <p className="text-xs text-slate-400">
              Click <span className="font-semibold">Record Meeting</span> or load demo data to get started.
            </p>
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
                  Tasks
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
                  onClick={() => navigate(`/board/${s.id}`)}
                >
                  <TableCell className="pl-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900 truncate max-w-[220px]">
                        {s.title || s.filename}
                      </p>
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 border border-green-200 px-2 py-0.5 text-[10px] font-medium text-green-700 whitespace-nowrap shrink-0">
                        <ShieldCheck className="h-3 w-3" /> Audio Deleted
                      </span>
                    </div>
                    {s.title && (
                      <p className="text-[11px] text-slate-400 truncate max-w-[280px] mt-0.5 font-mono">
                        {s.filename}
                      </p>
                    )}
                    <p className="text-xs text-slate-400 truncate max-w-[280px] mt-0.5">
                      {s.summary}
                    </p>
                    <p className="text-[10px] text-slate-300 mt-1">
                      {t("dashboard.privacyNotice")}
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
                        navigate(`/board/${s.id}`);
                      }}
                    >
                      View Board <ChevronRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
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
    </Layout>
  );
}
