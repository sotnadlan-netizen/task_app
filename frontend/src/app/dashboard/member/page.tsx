"use client";

/**
 * Member Console — production-grade live dashboard (Lightning visual language).
 *
 * Renders the live member experience (real Supabase data, realtime, recording,
 * calendar, click-throughs) in a clean enterprise console style. Full-bleed:
 * the console header replaces the dashboard GlobalNav.
 *
 * Recording hub, calendar, and unscheduled-task rail are rendered natively in
 * the console style (LightningRecordingHub / LightningCalendar /
 * LightningUnscheduledRail below) and reuse the real recording hook, schedule
 * picker, and API so all behavior is preserved.
 *
 * Cosmetic only (no backing data): the "Avg Sentiment" KPI tile, the global
 * search input, the 9-dot app launcher, and the bulk-row checkbox column.
 */

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Search, Bell, Settings, ChevronDown, ChevronLeft, ChevronRight, Star,
  Plus, RefreshCw, MoreHorizontal, ArrowUpDown,
  TrendingUp, TrendingDown, Users, Phone, ListChecks, BarChart3, FolderOpen,
  Home, Briefcase, ChevronsUpDown, CheckSquare, Square, Pencil, Trash2, Check,
  ExternalLink, Edit3, Calendar as CalendarIcon, Settings2, Mic,
  UserPlus, Clock, X, MicVocal, CalendarClock, CalendarPlus, XCircle, Hand,
  LogOut, Building2, Inbox,
} from "lucide-react";
import Link from "next/link";

import { useSupabase } from "@/providers/supabase-provider";
import { useOrganization } from "@/providers/organization-provider";
import { useRealtime } from "@/providers/realtime-provider";
import { useLanguage } from "@/providers/language-provider";
import type { Lang } from "@/lib/i18n";
import { useNotificationStore } from "@/stores/notification-store";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LanguageToggle } from "@/components/ui/language-toggle";
import { useRecording } from "@/hooks/useRecording";
import { AudioWaveform } from "@/components/recording/audio-waveform";
import { SessionResultsOverlay } from "@/components/recording/session-results-overlay";
import { ProcessingBar } from "@/components/recording/processing-bar";
import { SessionDetailModal } from "@/components/meetings/session-detail-modal";
import { TaskSchedulePicker } from "@/components/calendar/task-schedule-picker";
import { buildGoogleCalendarUrlForTask } from "@/lib/calendar-url";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { api } from "@/lib/api";
import type { Session, Task, OrgMembership, Profile } from "@/types";

// ── Visual tokens copied from design-preview/3 ───────────────────────────────
const priorityColor: Record<string, string> = {
  critical: "bg-[#ba0517] text-white",
  high: "bg-[#ea001e] text-white",
  medium: "bg-[#fe9339] text-white",
  low: "bg-[#0070d2] text-white",
};
const statusColor: Record<string, string> = {
  todo: "bg-[#dddbda] text-[#3e3e3c]",
  in_progress: "bg-[#0070d2] text-white",
  done: "bg-[#04844b] text-white",
};

// Translate-aware label maps (built per component from the active language).
type TFn = (path: string, vars?: Record<string, string | number>) => string;
const localeOf = (lang: Lang) => (lang === "he" ? "he-IL" : "en-US");
const statusLabelsOf = (t: TFn): Record<string, string> => ({
  todo: t("tasks.statusTodo"),
  in_progress: t("tasks.statusInProgress"),
  done: t("tasks.statusDone"),
});
const priorityLabelsOf = (t: TFn): Record<string, string> => ({
  low: t("tasks.priorityLow"),
  medium: t("tasks.priorityMedium"),
  high: t("tasks.priorityHigh"),
  critical: t("tasks.priorityCritical"),
});

// ── Sort helpers (ported from member/page.tsx) ──────────────────────────────
type MeetingSort = "time" | "project";
type TaskSort = "time" | "project" | "status" | "urgency";
const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const statusOrder: Record<string, number> = { todo: 0, in_progress: 1, done: 2 };
const ITEMS_PER_PAGE = 5;

const fontStyle = { fontFamily: "'Segoe UI', system-ui, sans-serif" };

const formatDuration = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

interface MemberWithProfile extends OrgMembership {
  profile: Profile | undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
export default function MemberPage() {
  const { supabase, session, user, signOut } = useSupabase();
  const { currentOrg, capacity, currentRole, loading: orgLoading, organizations, switchOrganization, isPlatformAdmin } = useOrganization();
  const { subscribe } = useRealtime();
  const { t, lang } = useLanguage();
  const loc = localeOf(lang);
  const statusLabel = statusLabelsOf(t);
  const priorityLabel = priorityLabelsOf(t);
  const { unreadCount } = useNotificationStore();
  const router = useRouter();

  // Header utility menus
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [orgMenuOpen, setOrgMenuOpen] = useState(false);

  // Role guard: participants are read-only and routed to their own dashboard
  useEffect(() => {
    if (orgLoading) return;
    if (currentRole === "participant") router.replace("/dashboard/participant");
  }, [orgLoading, currentRole, router]);

  // ── Data state ─────────────────────────────────────────────────────────────
  const [allSessions, setAllSessions] = useState<Session[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [taskCountTotal, setTaskCountTotal] = useState(0);
  const [taskCounts, setTaskCounts] = useState<Record<string, { total: number; done: number }>>({});
  const [projects, setProjects] = useState<Record<string, string>>({});

  // ── Sort / filter / pagination ───────────────────────────────────────────
  const [meetingSort, setMeetingSort] = useState<MeetingSort>("time");
  const [meetingPage, setMeetingPage] = useState(0);
  const [meetingProjectFilter, setMeetingProjectFilter] = useState("");
  const [taskSort, setTaskSort] = useState<TaskSort>("time");
  const [taskPage, setTaskPage] = useState(0);
  const [taskProjectFilter, setTaskProjectFilter] = useState("");

  // ── Overlay / modal state ─────────────────────────────────────────────────
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [confirmDeleteSession, setConfirmDeleteSession] = useState<Session | null>(null);
  const [deletingSession, setDeletingSession] = useState(false);
  const [deleteSessionError, setDeleteSessionError] = useState<string | null>(null);
  const [processingBarOpen, setProcessingBarOpen] = useState(false);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [overlaySession, setOverlaySession] = useState<Session | null>(null);
  const [overlayTasks, setOverlayTasks] = useState<Task[]>([]);
  const [showAddParticipant, setShowAddParticipant] = useState(false);

  // ── Lightning-only cosmetic state ────────────────────────────────────────
  const [selected, setSelected] = useState<string[]>([]);

  const token = session?.access_token || "";

  const loadStats = useCallback(async () => {
    if (!currentOrg) return;
    const [sessionRes, taskRes, taskCountRes, projRes] = await Promise.all([
      supabase
        .from("sessions")
        .select("*")
        .eq("org_id", currentOrg.id)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("tasks")
        .select("*, assignee:profiles!tasks_assignee_id_fkey(*)")
        .eq("org_id", currentOrg.id)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("tasks")
        .select("session_id, status")
        .eq("org_id", currentOrg.id)
        .not("session_id", "is", null),
      supabase
        .from("projects")
        .select("id, name")
        .eq("org_id", currentOrg.id),
    ]);

    if (sessionRes.data) setAllSessions(sessionRes.data as Session[]);
    if (taskRes.data) {
      setAllTasks(taskRes.data as Task[]);
      setTaskCountTotal(taskRes.data.length);
    }
    if (taskCountRes.data) {
      const counts: Record<string, { total: number; done: number }> = {};
      (taskCountRes.data as { session_id: string; status: string }[]).forEach((t) => {
        if (!t.session_id) return;
        if (!counts[t.session_id]) counts[t.session_id] = { total: 0, done: 0 };
        counts[t.session_id].total++;
        if (t.status === "done") counts[t.session_id].done++;
      });
      setTaskCounts(counts);
    }
    if (projRes.data) {
      const map: Record<string, string> = {};
      (projRes.data as { id: string; name: string }[]).forEach((p) => { map[p.id] = p.name; });
      setProjects(map);
    }
  }, [supabase, currentOrg]);

  useEffect(() => { loadStats(); }, [loadStats]);

  useEffect(() => {
    const unsubSessions = subscribe("sessions", () => loadStats());
    const unsubTasks = subscribe("tasks", () => loadStats());
    return () => { unsubSessions(); unsubTasks(); };
  }, [subscribe, loadStats]);

  const updateTaskLocal = useCallback((updated: Task) => {
    setAllTasks((prev) => prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)));
  }, []);

  // Clicking a session/meeting opens the Lightning detail popup (not a new page).
  const handleSessionClick = useCallback((s: Session) => {
    setSelectedSession(s);
  }, []);

  const handleSessionReady = useCallback(async (sessionId: string) => {
    setProcessingBarOpen(true);
    const [sessionRes, tasksRes] = await Promise.all([
      supabase.from("sessions").select("*").eq("id", sessionId).single(),
      supabase
        .from("tasks")
        .select("*, assignee:profiles!tasks_assignee_id_fkey(*)")
        .eq("session_id", sessionId)
        .order("created_at"),
    ]);
    setProcessingBarOpen(false);
    setOverlaySession((sessionRes.data as Session) ?? null);
    setOverlayTasks((tasksRes.data as Task[]) ?? []);
    setOverlayOpen(true);
  }, [supabase]);

  const handleDeleteSession = async () => {
    if (!confirmDeleteSession) return;
    setDeletingSession(true);
    setDeleteSessionError(null);
    try {
      await api.deleteSession(confirmDeleteSession.id, token);
      setAllSessions((prev) => prev.filter((s) => s.id !== confirmDeleteSession.id));
      if (selectedSession?.id === confirmDeleteSession.id) setSelectedSession(null);
      setConfirmDeleteSession(null);
    } catch (err) {
      setDeleteSessionError(err instanceof Error ? err.message : t("meetings.errDelete"));
    } finally {
      setDeletingSession(false);
    }
  };

