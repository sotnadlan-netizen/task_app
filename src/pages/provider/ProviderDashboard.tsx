import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtimeSessions } from "@/hooks/useRealtimeSessions";
import { useNavigate } from "react-router-dom";
import {
  Mic,
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
  Music,
  MessageSquare,
  Send,
  CalendarPlus,
  X,
  LayoutDashboard,
  Users,
  BarChart2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
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
  apiFetchConfig,
  apiDeleteSession,
  apiUpdateTaskDetails,
  apiDeleteTask,
  apiChatHistory,
  apiAddCalendarEvent,
  apiAssignSession,
  type ActionItem,
  type Session,
  type NextMeetingSuggestion,
  type ChatHistoryResponse,
} from "@/lib/storage";
import { TaskReviewDialog, type AiTask } from "@/components/provider/TaskReviewDialog";
import { AssignClientDialog } from "@/components/provider/AssignClientDialog";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";

// Language cycle helper (mirrors Layout.tsx)
const LANGS = [
  { code: "he", dir: "rtl" as const },
  { code: "en", dir: "ltr" as const },
  { code: "ru", dir: "ltr" as const },
];
function cycleLang() {
  const current = localStorage.getItem("lng") ?? "he";
  const idx = LANGS.findIndex((l) => l.code === current);
  const next = LANGS[(idx + 1) % LANGS.length];
  localStorage.setItem("lng", next.code);
  document.documentElement.setAttribute("lang", next.code);
  document.documentElement.setAttribute("dir", next.dir);
  i18n.changeLanguage(next.code);
}