  // ── Derived: sorted + filtered + paginated ────────────────────────────────
  const sortedMeetings = useMemo(() => {
    const copy = meetingProjectFilter
      ? allSessions.filter((s) => s.project_id === meetingProjectFilter)
      : [...allSessions];
    if (meetingSort === "project") {
      copy.sort((a, b) => {
        const pa = a.project_id ? (projects[a.project_id] || "") : "";
        const pb = b.project_id ? (projects[b.project_id] || "") : "";
        return pa.localeCompare(pb, "he");
      });
    }
    return copy;
  }, [allSessions, meetingSort, meetingProjectFilter, projects]);

  const meetingTotalPages = Math.ceil(sortedMeetings.length / ITEMS_PER_PAGE);
  const pagedMeetings = sortedMeetings.slice(meetingPage * ITEMS_PER_PAGE, (meetingPage + 1) * ITEMS_PER_PAGE);

  const sortedTasks = useMemo(() => {
    const copy = taskProjectFilter
      ? allTasks.filter((t) => t.project_id === taskProjectFilter)
      : [...allTasks];
    if (taskSort === "urgency") {
      copy.sort((a, b) => (priorityOrder[a.priority] ?? 4) - (priorityOrder[b.priority] ?? 4));
    } else if (taskSort === "status") {
      copy.sort((a, b) => (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3));
    } else if (taskSort === "project") {
      copy.sort((a, b) => {
        const pa = a.project_id ? (projects[a.project_id] || "") : "";
        const pb = b.project_id ? (projects[b.project_id] || "") : "";
        return pa.localeCompare(pb, "he");
      });
    }
    return copy;
  }, [allTasks, taskSort, taskProjectFilter, projects]);

  const taskTotalPages = Math.ceil(sortedTasks.length / ITEMS_PER_PAGE);
  const pagedTasks = sortedTasks.slice(taskPage * ITEMS_PER_PAGE, (taskPage + 1) * ITEMS_PER_PAGE);

  const recentTasks = useMemo(() => allTasks.slice(0, 5), [allTasks]);

  // Real avg sentiment: map each session's sentiment label to a polarity score
  // (positive +1 / neutral·mixed 0 / negative −1) and average across sessions.
  const sentimentStats = useMemo(() => {
    const labels = allSessions
      .map((s) => s.sentiment?.toLowerCase().trim())
      .filter((v): v is string => !!v);
    if (labels.length === 0) return { value: "—", label: "neutral", up: false };
    const score = (s: string) => (/pos|חיוב/.test(s) ? 1 : /neg|שליל/.test(s) ? -1 : 0);
    const avg = labels.reduce((a, s) => a + score(s), 0) / labels.length;
    const label = avg > 0.2 ? "positive" : avg < -0.2 ? "negative" : "neutral";
    return { value: `${avg >= 0 ? "+" : ""}${avg.toFixed(2)}`, label, up: avg >= 0 };
  }, [allSessions]);

  const capacityRemaining = capacity?.remaining_minutes ?? 0;
  const capacityTotal = capacity?.capacity_minutes ?? 0;
  const capacityPct = capacityTotal > 0 ? Math.min(100, Math.round((capacityRemaining / capacityTotal) * 100)) : 0;

  const hasProjects = Object.keys(projects).length > 0;

  if (orgLoading || currentRole === "participant") return null;

  return (
    <div className="min-h-screen bg-[#f3f3f3] text-[#080707]" style={fontStyle}>
      {/* ── Global header (Salesforce blue) ───────────────────────────────── */}
      <header className="bg-[#16325c] text-white">
        <div className="h-12 px-4 flex items-center gap-3">
          <Link href="/dashboard" className="grid grid-cols-3 gap-0.5 p-2 rounded hover:bg-white/10" aria-label={t("nav.appLauncher")}>
            {[...Array(9)].map((_, i) => <span key={i} className="w-1 h-1 rounded-full bg-white/80" />)}
          </Link>
          <span className="text-white/40">|</span>
          <Link href="/dashboard/member" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-gradient-to-br from-[#1ab9ff] to-[#0070d2] flex items-center justify-center text-white text-xs font-black">T</div>
            <span className="font-semibold text-[15px]">TaskFlow</span>
            <span className="text-white/60 text-[13px] hidden lg:inline">— {t("console.member")}</span>
          </Link>

          <nav className="hidden md:flex items-center ms-6 h-12">
            {[
              { label: t("nav.home"), icon: Home, href: "/dashboard/member", active: true },
              { label: t("memberHome.sessions"), icon: Phone, href: "/dashboard/member/meetings", count: allSessions.length },
              { label: t("nav.tasks"), icon: ListChecks, href: "/dashboard/member/tasks", count: taskCountTotal },
              { label: t("memberHome.approvals"), icon: Inbox, href: "/dashboard/member/inbox", count: unreadCount || undefined },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`h-12 px-4 flex items-center gap-1.5 text-[13px] transition-colors ${
                    item.active ? "bg-white text-[#080707] font-semibold" : "text-white/90 hover:bg-white/10"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                  {item.count !== undefined && (
                    <span className={`ms-1 text-[10px] px-1.5 py-0.5 rounded ${item.active ? "bg-[#0070d2] text-white" : "bg-white/15 text-white"}`}>
                      {item.count}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="flex-1" />

          <div className="flex items-center gap-1 shrink-0">
            {/* Admin ↔ Member toggle (admin-role users only) */}
            {!isPlatformAdmin && currentRole === "admin" && (
              <div className="flex items-center bg-white/10 rounded p-0.5 gap-0.5 me-1">
                <span className="px-2.5 py-1 text-[11px] font-semibold rounded bg-white text-[#16325c]">{t("nav.member")}</span>
                <button
                  onClick={() => router.push("/dashboard/admin")}
                  className="px-2.5 py-1 text-[11px] font-semibold rounded text-white/80 hover:text-white"
                >
                  {t("nav.admin")}
                </button>
              </div>
            )}

            {/* Org switcher (multi-org members) */}
            {!isPlatformAdmin && organizations.length > 1 && (
              <div className="relative">
                <button
                  onClick={() => { setOrgMenuOpen((v) => !v); setUserMenuOpen(false); }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded hover:bg-white/10 text-[12px] font-medium text-white transition-colors"
                  aria-label={t("nav.switchOrganization")}
                >
                  {currentOrg?.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={currentOrg.logo_url} alt={currentOrg.name} className="w-5 h-5 rounded object-cover shrink-0 bg-white" />
                  ) : (
                    <Building2 className="w-4 h-4 text-[#1ab9ff] shrink-0" />
                  )}
                  <span className="w-[110px] truncate text-start hidden lg:inline-block align-middle">{currentOrg?.name || t("nav.selectOrg")}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-white/70" />
                </button>
                {orgMenuOpen && (
                  <div className="absolute top-full start-0 mt-1 w-60 bg-white rounded-lg shadow-[0_8px_32px_rgba(0,0,0,0.18)] border border-[#dddbda] py-1.5 z-50">
                    {organizations.map((org) => (
                      <button
                        key={org.id}
                        onClick={() => { switchOrganization(org.id); setOrgMenuOpen(false); }}
                        className={`w-full text-start px-4 py-2 text-[13px] transition-colors ${
                          org.id === currentOrg?.id ? "bg-[#ecf5fe] text-[#0070d2] font-semibold" : "text-[#080707] hover:bg-[#fafaf9]"
                        }`}
                      >
                        {org.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="relative hidden lg:block">
              <Search className="w-3.5 h-3.5 absolute start-2 top-1/2 -translate-y-1/2 text-[#16325c]" />
              <input
                placeholder={t("common.search")}
                className="w-56 ps-7 pe-3 py-1.5 text-[13px] bg-white text-[#080707] rounded placeholder-[#706e6b] focus:outline-none focus:ring-2 focus:ring-[#1589ee]"
              />
            </div>

            {/* Language toggle */}
            <LanguageToggle variant="dark" />

            {/* Theme toggle */}
            <div className="text-white [&_button]:text-white [&_button:hover]:bg-white/10">
              <ThemeToggle />
            </div>

            {/* Notifications → inbox */}
            <Link href="/dashboard/member/inbox" className="relative w-8 h-8 rounded hover:bg-white/10 flex items-center justify-center" aria-label={unreadCount > 0 ? t("nav.notificationsUnread", { count: unreadCount }) : t("nav.notifications")}>
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -end-0.5 w-4 h-4 rounded-full bg-[#c23934] text-white text-[10px] font-bold flex items-center justify-center border border-[#16325c]">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>

            {/* User menu */}
            <div className="relative ms-1">
              <button
                onClick={() => { setUserMenuOpen((v) => !v); setOrgMenuOpen(false); }}
                className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1ab9ff] to-[#0070d2] flex items-center justify-center text-white text-xs font-bold"
                aria-label={t("memberHome.userMenuAria")}
              >
                {user?.email?.charAt(0).toUpperCase() || "?"}
              </button>
              {userMenuOpen && (
                <div className="absolute start-0 mt-1 w-60 bg-white rounded-lg shadow-[0_8px_32px_rgba(0,0,0,0.18)] border border-[#dddbda] py-1.5 z-50 text-[#080707]">
                  <div className="px-4 py-2.5 border-b border-[#dddbda]">
                    <p className="text-[13px] font-medium truncate">{user?.email}</p>
                    <p className="text-[11px] text-[#706e6b]">{t(`roles.${currentRole || "member"}`)}</p>
                  </div>
                  <Link href="/dashboard/member/inbox" onClick={() => setUserMenuOpen(false)} className="w-full text-start px-4 py-2 text-[13px] text-[#080707] hover:bg-[#fafaf9] flex items-center gap-2">
                    <Inbox className="w-4 h-4 text-[#706e6b]" />
                    {t("console.approvalsTitle")}
                  </Link>
                  {currentRole === "admin" && !isPlatformAdmin && (
                    <Link href="/dashboard/admin" onClick={() => setUserMenuOpen(false)} className="w-full text-start px-4 py-2 text-[13px] text-[#080707] hover:bg-[#fafaf9] flex items-center gap-2">
                      <Settings className="w-4 h-4 text-[#706e6b]" />
                      {t("memberHome.manageOrg")}
                    </Link>
                  )}
                  <button
                    onClick={() => { signOut(); setUserMenuOpen(false); }}
                    className="w-full text-start px-4 py-2 text-[13px] text-[#c23934] hover:bg-[#fde9e7] flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    {t("nav.signOut")}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── Page header ────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-[#dddbda] px-6 pt-3 pb-2">
        <div className="flex items-center gap-1.5 text-[11px] text-[#706e6b] mb-2">
          <Home className="w-3 h-3" />
          <ChevronLeft className="w-3 h-3 rtl:-scale-x-100" />
          <span>{t("console.member")}</span>
          <ChevronLeft className="w-3 h-3 rtl:-scale-x-100" />
          <span className="text-[#080707] font-semibold">{t("nav.home")}</span>
        </div>
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#1ab9ff] to-[#0070d2] flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-[#706e6b] font-semibold">
                {currentOrg?.name ? currentOrg.name : t("memberHome.workspace")}
              </p>
              <h1 className="text-[20px] font-bold text-[#080707] leading-tight flex items-center gap-2">
                {t("nav.home")}
                <Star className="w-4 h-4 text-[#dddbda] hover:text-amber-400 cursor-pointer" />
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Btn icon={<UserPlus className="w-3.5 h-3.5 me-1" />} onClick={() => setShowAddParticipant(true)}>{t("memberHome.addParticipant")}</Btn>
            <Btn variant="secondary" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => document.getElementById("quick-action")?.scrollIntoView({ behavior: "smooth" })}>{t("memberHome.newSession")}</Btn>
            <Btn variant="secondary" icon={<RefreshCw className="w-3.5 h-3.5" />} onClick={() => loadStats()}>{t("memberHome.refresh")}</Btn>
            <button className="p-2 rounded border border-[#dddbda] hover:bg-[#f3f3f3]">
              <MoreHorizontal className="w-3.5 h-3.5 text-[#0070d2]" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <main className="max-w-[1600px] mx-auto px-6 py-5 space-y-5">
        {/* KPI tiles */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiTile label={t("memberHome.sessions")} value={String(allSessions.length)} trend={t("memberHome.kpiShown", { count: pagedMeetings.length })} trendUp icon={<Phone className="w-5 h-5" />} />
          <KpiTile label={t("memberHome.totalTasks")} value={String(taskCountTotal)} trend={t("memberHome.kpiOpen", { count: sortedTasks.filter((task) => task.status !== "done").length })} trendUp icon={<ListChecks className="w-5 h-5" />} />
          <KpiTile label={t("memberHome.capacityRemaining")} value={String(capacityRemaining)} suffix={t("common.minutes")} trend={capacityTotal > 0 ? `${capacityPct}%` : "—"} trendUp={capacityPct > 30} icon={<BarChart3 className="w-5 h-5" />} />
          <KpiTile label={t("memberHome.avgSentiment")} value={sentimentStats.value} trend={sentimentStats.value === "—" ? t("memberHome.noData") : t(`sentiment.${sentimentStats.label}`)} trendUp={sentimentStats.up} icon={<TrendingUp className="w-5 h-5" />} />
        </section>

        {/* Two-column body */}
        <section className="grid grid-cols-12 gap-5">
          {/* LEFT: Quick Action (RecordingHub) + Recent Tasks */}
          <div className="col-span-12 lg:col-span-4 space-y-3">
            <div id="quick-action">
              <Card>
                <CardHeader icon={<Mic className="w-4 h-4 text-white" />} iconBg="bg-[#0070d2]" title={t("recording.title")} sub={t("memberHome.newSession")} />
                <LightningRecordingHub onSessionReady={handleSessionReady} />
              </Card>
            </div>

            <Card>
              <CardHeader icon={<Edit3 className="w-4 h-4 text-white" />} iconBg="bg-[#04844b]" title={t("memberHome.recentTasks")} sub={t("memberHome.ofCount", { shown: recentTasks.length, total: taskCountTotal })} />
              {recentTasks.length === 0 ? (
                <p className="px-4 py-6 text-center text-[12px] text-[#706e6b]">{t("memberHome.noTasksYet")}</p>
              ) : (
                <ul className="divide-y divide-[#dddbda]">
                  {recentTasks.map((rt) => {
                    const owningSession = rt.session_id ? allSessions.find((s) => s.id === rt.session_id) : undefined;
                    return (
                      <li key={rt.id} onClick={() => owningSession && handleSessionClick(owningSession)} className="px-3 py-2.5 flex items-center gap-2 hover:bg-[#f3f3f3] cursor-pointer">
                        <span className="text-[11px] font-mono text-[#0070d2] hover:underline w-14 truncate">{rt.id.slice(0, 8)}</span>
                        <p className={`flex-1 text-[13px] truncate ${rt.status === "done" ? "line-through text-[#706e6b]" : "text-[#080707]"}`}>{rt.title}</p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${priorityColor[rt.priority]}`}>{priorityLabel[rt.priority]}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </div>

          {/* RIGHT: Sessions table + Tasks list */}
          <div className="col-span-12 lg:col-span-8 space-y-4">
            {/* Sessions */}
            <Card>
              <div className="border-b border-[#dddbda] px-4 py-2.5 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 text-[14px] font-semibold text-[#080707]">
                    <Phone className="w-4 h-4 text-[#0070d2]" />
                    {t("memberHome.sessions")}
                  </div>
                  <span className="text-[11px] text-[#706e6b]">{t("memberHome.items", { count: sortedMeetings.length })}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {hasProjects && (
                    <select
                      value={meetingProjectFilter}
                      onChange={(e) => { setMeetingProjectFilter(e.target.value); setMeetingPage(0); }}
                      className="px-2 py-1 rounded border border-[#dddbda] bg-white text-[12px] text-[#3e3e3c] focus:outline-none focus:ring-2 focus:ring-[#1589ee]"
                    >
                      <option value="">{t("tasks.allProjects")}</option>
                      {Object.entries(projects).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                    </select>
                  )}
                  <Btn variant="secondary" small onClick={() => { setMeetingSort(meetingSort === "time" ? "project" : "time"); setMeetingPage(0); }}>
                    <ArrowUpDown className="w-3 h-3 me-1" />
                    {meetingSort === "time" ? t("meetings.sortByProject") : t("meetings.sortByTime")}
                  </Btn>
                </div>
              </div>

              {pagedMeetings.length === 0 ? (
                <p className="px-4 py-10 text-center text-[13px] text-[#706e6b]">{t("meetings.empty")}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px]">
                    <thead className="bg-[#fafaf9] text-[#3e3e3c]">
                      <tr className="border-b border-[#dddbda]">
                        <Th width="w-10">
                          <button onClick={() => setSelected(selected.length === pagedMeetings.length ? [] : pagedMeetings.map((s) => s.id))}>
                            {selected.length === pagedMeetings.length && pagedMeetings.length > 0 ? <CheckSquare className="w-4 h-4 text-[#0070d2]" /> : <Square className="w-4 h-4 text-[#706e6b]" />}
                          </button>
                        </Th>
                        <Th sortable>{t("memberHome.colSessionId")}</Th>
                        <Th sortable>{t("meetings.colTitle")}</Th>
                        <Th sortable>{t("meetings.colProject")}</Th>
                        <Th sortable>{t("meetings.colDate")}</Th>
                        <Th sortable className="text-center">{t("memberHome.colTasks")}</Th>
                        <Th sortable>{t("memberHome.colStage")}</Th>
                        <Th width="w-10"></Th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedMeetings.map((s) => {
                        const isSelected = selected.includes(s.id);
                        const tc = taskCounts[s.id];
                        const projectName = s.project_id ? projects[s.project_id] : null;
                        const isClosed = !!(tc && tc.total > 0 && tc.done === tc.total);
                        return (
                          <tr key={s.id} onClick={() => handleSessionClick(s)} className={`border-b border-[#dddbda] cursor-pointer transition-colors ${isSelected ? "bg-[#ecf5fe]" : "hover:bg-[#fafaf9]"}`}>
                            <Td>
                              <button onClick={(e) => { e.stopPropagation(); setSelected((sel) => sel.includes(s.id) ? sel.filter((x) => x !== s.id) : [...sel, s.id]); }}>
                                {isSelected ? <CheckSquare className="w-4 h-4 text-[#0070d2]" /> : <Square className="w-4 h-4 text-[#706e6b]" />}
                              </button>
                            </Td>
                            <Td><a className="text-[#0070d2] hover:underline font-mono text-[12px]">{s.id.slice(0, 8)}</a></Td>
                            <Td className="font-semibold text-[#080707] truncate max-w-[280px]">{s.title || t("meetings.untitled")}</Td>
                            <Td>
                              {projectName ? (
                                <span className="inline-flex items-center gap-1 text-[12px] text-[#0070d2]"><FolderOpen className="w-3 h-3" />{projectName}</span>
                              ) : <span className="text-[12px] text-[#706e6b]">—</span>}
                            </Td>
                            <Td className="text-[12px] text-[#3e3e3c]">{new Date(s.created_at).toLocaleDateString(loc)}</Td>
                            <Td className="text-center">
                              {tc ? (
                                <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${tc.done === tc.total ? "bg-[#cfeac4] text-[#04844b]" : "bg-[#dceffb] text-[#0070d2]"}`}>{tc.done}/{tc.total}</span>
                              ) : <span className="text-[11px] text-[#706e6b]">—</span>}
                            </Td>
                            <Td>
                              <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${!isClosed ? "text-[#04844b]" : "text-[#706e6b]"}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${!isClosed ? "bg-[#04844b]" : "bg-[#706e6b]"}`} />
                                {isClosed ? t("memberHome.stageClosed") : t("memberHome.stageActive")}
                              </span>
                            </Td>
                            <Td>
                              <button onClick={(e) => { e.stopPropagation(); setSelectedSession(s); }} className="p-1 rounded hover:bg-[#dddbda]" aria-label={t("memberHome.sessionDetailsAria")}>
                                <Settings2 className="w-3.5 h-3.5 text-[#706e6b]" />
                              </button>
                            </Td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <LightningPager
                page={meetingPage}
                totalPages={meetingTotalPages}
                total={sortedMeetings.length}
                pageSize={ITEMS_PER_PAGE}
                onPrev={() => setMeetingPage((p) => Math.max(0, p - 1))}
                onNext={() => setMeetingPage((p) => Math.min(meetingTotalPages - 1, p + 1))}
              />
            </Card>

            {/* Tasks */}
            <Card>
              <div className="border-b border-[#dddbda] px-4 py-2.5 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 text-[14px] font-semibold text-[#080707]">
                    <ListChecks className="w-4 h-4 text-[#fe9339]" />
                    {t("nav.tasks")}
                  </div>
                  <span className="text-[11px] text-[#706e6b]">{t("memberHome.items", { count: sortedTasks.length })}</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {hasProjects && (
                    <select
                      value={taskProjectFilter}
                      onChange={(e) => { setTaskProjectFilter(e.target.value); setTaskPage(0); }}
                      className="px-2 py-1 rounded border border-[#dddbda] bg-white text-[12px] text-[#3e3e3c] focus:outline-none focus:ring-2 focus:ring-[#1589ee]"
                    >
                      <option value="">{t("tasks.allProjects")}</option>
                      {Object.entries(projects).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                    </select>
                  )}
                  <div className="flex items-center gap-0.5">
                    {(["time", "project", "status", "urgency"] as TaskSort[]).map((sortKey) => {
                      const labels: Record<TaskSort, string> = {
                        time: t("memberHome.sortTime"),
                        project: t("memberHome.sortProject"),
                        status: t("memberHome.sortStatus"),
                        urgency: t("memberHome.sortUrgency"),
                      };
                      return (
                        <button
                          key={sortKey}
                          onClick={() => { setTaskSort(sortKey); setTaskPage(0); }}
                          className={`px-2 py-1 rounded text-[11px] font-semibold border transition-colors ${
                            taskSort === sortKey ? "bg-[#0070d2] text-white border-[#0070d2]" : "bg-white text-[#0070d2] border-[#dddbda] hover:bg-[#f4f6f9]"
                          }`}
                        >
                          {labels[sortKey]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {pagedTasks.length === 0 ? (
                <p className="px-4 py-10 text-center text-[13px] text-[#706e6b]">{t("tasks.empty")}</p>
              ) : (
                <table className="w-full text-[13px]">
                  <thead className="bg-[#fafaf9] text-[#3e3e3c]">
                    <tr className="border-b border-[#dddbda]">
                      <Th sortable>{t("memberHome.colTaskId")}</Th>
                      <Th sortable>{t("memberHome.colSubject")}</Th>
                      <Th sortable>{t("editRequest.fieldStatus")}</Th>
                      <Th sortable>{t("editRequest.fieldPriority")}</Th>
                      <Th sortable>{t("memberHome.colAssignee")}</Th>
                      <Th sortable>{t("memberHome.colDue")}</Th>
                      <Th></Th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedTasks.map((task) => {
                      const owningSession = task.session_id ? allSessions.find((s) => s.id === task.session_id) : undefined;
                      return (
                        <tr key={task.id} onClick={() => setSelectedTask(task)} className="border-b border-[#dddbda] hover:bg-[#fafaf9] cursor-pointer">
                          <Td><a className="text-[#0070d2] hover:underline font-mono text-[12px]">{task.id.slice(0, 8)}</a></Td>
                          <Td className={`font-semibold truncate max-w-[280px] ${task.status === "done" ? "line-through text-[#706e6b]" : "text-[#080707]"}`}>{task.title}</Td>
                          <Td><span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${statusColor[task.status]}`}>{statusLabel[task.status]}</span></Td>
                          <Td><span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${priorityColor[task.priority]}`}>{priorityLabel[task.priority]}</span></Td>
                          <Td className="text-[12px]">{task.assignee?.full_name || "—"}</Td>
                          <Td className="text-[12px] text-[#3e3e3c]">
                            {task.scheduled_at ? new Date(task.scheduled_at).toLocaleDateString(loc) : task.deadline ? new Date(task.deadline).toLocaleDateString(loc) : "—"}
                          </Td>
                          <Td>
                            <div className="flex gap-0.5">
                              <button onClick={(e) => { e.stopPropagation(); setSelectedTask(task); }} className="p-1 rounded hover:bg-[#dddbda]" aria-label={t("memberHome.taskDetailsAria")}><Pencil className="w-3.5 h-3.5 text-[#706e6b]" /></button>
                              {owningSession && (
                                <button onClick={(e) => { e.stopPropagation(); setSelectedSession(owningSession); }} className="p-1 rounded hover:bg-[#dddbda]" aria-label={t("memberHome.openSessionAria")}><ExternalLink className="w-3.5 h-3.5 text-[#706e6b]" /></button>
                              )}
                            </div>
                          </Td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              <LightningPager
                page={taskPage}
                totalPages={taskTotalPages}
                total={sortedTasks.length}
                pageSize={ITEMS_PER_PAGE}
                onPrev={() => setTaskPage((p) => Math.max(0, p - 1))}
                onNext={() => setTaskPage((p) => Math.min(taskTotalPages - 1, p + 1))}
              />
            </Card>
          </div>
        </section>

        {/* Calendar Console Card — full width */}
        <Card>
          <CardHeader icon={<CalendarIcon className="w-4 h-4 text-white" />} iconBg="bg-[#0070d2]" title={t("calendar.title")} sub={t("calendar.subtitle")} />
          <div className="p-4 bg-white space-y-3">
            <LightningUnscheduledRail tasks={allTasks} token={token} onTaskUpdate={updateTaskLocal} />
            <LightningCalendar sessions={allSessions} tasks={allTasks} token={token} onMeetingClick={handleSessionClick} onTaskUpdate={updateTaskLocal} />
          </div>
        </Card>
      </main>

      {/* ── Background processing indicator ──────────────────────────────── */}
      <AnimatePresence>
        {processingBarOpen && <ProcessingBar />}
      </AnimatePresence>

      {/* ── Session Results Overlay (waveform → bento) ─────────────────────── */}
      {overlayOpen && (
        <SessionResultsOverlay
          session={overlaySession}
          tasks={overlayTasks}
          onClose={() => { setOverlayOpen(false); setOverlaySession(null); setOverlayTasks([]); setProcessingBarOpen(false); }}
        />
      )}

      {/* ── Session Detail Modal (gear / edit) ─────────────────────────────── */}
      {selectedSession && (
        <SessionDetailModal
          session={selectedSession}
          token={token}
          onClose={() => setSelectedSession(null)}
          onRequestDelete={(s) => { setSelectedSession(null); setConfirmDeleteSession(s); setDeleteSessionError(null); }}
          onSessionUpdate={(updated) => {
            setAllSessions((prev) => prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)));
            setSelectedSession((prev) => (prev ? { ...prev, ...updated } : prev));
          }}
        />
      )}

      {/* ── Task Detail Modal (popup) ──────────────────────────────────────── */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          token={token}
          projectName={selectedTask.project_id ? projects[selectedTask.project_id] : undefined}
          owningSession={selectedTask.session_id ? allSessions.find((s) => s.id === selectedTask.session_id) : undefined}
          onClose={() => setSelectedTask(null)}
          onTaskUpdate={(u) => { updateTaskLocal(u); setSelectedTask((prev) => (prev ? { ...prev, ...u } : prev)); }}
          onOpenSession={(s) => { setSelectedTask(null); setSelectedSession(s); }}
        />
      )}

      {/* ── Confirm Delete Modal ───────────────────────────────────────────── */}
      {confirmDeleteSession && (
        <Modal open onClose={() => !deletingSession && setConfirmDeleteSession(null)} title={t("meetings.deleteTitle")}>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-red-50/60 border border-red-100 rounded-2xl">
              <Trash2 className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-700">
                <p dir="auto" className="bidi-auto font-semibold mb-1">{t("memberHome.deleteSessionQ", { title: confirmDeleteSession.title || t("meetings.untitled") })}</p>
                <p>{t("memberHome.deleteSessionDetail")}</p>
              </div>
            </div>
            {deleteSessionError && <Alert variant="error">{deleteSessionError}</Alert>}
            <div className="flex gap-3 justify-start">
              <Button variant="danger" onClick={handleDeleteSession} loading={deletingSession}>
                <Trash2 className="w-4 h-4 me-1" />
                {t("memberHome.deletePermanently")}
              </Button>
              <Button variant="secondary" onClick={() => setConfirmDeleteSession(null)} disabled={deletingSession}>{t("common.cancel")}</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Add Participant Modal ──────────────────────────────────────────── */}
      <AddParticipantModal open={showAddParticipant} onClose={() => setShowAddParticipant(false)} />
    </div>
  );
}

// ── Add Participant Modal (ported from member/page.tsx) ─────────────────────
function AddParticipantModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { session } = useSupabase();
  const { currentOrg } = useOrganization();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!currentOrg) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    const trimmedEmail = email.trim();
    const token = session?.access_token || "";
    try {
      await api.addOrgMember(currentOrg.id, { email: trimmedEmail, role: "participant" }, token);
      setSuccess(t("memberHome.participantAdded", { email: trimmedEmail }));
      setEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("sessionDetail.errAddParticipant"));
    }
    setLoading(false);
  };

  return (
    <Modal open={open} onClose={onClose} title={t("memberHome.addParticipant")}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Alert variant="warning">{t("memberHome.participantWarning")}</Alert>
        {error && <Alert variant="error">{error}</Alert>}
        {success && <div className="px-3 py-2 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">{success}</div>}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t("memberHome.emailLabel")}</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            required
            dir="ltr"
            className="w-full px-3 py-2 border border-[#dddbda] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#1589ee] focus:border-transparent bg-white"
          />
          <p className="text-xs text-gray-400 mt-1">{t("memberHome.emailHelper")}</p>
        </div>
        <div className="flex justify-start gap-3 pt-2">
          <Button type="submit" loading={loading}><UserPlus className="w-4 h-4 me-1" />{t("memberHome.addParticipant")}</Button>
          <Button type="button" variant="secondary" onClick={onClose}>{t("common.close")}</Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Task Detail Modal (Lightning popup) ─────────────────────────────────────
function TaskDetailModal({
  task,
  token,
  projectName,
  owningSession,
  onClose,
  onTaskUpdate,
  onOpenSession,
}: {
  task: Task;
  token: string;
  projectName?: string;
  owningSession?: Session;
  onClose: () => void;
  onTaskUpdate: (t: Task) => void;
  onOpenSession: (s: Session) => void;
}) {
  const { t, lang } = useLanguage();
  const loc = localeOf(lang);
  const statusLabel = statusLabelsOf(t);
  const priorityLabel = priorityLabelsOf(t);
  const [toggling, setToggling] = useState(false);
  const isDone = task.status === "done";

  const toggleDone = async () => {
    if (task.is_locked || toggling) return;
    const next = isDone ? "todo" : "done";
    setToggling(true);
    try {
      const updated = (await api.updateTask(task.id, { status: next }, token)) as Task;
      onTaskUpdate({ ...task, ...updated, status: next });
    } catch { /* keep current */ }
    finally { setToggling(false); }
  };

  const dueLabel = task.scheduled_at
    ? new Date(task.scheduled_at).toLocaleDateString(loc)
    : task.deadline
      ? new Date(task.deadline).toLocaleDateString(loc)
      : "—";

  return (
    <Modal open onClose={onClose} title={task.title || t("memberHome.taskDetails")}>
      <div className="space-y-4 text-[13px]">
        {/* meta chips */}
        <div className="flex flex-wrap items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${statusColor[task.status]}`}>{statusLabel[task.status]}</span>
          <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${priorityColor[task.priority]}`}>{priorityLabel[task.priority]}</span>
          {projectName && (
            <span className="inline-flex items-center gap-1 text-[12px] text-[#0070d2]"><FolderOpen className="w-3.5 h-3.5" />{projectName}</span>
          )}
          {task.is_locked && <span className="text-[11px] text-[#706e6b]">{t("memberHome.lockedSynced")}</span>}
        </div>

        {/* fields */}
        <div className="grid grid-cols-2 gap-3 rounded border border-[#dddbda] bg-[#fafaf9] p-3">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-[#706e6b] font-semibold">{t("memberHome.assignee")}</p>
            <p className="text-[#080707] mt-0.5">{task.assignee?.full_name || "—"}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-[#706e6b] font-semibold">{t("memberHome.dueDate")}</p>
            <p className="text-[#080707] mt-0.5">{dueLabel}</p>
          </div>
        </div>

        {/* description */}
        <div>
          <p className="text-[10px] uppercase tracking-wide text-[#706e6b] font-semibold mb-1">{t("editRequest.fieldDescription")}</p>
          {task.description
            ? <p dir="auto" className="bidi-auto text-[#3e3e3c] leading-relaxed whitespace-pre-wrap">{task.description}</p>
            : <p className="text-[#706e6b] italic">{t("memberHome.noDescription")}</p>}
        </div>

        {/* actions */}
        <div className="flex items-center justify-between gap-3 pt-1 border-t border-[#dddbda]">
          <div className="flex gap-2">
            {!task.is_locked && (
              <Button size="sm" onClick={toggleDone} loading={toggling}>
                {isDone ? t("tasks.markIncomplete") : t("tasks.markComplete")}
              </Button>
            )}
            {owningSession && (
              <Button size="sm" variant="secondary" onClick={() => onOpenSession(owningSession)}>
                <Phone className="w-3.5 h-3.5 me-1" />
                {t("memberHome.openSession")}
              </Button>
            )}
          </div>
          <Button size="sm" variant="ghost" onClick={onClose}>{t("common.close")}</Button>
        </div>
      </div>
    </Modal>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded border border-[#dddbda] shadow-[0_2px_2px_rgba(0,0,0,0.05)] ${className}`}>{children}</div>;
}

function CardHeader({ icon, iconBg, title, sub, children }: { icon: React.ReactNode; iconBg: string; title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="border-b border-[#dddbda] px-4 py-2.5 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className={`w-7 h-7 rounded ${iconBg} flex items-center justify-center flex-shrink-0`}>{icon}</div>
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-[#080707] truncate">{title}</p>
          {sub && <p className="text-[11px] text-[#706e6b] truncate">{sub}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function Th({ children, sortable, width, className = "" }: { children?: React.ReactNode; sortable?: boolean; width?: string; className?: string }) {
  return (
    <th className={`text-right px-3 py-2 text-[11px] font-semibold uppercase tracking-wide ${width || ""} ${className}`}>
      <div className={`flex items-center gap-1 ${className.includes("text-center") ? "justify-center" : ""}`}>
        {children}
        {sortable && <ChevronsUpDown className="w-3 h-3 text-[#706e6b]" />}
      </div>
    </th>
  );
}

function Td({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2.5 ${className}`}>{children}</td>;
}

function Btn({ children, variant = "primary", icon, small, onClick }: { children: React.ReactNode; variant?: "primary" | "secondary"; icon?: React.ReactNode; small?: boolean; onClick?: () => void }) {
  const base = "rounded font-semibold transition-colors inline-flex items-center";
  const size = small ? "px-2 py-1 text-[11px]" : "px-3 py-1.5 text-[13px]";
  const styles = "bg-white text-[#0070d2] border border-[#dddbda] hover:bg-[#f4f6f9]";
  void variant;
  return <button onClick={onClick} className={`${base} ${size} ${styles}`}>{icon}{children}</button>;
}

function KpiTile({ label, value, suffix, trend, trendUp, icon }: { label: string; value: string; suffix?: string; trend?: string; trendUp?: boolean; icon: React.ReactNode }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] uppercase tracking-wide font-semibold text-[#706e6b]">{label}</p>
        <div className="w-8 h-8 rounded bg-[#ecf5fe] text-[#0070d2] flex items-center justify-center">{icon}</div>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-[28px] font-bold text-[#080707] leading-none">{value}</span>
        {suffix && <span className="text-[12px] text-[#706e6b]">{suffix}</span>}
      </div>
      {trend && (
        <div className={`flex items-center gap-1 mt-2 text-[11px] font-semibold ${trendUp ? "text-[#04844b]" : "text-[#706e6b]"}`}>
          {trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          <span>{trend}</span>
        </div>
      )}
    </Card>
  );
}

function LightningPager({ page, totalPages, total, pageSize, onPrev, onNext }: { page: number; totalPages: number; total: number; pageSize: number; onPrev: () => void; onNext: () => void }) {
  const { t } = useLanguage();
  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);
  return (
    <div className="px-4 py-2.5 border-t border-[#dddbda] flex items-center justify-between text-[12px] text-[#706e6b]">
      <span>{t("memberHome.pagerRange", { from, to, total })}</span>
      <div className="flex items-center gap-2">
        <button onClick={onPrev} disabled={page === 0} className="p-1.5 rounded border border-[#dddbda] disabled:opacity-40 hover:bg-[#f3f3f3]" aria-label={t("meetings.prevPage")}>
          <ChevronRight className="w-3.5 h-3.5 rtl:-scale-x-100" />
        </button>
        <span className="font-semibold text-[#080707]">{t("meetings.pageOf", { page: totalPages === 0 ? 1 : page + 1, total: totalPages || 1 })}</span>
        <button onClick={onNext} disabled={page >= totalPages - 1} className="p-1.5 rounded border border-[#dddbda] disabled:opacity-40 hover:bg-[#f3f3f3]" aria-label={t("meetings.nextPage")}>
          <ChevronLeft className="w-3.5 h-3.5 rtl:-scale-x-100" />
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Console-styled Recording Hub — reuses useRecording hook + AudioWaveform + api
// ════════════════════════════════════════════════════════════════════════════
function LightningRecordingHub({ onSessionReady }: { onSessionReady?: (sessionId: string) => void }) {
  const { session: authSession } = useSupabase();
  const { capacity, currentOrg } = useOrganization();
  const { t } = useLanguage();
  const {
    isRecording, duration, error, processing, mediaStream,
    reviewBlob, reviewUrl, startRecording, stopRecording, approveRecording, discardRecording,
  } = useRecording();
  const shouldReduceMotion = useReducedMotion();

  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);
  const [showNewProjectInput, setShowNewProjectInput] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [creatingProject, setCreatingProject] = useState(false);
  const [loadingMeta, setLoadingMeta] = useState(false);

  useEffect(() => {
    if (!currentOrg || !authSession?.access_token) return;
    const token = authSession.access_token;
    setLoadingMeta(true);
    Promise.all([
      api.getProjects(currentOrg.id, token),
      api.getOrgMembers(currentOrg.id, token).catch(() => []),
    ])
      .then(([proj, mem]) => {
        setProjects(proj || []);
        setMembers((mem as MemberWithProfile[]) || []);
      })
      .catch(() => {})
      .finally(() => setLoadingMeta(false));
  }, [currentOrg, authSession?.access_token]);

  const handleCreateProject = async () => {
    if (!newProjectName.trim() || !currentOrg || !authSession?.access_token) return;
    setCreatingProject(true);
    try {
      const proj = await api.createProject({ org_id: currentOrg.id, name: newProjectName.trim() }, authSession.access_token);
      setProjects((prev) => [...prev, proj]);
      setSelectedProjectId(proj.id);
      setNewProjectName("");
      setShowNewProjectInput(false);
    } catch { /* silent */ }
    setCreatingProject(false);
  };

  const toggleParticipant = (userId: string) =>
    setSelectedParticipantIds((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));

  // Stop only enters the review state; nothing is uploaded yet.
  const handleStop = async () => {
    await stopRecording();
  };

  // Approve uploads the reviewed blob with the selected context.
  const handleApprove = async () => {
    await approveRecording({ projectId: selectedProjectId || undefined, participantIds: selectedParticipantIds, onSuccess: onSessionReady });
  };

  const isReviewing = !!reviewBlob && !processing;

  const remaining = capacity?.remaining_minutes ?? 0;
  const used = capacity?.used_minutes ?? 0;
  const pct = remaining + used > 0 ? Math.min(100, (remaining / (remaining + used)) * 100) : 0;

  return (
    <div>
      {/* Capacity strip */}
      {capacity && (
        <div className="px-4 py-3 border-b border-[#dddbda] bg-[#fafaf9]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#0070d2]">
              <Clock className="w-3.5 h-3.5" />
              {t("recording.minutesRemaining", { count: capacity.remaining_minutes })}
            </span>
            <span className="text-[11px] text-[#706e6b] font-mono">{used} / {remaining + used} {t("common.minutes")}</span>
          </div>
          <div className="h-1.5 rounded-full bg-[#dddbda] overflow-hidden">
            <div className="h-full rounded-full bg-[#0070d2]" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {/* Alerts */}
      {(capacity?.is_low_balance || capacity?.is_blocked || error) && (
        <div className="px-4 pt-3 space-y-2">
          {capacity?.is_low_balance && !capacity.is_blocked && (
            <Alert variant="warning" title={t("recording.lowCapacityTitle")}>{t("recording.lowCapacityBody", { count: capacity.remaining_minutes })}</Alert>
          )}
          {capacity?.is_blocked && <Alert variant="error" title={t("recording.blockedTitle")}>{t("recording.blockedBody")}</Alert>}
          {error && <Alert variant="error">{error}</Alert>}
        </div>
      )}

      {/* Pre-recording controls */}
      {!isRecording && !processing && !isReviewing && (
        <div className="px-4 py-4 space-y-4">
          <div>
            <label className="flex items-center gap-1.5 text-[11px] font-semibold text-[#706e6b] mb-1.5 uppercase tracking-wide">
              <FolderOpen className="w-3.5 h-3.5 text-[#0070d2]" /> {t("recording.project")}
            </label>
            {!showNewProjectInput ? (
              <select
                value={selectedProjectId}
                onChange={(e) => {
                  if (e.target.value === "__new__") { setShowNewProjectInput(true); setSelectedProjectId(""); }
                  else setSelectedProjectId(e.target.value);
                }}
                disabled={loadingMeta}
                className="w-full px-3 py-2 bg-white border border-[#dddbda] rounded text-[13px] text-[#080707] focus:outline-none focus:ring-2 focus:ring-[#1589ee]"
              >
                <option value="">{t("recording.noProject")}</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                <option value="__new__">{t("recording.newProject")}</option>
              </select>
            ) : (
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => { setShowNewProjectInput(false); setNewProjectName(""); }} className="p-2 rounded hover:bg-[#f3f3f3] flex-shrink-0">
                  <X className="w-4 h-4 text-[#706e6b]" />
                </button>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder={t("recording.newProjectName")}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateProject()}
                  autoFocus
                  className="flex-1 px-3 py-2 bg-white border border-[#dddbda] rounded text-[13px] focus:outline-none focus:ring-2 focus:ring-[#1589ee]"
                />
                <Button size="sm" onClick={handleCreateProject} loading={creatingProject} disabled={!newProjectName.trim()}>
                  <Plus className="w-4 h-4 me-1" /> {t("common.create")}
                </Button>
              </div>
            )}
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-[11px] font-semibold text-[#706e6b] mb-1.5 uppercase tracking-wide">
              <Users className="w-3.5 h-3.5 text-[#0070d2]" /> {t("recording.participants")}
            </label>
            {loadingMeta ? (
              <p className="text-[12px] text-[#706e6b] animate-pulse">{t("common.loading")}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {members.map((m) => {
                  if (!m.user_id) return null;
                  const name = m.profile?.full_name || m.profile?.email || m.invited_email || t("recording.unknown");
                  const isSel = selectedParticipantIds.includes(m.user_id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleParticipant(m.user_id!)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[12px] font-medium border transition-colors ${
                        isSel ? "bg-[#0070d2] text-white border-[#0070d2]" : "bg-white text-[#3e3e3c] border-[#dddbda] hover:border-[#0070d2] hover:text-[#0070d2]"
                      }`}
                    >
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center font-bold text-[9px] ${isSel ? "bg-white/25 text-white" : "bg-[#ecf5fe] text-[#0070d2]"}`}>
                        {name.charAt(0).toUpperCase()}
                      </span>
                      {name}
                    </button>
                  );
                })}
                {members.length === 0 && <p className="text-[12px] text-[#706e6b]">{t("recording.noMembers")}</p>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Waveform */}
      <div className="px-4 pb-1">
        <AudioWaveform mediaStream={mediaStream} isRecording={isRecording} processing={processing} />
      </div>

      {/* Review state — play back the recording, then Approve (upload) or Discard */}
      {isReviewing && (
        <div className="px-4 py-6 flex flex-col items-center gap-4">
          <div className="text-center">
            <h3 className="text-[15px] font-bold text-[#080707]">{t("recording.reviewTitle")}</h3>
            <p className="text-[13px] text-[#706e6b] mt-0.5">{t("recording.reviewHint")}</p>
          </div>
          <audio controls src={reviewUrl ?? undefined} className="w-full max-w-sm" aria-label={t("recording.reviewTitle")} />
          <div className="flex items-center gap-3">
            <Button onClick={handleApprove} disabled={processing}>
              <Check className="w-4 h-4 me-1" /> {t("recording.approve")}
            </Button>
            <Button variant="danger" onClick={discardRecording} disabled={processing}>
              <Trash2 className="w-4 h-4 me-1" /> {t("recording.discard")}
            </Button>
          </div>
        </div>
      )}

      {/* Recorder */}
      {!isReviewing && (
      <div className="flex flex-col items-center py-6 px-4 gap-4">
        {isRecording && <div className="text-4xl font-mono font-bold text-[#080707] tabular-nums">{formatDuration(duration)}</div>}
        {isRecording && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#fde9e8] border border-[#f5c0bc]">
            <span className="w-2 h-2 rounded-full bg-[#c23934] animate-pulse" />
            <span className="text-[11px] font-bold text-[#c23934] tracking-widest">REC</span>
          </div>
        )}
        <div className="relative flex items-center justify-center">
          {isRecording && !shouldReduceMotion && (
            <motion.div
              className="absolute rounded-full bg-[#c23934]/15 pointer-events-none"
              style={{ width: 92, height: 92 }}
              animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0, 0.4] }}
              transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
            />
          )}
          {!isRecording ? (
            <button
              onClick={startRecording}
              disabled={capacity?.is_blocked || processing}
              className={`relative z-10 w-18 h-18 rounded-full flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-[#1589ee]/40 transition-transform hover:scale-105 active:scale-95 ${
                capacity?.is_blocked ? "bg-[#dddbda] cursor-not-allowed" : "bg-[#0070d2] shadow-[0_4px_16px_rgba(0,112,210,0.4)]"
              }`}
              style={{ width: 72, height: 72 }}
              aria-label={t("recording.startAria")}
            >
              <Mic className="w-8 h-8 text-white" />
            </button>
          ) : (
            <button
              onClick={handleStop}
              type="button"
              className="relative z-10 rounded-full bg-[#c23934] flex items-center justify-center shadow-[0_4px_16px_rgba(194,57,52,0.4)] focus:outline-none focus:ring-4 focus:ring-[#c23934]/30 transition-transform hover:scale-105 active:scale-95"
              style={{ width: 72, height: 72 }}
              aria-label={t("recording.stopAria")}
            >
              <Square className="w-7 h-7 text-white" />
            </button>
          )}
        </div>
        <p className="text-[13px] text-[#706e6b] text-center">
          {capacity?.is_blocked ? t("recording.statusBlocked") : isRecording ? t("recording.statusRecording") : t("recording.statusIdle")}
        </p>
      </div>
      )}

      {processing && (
        <div className="flex items-center justify-center gap-3 py-4 border-t border-[#dddbda] bg-[#fafaf9]">
          <svg className="animate-spin h-5 w-5 text-[#0070d2]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-[13px] text-[#0070d2] font-semibold">{t("recording.processing")}</span>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Console-styled calendar helpers + components (reuse api + TaskSchedulePicker)
// ════════════════════════════════════════════════════════════════════════════
const WEEK_HOURS = Array.from({ length: 14 }, (_, i) => i + 8);
const priorityDot: Record<string, string> = { critical: "bg-[#ba0517]", high: "bg-[#ea001e]", medium: "bg-[#fe9339]", low: "bg-[#0070d2]" };
const isoToDay = (iso: string) => new Date(iso).toLocaleDateString("sv-SE");
const isoToHour = (iso: string) => new Date(iso).getHours();
const todayLocal = () => new Date().toLocaleDateString("sv-SE");
const dateToYMD = (d: Date) => d.toLocaleDateString("sv-SE");
function startOfWeek(anchor: Date): Date {
  const d = new Date(anchor);
  d.setDate(anchor.getDate() - anchor.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function LightningUnscheduledRail({ tasks, token, onTaskUpdate }: { tasks: Task[]; token: string; onTaskUpdate: (u: Task) => void }) {
  const { t } = useLanguage();
  const [pickerTask, setPickerTask] = useState<Task | null>(null);
  const unscheduled = useMemo(() => tasks.filter((tk) => !tk.scheduled_at && tk.status !== "done"), [tasks]);

  if (unscheduled.length === 0) {
    return (
      <div className="rounded border border-[#dddbda] bg-[#fafaf9] px-4 py-3 text-[13px] text-[#706e6b] flex items-center gap-2">
        <CalendarClock className="w-4 h-4 text-[#aeb0b3]" /> {t("calendar.allScheduled")}
      </div>
    );
  }
  const onDragStart = (e: React.DragEvent, task: Task) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("application/x-task-id", task.id);
    e.dataTransfer.setData("text/plain", task.id);
  };
  return (
    <>
      <div className="rounded border border-[#dddbda] bg-white overflow-hidden">
        <div className="px-4 py-2.5 border-b border-[#dddbda] flex items-center gap-2 bg-[#fafaf9]">
          <Hand className="w-4 h-4 text-[#0070d2]" />
          <h3 className="text-[13px] font-semibold text-[#080707]">{t("calendar.unscheduledTitle")}</h3>
          <span className="text-[11px] text-[#706e6b] ms-1">{t("calendar.unscheduledHint", { count: unscheduled.length })}</span>
        </div>
        <div className="flex gap-2 overflow-x-auto px-4 py-3">
          {unscheduled.map((tk) => (
            <button
              key={tk.id}
              type="button"
              draggable
              onDragStart={(e) => onDragStart(e, tk)}
              onClick={() => setPickerTask(tk)}
              className="flex-shrink-0 max-w-[180px] cursor-grab active:cursor-grabbing px-3 py-2 rounded border border-[#dddbda] bg-white text-start text-[12px] font-medium text-[#3e3e3c] hover:border-[#0070d2] hover:shadow-sm transition-all"
              aria-label={t("calendar.scheduleAria", { title: tk.title })}
            >
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${priorityDot[tk.priority] || priorityDot.medium}`} />
                <span className="truncate">{tk.title}</span>
              </div>
              {tk.deadline && <p className="text-[10px] text-[#706e6b] truncate mt-0.5">{tk.deadline}</p>}
            </button>
          ))}
        </div>
      </div>
      {pickerTask && <TaskSchedulePicker task={pickerTask} token={token} onClose={() => setPickerTask(null)} onSaved={onTaskUpdate} />}
    </>
  );
}

function LightningCalendar({ sessions, tasks, token, onMeetingClick, onTaskUpdate }: { sessions: Session[]; tasks: Task[]; token: string; onMeetingClick: (s: Session) => void; onTaskUpdate: (u: Task) => void }) {
  const { t, lang } = useLanguage();
  const loc = localeOf(lang);
  const [view, setView] = useState<"month" | "week">("month");
  const [currentMonth, setCurrentMonth] = useState(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1); });
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [selectedDay, setSelectedDay] = useState<string | null>(todayLocal());
  const [dropError, setDropError] = useState<string | null>(null);
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null);

  const sessionsByDay = useMemo(() => {
    const map: Record<string, Session[]> = {};
    sessions.forEach((s) => { const d = isoToDay(s.created_at); (map[d] ||= []).push(s); });
    return map;
  }, [sessions]);
  const tasksByDay = useMemo(() => {
    const map: Record<string, Task[]> = {};
    tasks.forEach((t) => { if (!t.scheduled_at) return; const d = isoToDay(t.scheduled_at); (map[d] ||= []).push(t); });
    return map;
  }, [tasks]);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = todayLocal();

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));
  const prevWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); };
  const nextWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); };
  const goToday = () => { const n = new Date(); setCurrentMonth(new Date(n.getFullYear(), n.getMonth(), 1)); setWeekStart(startOfWeek(n)); setSelectedDay(todayLocal()); };

  const persistSchedule = async (task: Task, target: Date) => {
    const iso = target.toISOString();
    onTaskUpdate({ ...task, scheduled_at: iso });
    setSelectedDay(dateToYMD(target));
    try {
      const updated = (await api.updateTask(task.id, { scheduled_at: iso }, token)) as Task;
      onTaskUpdate({ ...task, ...updated, scheduled_at: iso });
    } catch (err) {
      onTaskUpdate({ ...task, scheduled_at: task.scheduled_at });
      setDropError(err instanceof Error ? err.message : t("schedule.errUpdate"));
      setTimeout(() => setDropError(null), 4000);
    }
  };
  const handleDrop = async (e: React.DragEvent, dayStr: string) => {
    e.preventDefault();
    setDragOverDay(null);
    const taskId = e.dataTransfer.getData("application/x-task-id");
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const target = new Date(`${dayStr}T00:00:00`);
    if (task.scheduled_at) { const o = new Date(task.scheduled_at); target.setHours(o.getHours(), o.getMinutes(), 0, 0); }
    else target.setHours(9, 0, 0, 0);
    await persistSchedule(task, target);
  };
  const handleSlotDrop = async (e: React.DragEvent, dayStr: string, hour: number) => {
    e.preventDefault();
    setDragOverSlot(null);
    const taskId = e.dataTransfer.getData("application/x-task-id");
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const target = new Date(`${dayStr}T00:00:00`);
    target.setHours(hour, 0, 0, 0);
    await persistSchedule(task, target);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
      <div className="rounded border border-[#dddbda] bg-white overflow-hidden">
        <div className="px-4 py-2.5 border-b border-[#dddbda] flex items-center justify-between gap-3 flex-wrap bg-[#fafaf9]">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-[#0070d2]" />
            <h2 className="text-[13px] font-semibold text-[#080707]">{t("calendar.headerTitle")}</h2>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-white border border-[#dddbda] rounded p-0.5">
              <button onClick={() => setView("month")} className={`px-2.5 py-1 text-[11px] font-semibold rounded transition-colors ${view === "month" ? "bg-[#0070d2] text-white" : "text-[#706e6b] hover:bg-[#f3f3f3]"}`}>{t("calendar.month")}</button>
              <button onClick={() => setView("week")} className={`px-2.5 py-1 text-[11px] font-semibold rounded transition-colors ${view === "week" ? "bg-[#0070d2] text-white" : "text-[#706e6b] hover:bg-[#f3f3f3]"}`}>{t("calendar.week")}</button>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={view === "month" ? nextMonth : nextWeek} className="p-1.5 rounded hover:bg-[#ecf5fe]" aria-label={t("calendar.next")}><ChevronRight className="w-4 h-4 text-[#706e6b] rtl:-scale-x-100" /></button>
              <span className="font-semibold text-[#080707] text-[13px] min-w-[140px] text-center">
                {view === "month"
                  ? currentMonth.toLocaleString(loc, { month: "long", year: "numeric" })
                  : (() => { const end = new Date(weekStart); end.setDate(end.getDate() + 6); return `${weekStart.toLocaleDateString(loc, { day: "numeric", month: "short" })} – ${end.toLocaleDateString(loc, { day: "numeric", month: "short" })}`; })()}
              </span>
              <button onClick={view === "month" ? prevMonth : prevWeek} className="p-1.5 rounded hover:bg-[#ecf5fe]" aria-label={t("calendar.prev")}><ChevronLeft className="w-4 h-4 text-[#706e6b] rtl:-scale-x-100" /></button>
              <button onClick={goToday} className="ms-1 px-2.5 py-1 text-[11px] font-semibold text-[#0070d2] border border-[#dddbda] rounded hover:bg-[#ecf5fe]">{t("calendar.today")}</button>
            </div>
          </div>
        </div>

        {dropError && <div className="px-4 py-2 bg-[#fde9e8] border-b border-[#f5c0bc] text-[11px] text-[#c23934]">{dropError}</div>}

        {view === "month" && (
          <>
            <div className="grid grid-cols-7 text-center px-2 pt-2">
              {[0, 1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="text-[10px] font-semibold text-[#706e6b] py-1">{t(`calendar.d${i}`)}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1 p-2">
              {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e-${i}`} className="aspect-square" />)}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const daySessions = sessionsByDay[dateStr] || [];
                const dayTasks = tasksByDay[dateStr] || [];
                const isSelected = selectedDay === dateStr;
                const isToday = dateStr === today;
                const isDragOver = dragOverDay === dateStr;
                const MAX = 4;
                const visS = daySessions.slice(0, MAX);
                const visT = dayTasks.slice(0, Math.max(0, MAX - visS.length));
                const hidden = daySessions.length - visS.length + (dayTasks.length - visT.length);
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                    onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; if (dragOverDay !== dateStr) setDragOverDay(dateStr); }}
                    onDragLeave={() => { if (dragOverDay === dateStr) setDragOverDay(null); }}
                    onDrop={(e) => handleDrop(e, dateStr)}
                    className={`relative aspect-square p-1 rounded text-start transition-all overflow-hidden border ${
                      isSelected ? "bg-[#ecf5fe] border-[#0070d2]" : isToday ? "bg-[#f4f9fe] border-[#cfe3fa]" : "border-transparent hover:bg-[#f3f3f3]"
                    } ${isDragOver ? "ring-2 ring-[#0070d2] bg-[#ecf5fe]" : ""}`}
                  >
                    <div className={`text-[11px] font-semibold ${isToday ? "text-[#0070d2]" : "text-[#3e3e3c]"}`}>{day}</div>
                    <div className="flex flex-col gap-0.5 mt-0.5 items-start">
                      {visS.map((s) => (
                        <span key={s.id} className="w-full truncate text-[9px] leading-tight px-1 py-[1px] rounded bg-[#dceffb] text-[#0070d2] text-start" title={s.title || t("calendar.meeting")}>• {s.title || t("calendar.meeting")}</span>
                      ))}
                      {visT.map((vt) => (
                        <span key={vt.id} className="w-full truncate text-[9px] leading-tight px-1 py-[1px] rounded bg-[#fdecdd] text-[#c4521a] text-start" title={vt.title}>✓ {vt.title}</span>
                      ))}
                      {hidden > 0 && <span className="text-[9px] font-semibold text-[#0070d2]">{t("calendar.more", { count: hidden })}</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {view === "week" && (() => {
          const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(weekStart); d.setDate(weekStart.getDate() + i); return d; });
          return (
            <div className="overflow-x-auto">
              <div className="grid grid-cols-[44px_repeat(7,minmax(80px,1fr))] gap-px bg-[#dddbda] border-b border-[#dddbda]">
                <div className="bg-white" />
                {days.map((d) => {
                  const ymd = dateToYMD(d);
                  const isToday = ymd === today;
                  const isSel = selectedDay === ymd;
                  return (
                    <button key={ymd} onClick={() => setSelectedDay(isSel ? null : ymd)} className={`p-2 text-center transition-colors ${isSel ? "bg-[#ecf5fe]" : isToday ? "bg-[#f4f9fe]" : "bg-white hover:bg-[#f3f3f3]"}`}>
                      <div className="text-[10px] text-[#706e6b]">{d.toLocaleDateString(loc, { weekday: "short" })}</div>
                      <div className={`text-[13px] font-bold ${isToday ? "text-[#0070d2]" : "text-[#080707]"}`}>{d.getDate()}</div>
                    </button>
                  );
                })}
              </div>
              <div className="grid grid-cols-[44px_repeat(7,minmax(80px,1fr))] gap-px bg-[#dddbda]">
                {WEEK_HOURS.map((h) => (
                  <Fragment key={h}>
                    <div className="bg-white text-[10px] text-[#706e6b] text-center pt-1">{String(h).padStart(2, "0")}:00</div>
                    {days.map((d) => {
                      const ymd = dateToYMD(d);
                      const slotKey = `${ymd}-${h}`;
                      const isDragOver = dragOverSlot === slotKey;
                      const slotSessions = (sessionsByDay[ymd] || []).filter((s) => isoToHour(s.created_at) === h);
                      const slotTasks = (tasksByDay[ymd] || []).filter((t) => t.scheduled_at && isoToHour(t.scheduled_at) === h);
                      return (
                        <div
                          key={slotKey}
                          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; if (dragOverSlot !== slotKey) setDragOverSlot(slotKey); }}
                          onDragLeave={() => { if (dragOverSlot === slotKey) setDragOverSlot(null); }}
                          onDrop={(e) => handleSlotDrop(e, ymd, h)}
                          className={`bg-white min-h-[40px] p-1 transition-colors ${isDragOver ? "ring-2 ring-inset ring-[#0070d2] bg-[#ecf5fe]" : ""}`}
                        >
                          {slotSessions.map((s) => (
                            <button key={s.id} onClick={() => onMeetingClick(s)} className="w-full text-start block text-[10px] leading-tight px-1.5 py-0.5 mb-0.5 rounded bg-[#dceffb] text-[#0070d2] hover:bg-[#c5e3fa] truncate" title={s.title || t("calendar.meeting")}>{s.title || t("calendar.meeting")}</button>
                          ))}
                          {slotTasks.map((st) => (
                            <div key={st.id} draggable onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("application/x-task-id", st.id); e.dataTransfer.setData("text/plain", st.id); }} className="w-full cursor-grab active:cursor-grabbing text-start block text-[10px] leading-tight px-1.5 py-0.5 mb-0.5 rounded bg-[#fdecdd] text-[#c4521a] truncate" title={st.title}>✓ {st.title}</div>
                          ))}
                        </div>
                      );
                    })}
                  </Fragment>
                ))}
              </div>
            </div>
          );
        })()}

        <div className="px-4 py-2 border-t border-[#dddbda] flex items-center gap-4 text-[11px] text-[#706e6b]">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-[#dceffb]" /><MicVocal className="w-3 h-3" /> {t("calendar.legendMeetings")}</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-[#fdecdd]" /><CheckSquare className="w-3 h-3" /> {t("calendar.legendTasks")}</span>
          <span className="text-[#aeb0b3] ms-auto">{t("calendar.dragHint")}</span>
        </div>
      </div>

      <LightningDayPanel selectedDate={selectedDay} sessions={sessions} tasks={tasks} token={token} onClose={() => setSelectedDay(null)} onMeetingClick={onMeetingClick} onTaskUpdate={onTaskUpdate} />
    </div>
  );
}

function LightningDayPanel({ selectedDate, sessions, tasks, token, onClose, onMeetingClick, onTaskUpdate }: { selectedDate: string | null; sessions: Session[]; tasks: Task[]; token: string; onClose: () => void; onMeetingClick: (s: Session) => void; onTaskUpdate: (u: Task) => void }) {
  const { t, lang } = useLanguage();
  const loc = localeOf(lang);
  const [pickerTask, setPickerTask] = useState<Task | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [clearingId, setClearingId] = useState<string | null>(null);

  const daySessions = useMemo(() => !selectedDate ? [] : sessions.filter((s) => isoToDay(s.created_at) === selectedDate).sort((a, b) => a.created_at.localeCompare(b.created_at)), [selectedDate, sessions]);
  const dayTasks = useMemo(() => !selectedDate ? [] : tasks.filter((t) => t.scheduled_at && isoToDay(t.scheduled_at) === selectedDate).sort((a, b) => (a.scheduled_at || "").localeCompare(b.scheduled_at || "")), [selectedDate, tasks]);
  const unscheduled = useMemo(() => tasks.filter((t) => !t.scheduled_at && t.status !== "done"), [tasks]);

  const clearFromDay = async (t: Task) => {
    setClearingId(t.id);
    onTaskUpdate({ ...t, scheduled_at: null });
    try { await api.updateTask(t.id, { scheduled_at: "" }, token); }
    catch { onTaskUpdate({ ...t, scheduled_at: t.scheduled_at }); }
    finally { setClearingId(null); }
  };

  if (!selectedDate) return null;
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.2 }} className="rounded border border-[#dddbda] bg-white overflow-hidden">
        <div className="px-4 py-2.5 border-b border-[#dddbda] flex items-center justify-between bg-[#fafaf9]">
          <div>
            <p className="text-[10px] font-semibold text-[#706e6b] uppercase tracking-wide mb-0.5">{t("calendar.selectedDate")}</p>
            <p className="text-[13px] font-bold text-[#080707]">{new Date(selectedDate + "T00:00:00").toLocaleDateString(loc, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-[#f3f3f3]" aria-label={t("common.close")}><X className="w-4 h-4 text-[#706e6b]" /></button>
        </div>
        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
          <section>
            <h4 className="text-[10px] font-semibold text-[#706e6b] uppercase tracking-wide mb-2 flex items-center gap-1.5"><MicVocal className="w-3 h-3" /> {t("calendar.meetingsCount", { count: daySessions.length })}</h4>
            {daySessions.length === 0 ? <p className="text-[11px] text-[#aeb0b3] px-1">{t("calendar.noMeetings")}</p> : (
              <div className="space-y-1.5">
                {daySessions.map((s) => (
                  <button key={s.id} onClick={() => onMeetingClick(s)} className="w-full text-start p-2.5 rounded bg-[#f4f9fe] hover:bg-[#ecf5fe] border border-transparent hover:border-[#cfe3fa] text-[13px] transition-all">
                    <p className="font-medium text-[#080707] truncate">{s.title || t("meetings.untitled")}</p>
                    <p className="text-[11px] text-[#706e6b] mt-0.5">{new Date(s.created_at).toLocaleTimeString(loc, { hour: "2-digit", minute: "2-digit" })}</p>
                  </button>
                ))}
              </div>
            )}
          </section>
          <section>
            <h4 className="text-[10px] font-semibold text-[#706e6b] uppercase tracking-wide mb-2 flex items-center gap-1.5"><CalendarClock className="w-3 h-3" /> {t("calendar.scheduledTasksCount", { count: dayTasks.length })}</h4>
            {dayTasks.length === 0 ? <p className="text-[11px] text-[#aeb0b3] px-1">{t("calendar.noTasks")}</p> : (
              <div className="space-y-1.5">
                {dayTasks.map((dt) => {
                  const gcal = buildGoogleCalendarUrlForTask(dt);
                  return (
                    <div key={dt.id} className="w-full p-2.5 rounded bg-[#fdf6f0] border border-[#f5e3d2] flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${priorityDot[dt.priority] || priorityDot.medium}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-[13px] font-medium truncate ${dt.status === "done" ? "line-through text-[#aeb0b3]" : "text-[#080707]"}`}>{dt.title}</p>
                        <p className="text-[11px] text-[#706e6b] mt-0.5">{new Date(dt.scheduled_at!).toLocaleTimeString(loc, { hour: "2-digit", minute: "2-digit" })}</p>
                      </div>
                      {gcal && <a href={gcal} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded hover:bg-[#ecf5fe]" title={t("schedule.addToGoogleCalendar")}><CalendarPlus className="w-3 h-3 text-[#0070d2]" /></a>}
                      <button onClick={() => setPickerTask(dt)} className="p-1.5 rounded hover:bg-[#ecf5fe]" title={t("calendar.editSchedule")}><Pencil className="w-3 h-3 text-[#0070d2]" /></button>
                      <button onClick={() => clearFromDay(dt)} disabled={clearingId === dt.id} className="p-1.5 rounded hover:bg-[#fde9e8] disabled:opacity-40" title={t("calendar.removeFromDay")}><XCircle className="w-3.5 h-3.5 text-[#c23934]" /></button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
          <section>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[10px] font-semibold text-[#706e6b] uppercase tracking-wide flex items-center gap-1.5"><Plus className="w-3 h-3" /> {t("calendar.addTaskToDay")}</h4>
              {unscheduled.length > 0 && <button onClick={() => setShowAddMenu((v) => !v)} className="text-[11px] font-semibold text-[#0070d2] hover:underline">{showAddMenu ? t("common.close") : t("calendar.show", { count: unscheduled.length })}</button>}
            </div>
            {unscheduled.length === 0 ? <p className="text-[11px] text-[#aeb0b3] px-1">{t("calendar.noUnscheduled")}</p> : showAddMenu ? (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {unscheduled.map((ut) => (
                  <button key={ut.id} onClick={() => { setPickerTask(ut); setShowAddMenu(false); }} className="w-full text-start p-2 rounded bg-[#fafaf9] hover:bg-[#ecf5fe] border border-transparent hover:border-[#cfe3fa] transition-all flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${priorityDot[ut.priority] || priorityDot.medium}`} />
                    <span className="text-[12px] font-medium text-[#3e3e3c] truncate flex-1">{ut.title}</span>
                    {ut.deadline && <span className="text-[10px] text-[#706e6b] truncate max-w-[100px]">{ut.deadline}</span>}
                  </button>
                ))}
              </div>
            ) : null}
          </section>
        </div>
      </motion.div>
      {pickerTask && <TaskSchedulePicker task={pickerTask} token={token} defaultDate={!pickerTask.scheduled_at ? selectedDate ?? undefined : undefined} onClose={() => setPickerTask(null)} onSaved={onTaskUpdate} />}
    </AnimatePresence>
  );
}