function StatusBadge({ taskCount, completedCount }: { taskCount: number; completedCount: number }) {
  const { t } = useTranslation();
  if (taskCount === 0)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-500">
        {t("dashboard.statusNoTasks")}
      </span>
    );
  if (completedCount === taskCount)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
        <CheckCircle2 className="h-3 w-3" /> {t("dashboard.statusComplete")}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 text-[11px] font-medium text-indigo-700">
      <Clock className="h-3 w-3" /> {t("dashboard.statusActive")}
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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, providerToken } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  // Realtime: push DB changes straight into local state (no polling)
  useRealtimeSessions(setSessions, user?.id ?? null);
  const [loading, setLoading] = useState(true);
  const [recordOpen, setRecordOpen] = useState(false);
  const [processingStage, setProcessingStage] = useState<null | "uploading" | "analyzing">(null);
  const processing = processingStage !== null;
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Session | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Calendar suggestion (cleared once dismissed or added)
  const [calendarSuggestion, setCalendarSuggestion] = useState<(NextMeetingSuggestion & { clientEmail?: string }) | null>(null);
  const [addingToCalendar, setAddingToCalendar] = useState(false);

  // RAG Chat panel
  const [chatOpen, setChatOpen] = useState(false);
  const [chatQuery, setChatQuery] = useState("");
  const [chatClientFilter, setChatClientFilter] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<{ role: "user" | "ai"; text: string; citations?: ChatHistoryResponse["citations"] }[]>([]);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Command palette state
  const [cmdOpen, setCmdOpen] = useState(false);

  // Unassigned session (recorded without client email)
  const [unassignedSessionId, setUnassignedSessionId] = useState<string | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen(p => !p);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Task review dialog state
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewData, setReviewData] = useState<{
    sessionId: string;
    tasks: AiTask[];
    summary: string;
    originalTasks: ActionItem[];
  } | null>(null);

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
      const { session, tasks, nextMeetingSuggestion } = await apiProcessAudio(blob, systemPrompt, "recording.webm", clientEmail);
      if (nextMeetingSuggestion) {
        setCalendarSuggestion({ ...nextMeetingSuggestion, clientEmail: clientEmail || undefined });
      }
      toast.success(`${tasks.length} tasks extracted — review before sending`, {
        description: session.filename,
      });
      loadSessions();
      // Open review dialog instead of navigating directly
      setReviewData({
        sessionId: session.id,
        summary: session.summary ?? "",
        tasks: tasks.map((t) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          assignee: t.assignee,
          priority: t.priority,
        })),
        originalTasks: tasks,
      });
      setReviewOpen(true);
      // If no client email was provided — flag for post-assignment
      if (!clientEmail) {
        setUnassignedSessionId(session.id);
      }
    } catch (err: unknown) {
      const code = (err as Error & { code?: string })?.code;
      if (code === "MODEL_CONFIG_ERROR") {
        toast.error("AI processing unavailable", {
          description: "The AI service is temporarily unavailable due to a configuration error. Please contact support.",
        });
      } else {
        toast.error("Processing failed", {
          description: err instanceof Error ? err.message : "Unknown error",
        });
      }
    } finally {
      setProcessingStage(null);
    }
  }

  async function handleApproveReview(approvedTasks: AiTask[]) {
    if (!reviewData) return;
    const { sessionId, originalTasks } = reviewData;

    // Determine which original tasks were deleted
    const approvedIds = new Set(approvedTasks.map((t) => t.id));
    const deletedIds = originalTasks
      .filter((t) => !approvedIds.has(t.id))
      // only delete tasks that actually exist in the DB (id doesn't start with "new-")
      .filter((t) => !t.id.startsWith("new-"))
      .map((t) => t.id);

    try {
      // Apply edits to existing tasks
      await Promise.all(
        approvedTasks
          .filter((t) => !t.id.startsWith("new-"))
          .map((t) => {
            const original = originalTasks.find((o) => o.id === t.id);
            const changed =
              !original ||
              original.title !== t.title ||
              original.priority !== t.priority ||
              (original.description ?? "") !== (t.description ?? "");
            if (!changed) return Promise.resolve();
            return apiUpdateTaskDetails(t.id, {
              title: t.title,
              description: t.description,
              priority: t.priority,
            });
          }),
      );

      // Delete removed tasks
      await Promise.all(deletedIds.map((id) => apiDeleteTask(id)));
    } catch {
      toast.error("Failed to apply some edits — check the board");
    }

    setReviewOpen(false);
    setReviewData(null);
    navigate(`/provider/board/${sessionId}`);
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

  async function handleChatSend() {
    const q = chatQuery.trim();
    if (!q || chatLoading) return;
    setChatHistory((h) => [...h, { role: "user", text: q }]);
    setChatQuery("");
    setChatLoading(true);
    try {
      const resp = await apiChatHistory(q, chatClientFilter || undefined);
      setChatHistory((h) => [...h, { role: "ai", text: resp.answer, citations: resp.citations }]);
      setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch (err) {
      toast.error("Chat failed", { description: err instanceof Error ? err.message : "Unknown error" });
      setChatHistory((h) => h.slice(0, -1)); // remove optimistic user message
    } finally {
      setChatLoading(false);
    }
  }

  async function handleAssign(email: string) {
    if (!unassignedSessionId) return;
    setAssigning(true);
    try {
      await apiAssignSession(unassignedSessionId, email);
      setSessions((prev) =>
        prev.map((s) => s.id === unassignedSessionId ? { ...s, clientEmail: email } : s)
      );
      toast.success(`Session assigned to ${email}`);
      setUnassignedSessionId(null);
      setAssignOpen(false);
    } catch {
      toast.error("Failed to assign session");
    } finally {
      setAssigning(false);
    }
  }

  async function handleAddCalendar() {
    if (!calendarSuggestion) return;
    if (!providerToken) {
      toast.error("Sign in with Google to add calendar events", { description: "Click 'Sign in with Google' and accept the calendar permission." });
      return;
    }
    setAddingToCalendar(true);
    try {
      const { htmlLink } = await apiAddCalendarEvent(providerToken, {
        title:       calendarSuggestion.title,
        date:        calendarSuggestion.date,
        time:        calendarSuggestion.time,
        clientEmail: calendarSuggestion.clientEmail,
      });
      toast.success(t("dashboard.addToCalendar"), {
        description: calendarSuggestion.title,
        action: { label: t("dashboard.open"), onClick: () => window.open(htmlLink, "_blank") },
      });
      setCalendarSuggestion(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "CALENDAR_TOKEN_EXPIRED") {
        toast.error(t("common.error"), { description: "Google Calendar authorization expired. Please sign in again." });
      } else {
        toast.error(t("common.error"), { description: msg });
      }
    } finally {
      setAddingToCalendar(false);
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

  const uniqueClients = useMemo(
    () => Array.from(new Set(sessions.map((s) => s.clientEmail).filter(Boolean))) as string[],
    [sessions]
  );

  const stats = [
    { label: t("dashboard.totalSessions"), value: sessions.length, icon: Layers, color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: t("dashboard.activeSessions"), value: activeSessions, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
    { label: t("dashboard.totalTasks"), value: totalTasks, icon: ListTodo, color: "text-slate-600", bg: "bg-slate-100" },
    { label: t("dashboard.completedTasks"), value: totalCompleted, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
  ];

  return (
    <Layout title={t("nav.home")} subtitle={t("dashboard.subtitle")}>
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
                {processingStage === "uploading" ? t("dashboard.uploading") : t("dashboard.analyzing")}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                {processingStage === "uploading"
                  ? t("dashboard.uploadingDesc")
                  : t("dashboard.analyzingDesc")}
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

      {/* ── Calendar Suggestion Banner ─────────────────────────────────────────── */}
      {calendarSuggestion && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50 dark:bg-indigo-950/30 dark:border-indigo-800 px-4 py-3">
          <CalendarPlus className="h-5 w-5 text-indigo-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-200">{t("dashboard.calendarSuggestion")}</p>
            <p className="text-xs text-indigo-600 dark:text-indigo-300 mt-0.5 truncate">
              <span dir="ltr" className="inline">{calendarSuggestion.date}</span>
              {calendarSuggestion.time && <> &middot; <span dir="ltr" className="inline">{calendarSuggestion.time}</span></>}
              {" — "}{calendarSuggestion.title}
            </p>
          </div>
          <Button
            size="sm"
            onClick={handleAddCalendar}
            disabled={addingToCalendar}
            className="h-8 bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5 shrink-0"
          >
            {addingToCalendar ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CalendarPlus className="h-3.5 w-3.5" />}
            {t("dashboard.addToCalendar")}
          </Button>
          <button
            onClick={() => setCalendarSuggestion(null)}
            className="p-1 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-400 no-min-height"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Hero Quick Record Button ─────────────────────────────────────────── */}
      <div className="flex flex-col items-center justify-center py-8 mb-6">
        <div className="relative flex items-center justify-center">
          {/* Slow pulse rings — not animate-pulse, using custom keyframes */}
          <span
            className="absolute rounded-full ring-2 ring-indigo-500/25 animate-ping pointer-events-none"
            style={{ width: 96, height: 96, animationDuration: "3s" }}
            aria-hidden="true"
          />
          <span
            className="absolute rounded-full ring-1 ring-indigo-400/15 animate-ping pointer-events-none"
            style={{ width: 120, height: 120, animationDuration: "3s", animationDelay: "0.6s" }}
            aria-hidden="true"
          />
          <button
            onClick={() => setRecordOpen(true)}
            className="relative z-10 h-20 w-20 rounded-full bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition-all duration-150 shadow-2xl shadow-indigo-500/40 flex items-center justify-center focus-visible:ring-4 focus-visible:ring-indigo-400 no-min-height"
            aria-label="Record meeting"
          >
            <Mic className="h-8 w-8 text-white" aria-hidden="true" />
          </button>
        </div>
        <p className="text-sm font-semibold text-foreground mt-5">{t("dashboard.recordMeeting")}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{t("dashboard.recordSubtitle")}</p>
      </div>

      {/* ── Unassigned Session Banner ─────────────────────────────────────────── */}
      {unassignedSessionId && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-3">
          <Mic className="h-5 w-5 text-amber-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">{t("dashboard.unassignedSession")}</p>
            <p className="text-xs text-amber-600 dark:text-amber-300 mt-0.5">
              {t("dashboard.unassignedDesc")}
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setAssignOpen(true)}
            className="h-8 bg-amber-600 hover:bg-amber-700 text-white text-xs gap-1.5 shrink-0"
          >
            {t("dashboard.assignToClient")}
          </Button>
          <button
            onClick={() => setUnassignedSessionId(null)}
            className="p-1 rounded hover:bg-amber-100 dark:hover:bg-amber-900 text-amber-400 no-min-height"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Chat button */}
      <div className="flex items-center justify-end mb-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setChatOpen(true)}
          className="gap-2 h-8 text-xs"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          {t("dashboard.chatHistory")}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="glass shadow-glass border-slate-200">
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

      {/* Sessions table */}
      <Card className="border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-800">{t("dashboard.recentSessions")}</p>
            <p className="text-xs text-slate-400">
              {filteredSessions.length} of {sessions.length}
            </p>
          </div>
          {/* FE-011 + FE-013: Filter controls row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" aria-hidden="true" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("dashboard.searchByEmail")}
                aria-label={t("dashboard.searchByEmail")}
                className="pl-9 h-9 border-slate-200 text-xs w-full"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <CalendarDays className="h-4 w-4 text-slate-400 shrink-0" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="border border-slate-200 rounded-md px-3 py-1.5 text-xs text-slate-700 bg-white min-h-[36px]"
                aria-label="From date"
              />
              <span className="text-xs text-slate-400">—</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="border border-slate-200 rounded-md px-3 py-1.5 text-xs text-slate-700 bg-white min-h-[36px]"
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
                  {t("dashboard.colSession")}
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {t("dashboard.colClient")}
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {t("dashboard.colDate")}
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {t("dashboard.colTasks")}
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {t("dashboard.colStatus")}
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
          search || dateFrom || dateTo ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
              <div className="rounded-full bg-slate-100 p-4">
                <Mic className="h-6 w-6 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-500">{t("dashboard.noSessionsFilter")}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              {/* Inline SVG illustration — microphone + soundwave */}
              <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <circle cx="40" cy="40" r="40" fill="#EEF2FF" />
                <rect x="33" y="18" width="14" height="26" rx="7" fill="#6366F1" />
                <path d="M24 40c0 8.837 7.163 16 16 16s16-7.163 16-16" stroke="#6366F1" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                <line x1="40" y1="56" x2="40" y2="64" stroke="#6366F1" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="33" y1="64" x2="47" y2="64" stroke="#6366F1" strokeWidth="2.5" strokeLinecap="round" />
                {/* Soundwave dots */}
                <circle cx="20" cy="40" r="2" fill="#A5B4FC" />
                <circle cx="14" cy="40" r="1.5" fill="#C7D2FE" />
                <circle cx="60" cy="40" r="2" fill="#A5B4FC" />
                <circle cx="66" cy="40" r="1.5" fill="#C7D2FE" />
              </svg>
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-700">{t("dashboard.noSessionsFirstTime")}</p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  {t("dashboard.noSessionsFirstTimeDesc")}
                </p>
              </div>
            </div>
          )
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide pl-5">
                  {t("dashboard.colSession")}
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {t("dashboard.colClient")}
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {t("dashboard.colDate")}
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {t("dashboard.colTasks")}
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {t("dashboard.colStatus")}
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
                      <p className="text-sm font-medium text-slate-800 truncate max-w-[240px]">
                        {s.title || s.filename}
                      </p>
                      {s.audioUrl ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-medium text-indigo-700 whitespace-nowrap shrink-0">
                          <Music className="h-3 w-3" /> {t("dashboard.audioBadge")}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 border border-green-200 px-2 py-0.5 text-[10px] font-medium text-green-700 whitespace-nowrap shrink-0">
                          <ShieldCheck className="h-3 w-3" /> {t("dashboard.audioDeletedBadge")}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 truncate max-w-[280px] mt-0.5">
                      {s.summary}
                    </p>
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {s.clientEmail ?? <span className="text-slate-300 italic">—</span>}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                    {new Date(s.createdAt).toLocaleDateString(
                      i18n.language === "he" ? "he-IL" : i18n.language === "ru" ? "ru-RU" : "en-US",
                      { day: "2-digit", month: "short", year: "numeric" }
                    )}
                    <br />
                    <span className="text-slate-400">
                      {new Date(s.createdAt).toLocaleTimeString(
                        i18n.language === "he" ? "he-IL" : i18n.language === "ru" ? "ru-RU" : "en-US",
                        { hour: "2-digit", minute: "2-digit" }
                      )}
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
                        {t("dashboard.viewBoard")} <ChevronRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete session ${s.title || s.filename}`}
                        className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(s); }}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
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

      <AssignClientDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        sessions={sessions}
        onAssign={handleAssign}
        loading={assigning}
      />

      {/* Task Review & Approval Dialog */}
      {reviewData && (
        <TaskReviewDialog
          open={reviewOpen}
          onOpenChange={(v) => {
            setReviewOpen(v);
            if (!v) setReviewData(null);
          }}
          sessionId={reviewData.sessionId}
          tasks={reviewData.tasks}
          summary={reviewData.summary}
          onApprove={handleApproveReview}
        />
      )}

      {/* Command palette — fully wired */}
      <CommandDialog open={cmdOpen} onOpenChange={setCmdOpen}>
        <CommandInput placeholder={t("dashboard.cmdSearch")} />
        <CommandList>
          <CommandEmpty>{t("common.noResults")}</CommandEmpty>

          <CommandGroup heading={t("dashboard.cmdQuickActions")}>
            <CommandItem onSelect={() => { setRecordOpen(true); setCmdOpen(false); }}>
              <Mic className="h-4 w-4 ltr:mr-2 rtl:ml-2 shrink-0" />
              {t("dashboard.cmdRecordNew")}
            </CommandItem>
            <CommandItem onSelect={() => { navigate("/provider/tasks"); setCmdOpen(false); }}>
              <ListTodo className="h-4 w-4 ltr:mr-2 rtl:ml-2 shrink-0" />
              {t("dashboard.cmdOpenTasks")}
            </CommandItem>
            <CommandItem onSelect={() => { setChatOpen(true); setCmdOpen(false); }}>
              <MessageSquare className="h-4 w-4 ltr:mr-2 rtl:ml-2 shrink-0" />
              {t("dashboard.chatHistory")}
            </CommandItem>
          </CommandGroup>

          <CommandGroup heading={t("dashboard.cmdNavigate")}>
            <CommandItem onSelect={() => { navigate("/provider/dashboard"); setCmdOpen(false); }}>
              <LayoutDashboard className="h-4 w-4 ltr:mr-2 rtl:ml-2 shrink-0" />
              {t("nav.home")}
            </CommandItem>
            <CommandItem onSelect={() => { navigate("/provider/clients"); setCmdOpen(false); }}>
              <Users className="h-4 w-4 ltr:mr-2 rtl:ml-2 shrink-0" />
              {t("nav.clients")}
            </CommandItem>
            <CommandItem onSelect={() => { navigate("/provider/analytics"); setCmdOpen(false); }}>
              <BarChart2 className="h-4 w-4 ltr:mr-2 rtl:ml-2 shrink-0" />
              {t("nav.analytics")}
            </CommandItem>
          </CommandGroup>

          {uniqueClients.length > 0 && (
            <CommandGroup heading={t("nav.clients")}>
              {uniqueClients.map((email) => (
                <CommandItem
                  key={email}
                  onSelect={() => {
                    navigate(`/provider/clients?q=${encodeURIComponent(email)}`);
                    setCmdOpen(false);
                  }}
                >
                  <Users className="h-4 w-4 ltr:mr-2 rtl:ml-2 shrink-0 text-muted-foreground" />
                  {email}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          <CommandGroup heading={t("dashboard.cmdSettings")}>
            <CommandItem
              onSelect={() => {
                const isDark = document.documentElement.classList.toggle("dark");
                localStorage.setItem("theme", isDark ? "dark" : "light");
                setCmdOpen(false);
              }}
            >
              🎨 {document.documentElement.classList.contains("dark") ? t("accessibility.grayscale") : t("accessibility.grayscale")}
            </CommandItem>
            <CommandItem onSelect={() => { cycleLang(); setCmdOpen(false); }}>
              🌐 {t("dashboard.cmdToggleLang")}
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      {/* FE-012: Delete confirmation AlertDialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("dashboard.deleteSessionTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("dashboard.deleteSessionDesc")}{" "}
              <strong>{deleteTarget?.filename}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirmed}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── RAG Chat History Panel ──────────────────────────────────────────────── */}
      <Sheet open={chatOpen} onOpenChange={setChatOpen}>
        <SheetContent side="left" className="w-full sm:w-[440px] flex flex-col p-0 gap-0">
          <SheetHeader className="px-4 pt-4 pb-3 border-b border-border shrink-0">
            <SheetTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4 text-indigo-500" />
              {t("dashboard.chatTitle")}
            </SheetTitle>
            {/* Client filter */}
            <Input
              value={chatClientFilter}
              onChange={(e) => setChatClientFilter(e.target.value)}
              placeholder={t("dashboard.chatFilterPlaceholder")}
              className="h-8 text-xs mt-2"
              dir="ltr"
            />
          </SheetHeader>

          {/* Message thread */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {chatHistory.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-12">
                <Sparkles className="h-8 w-8 text-indigo-300" />
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{t("dashboard.chatEmptyTitle")}</p>
                <p className="text-xs text-slate-400 max-w-[240px]">{t("dashboard.chatEmptyDesc")}</p>
              </div>
            )}
            {chatHistory.map((msg, i) => (
              <div key={i} className={`flex flex-col gap-1 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                <div className={`rounded-2xl px-3 py-2 text-sm max-w-[88%] whitespace-pre-wrap leading-relaxed ${
                  msg.role === "user"
                    ? "bg-indigo-600 text-white rounded-tr-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-sm"
                }`}>
                  {msg.text}
                </div>
                {msg.citations && msg.citations.length > 0 && (
                  <div className="flex flex-wrap gap-1 px-1 max-w-[88%]">
                    {msg.citations.map((c) => (
                      <button
                        key={c.sessionId}
                        onClick={() => { setChatOpen(false); navigate(`/provider/board/${c.sessionId}`); }}
                        className="text-[10px] px-2 py-0.5 rounded-full border border-indigo-200 bg-indigo-50 dark:bg-indigo-950/40 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 transition-colors no-min-height"
                        title={`Similarity: ${c.similarity}%`}
                      >
                        {c.title || "Session"} · {c.similarity}%
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {chatLoading && (
              <div className="flex items-start gap-2">
                <div className="rounded-2xl rounded-tl-sm px-3 py-2 bg-slate-100 dark:bg-slate-800">
                  <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                </div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Input bar */}
          <div className="shrink-0 border-t border-border px-3 py-3 flex gap-2">
            <Textarea
              value={chatQuery}
              onChange={(e) => setChatQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleChatSend(); }
              }}
              placeholder={t("dashboard.chatEmptyTitle")}
              rows={2}
              className="flex-1 resize-none text-sm min-h-0"
            />
            <Button
              size="icon"
              onClick={handleChatSend}
              disabled={!chatQuery.trim() || chatLoading}
              className="h-10 w-10 shrink-0 bg-indigo-600 hover:bg-indigo-700 self-end"
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </Layout>
  );
}
