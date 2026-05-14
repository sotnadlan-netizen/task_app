"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useTypewriter } from "@/hooks/useTypewriter";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/providers/supabase-provider";
import { useOrganization } from "@/providers/organization-provider";
import { useRealtime } from "@/providers/realtime-provider";
import { RecordingHub } from "@/components/recording/recording-hub";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { api } from "@/lib/api";
import type { Session, Task, OrgMembership, Profile } from "@/types";
import { SessionDetailModal } from "@/components/meetings/session-detail-modal";
import {
  BarChart3,
  Clock,
  ListChecks,
  UserPlus,
  Trash2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  FolderOpen,
} from "lucide-react";

interface MemberWithProfile extends OrgMembership {
  profile: Profile | undefined;
}

const priorityLabels: Record<string, string> = {
  low: "נמוכה",
  medium: "בינונית",
  high: "גבוהה",
  critical: "קריטית",
};

const statusLabels: Record<string, string> = {
  todo: "לביצוע",
  in_progress: "בתהליך",
  done: "הושלם",
};

const priorityColors = {
  low: "default" as const,
  medium: "info" as const,
  high: "warning" as const,
  critical: "danger" as const,
};

type MeetingSort = "time" | "project";
type TaskSort = "time" | "project" | "status" | "urgency";

const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const statusOrder: Record<string, number> = { todo: 0, in_progress: 1, done: 2 };

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "בוקר טוב";
  if (h < 17) return "צהריים טובים";
  return "ערב טוב";
}

// ─── Framer Motion Variants ───────────────────────────────────────────────────
const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
};

const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

const listItem = {
  hidden: { opacity: 0, x: -10 },
  show: { opacity: 1, x: 0, transition: { duration: 0.22 } },
};

// ─── Calendar Modal ───────────────────────────────────────────────────────────
function CalendarModal({
  sessions,
  onClose,
  onSelectSession,
}: {
  sessions: Session[];
  onClose: () => void;
  onSelectSession: (s: Session) => void;
}) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const sessionsByDay = useMemo(() => {
    const map: Record<string, Session[]> = {};
    sessions.forEach((s) => {
      const day = new Date(s.created_at).toISOString().split("T")[0];
      if (!map[day]) map[day] = [];
      map[day].push(s);
    });
    return map;
  }, [sessions]);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  const dayHeaders = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];
  const selectedDaySessions = selectedDay ? sessionsByDay[selectedDay] || [] : [];

  return (
    <Modal open onClose={onClose} title="לוח שנה — פגישות">
      <div className="space-y-4" dir="rtl">
        <div className="flex items-center justify-between">
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-xl hover:bg-violet-50 transition-colors"
            aria-label="חודש הבא"
          >
            <ChevronRight className="w-4 h-4 text-gray-500" />
          </button>
          <span className="font-semibold text-gray-800">
            {currentMonth.toLocaleString("he-IL", { month: "long", year: "numeric" })}
          </span>
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-xl hover:bg-violet-50 transition-colors"
            aria-label="חודש קודם"
          >
            <ChevronLeft className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="grid grid-cols-7 text-center">
          {dayHeaders.map((d) => (
            <div key={d} className="text-xs font-medium text-gray-400 py-1">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const hasSessions = !!sessionsByDay[dateStr];
            const isSelected = selectedDay === dateStr;
            return (
              <button
                key={day}
                onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                className={`relative py-2 rounded-2xl text-sm text-center transition-all ${
                  isSelected
                    ? "bg-gradient-to-br from-violet-400 to-pink-400 text-white shadow-sm"
                    : hasSessions
                      ? "bg-violet-50 hover:bg-violet-100 text-violet-700 font-semibold"
                      : "hover:bg-white/60 text-gray-600"
                }`}
              >
                {day}
                {hasSessions && !isSelected && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-violet-400" />
                )}
              </button>
            );
          })}
        </div>

        {selectedDay && (
          <div className="border-t border-violet-50 pt-3 space-y-2">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              {selectedDaySessions.length > 0
                ? `פגישות — ${new Date(selectedDay).toLocaleDateString("he-IL")}`
                : "אין פגישות ביום זה"}
            </p>
            {selectedDaySessions.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  onSelectSession(s);
                  onClose();
                }}
                className="w-full text-right p-2.5 rounded-2xl bg-violet-50/60 hover:bg-violet-100/60 border border-transparent hover:border-violet-200 text-sm transition-all"
              >
                <p className="font-medium text-gray-800">{s.title || "פגישה ללא שם"}</p>
                {s.summary && (
                  <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{s.summary}</p>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── Add Participant Modal ────────────────────────────────────────────────────
function AddParticipantModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { session } = useSupabase();
  const { currentOrg } = useOrganization();
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
      setSuccess(`${trimmedEmail} נוסף כמשתתף.`);
      setEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בהוספת משתתף");
    }
    setLoading(false);
  };

  return (
    <Modal open={open} onClose={onClose} title="הוסף משתתף">
      <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
        <Alert variant="warning">
          למשתתפים יש גישת קריאה בלבד למשימות ואינם צורכים קיבולת הקלטה.
        </Alert>

        {error && <Alert variant="error">{error}</Alert>}
        {success && (
          <div className="px-3 py-2 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
            {success}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">כתובת אימייל</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            required
            dir="ltr"
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent bg-gray-50"
          />
          <p className="text-xs text-gray-400 mt-1">
            אם המשתמש טרם נכנס למערכת, הוא יקושר אוטומטית בהתחברות הראשונה.
          </p>
        </div>

        <div className="flex justify-start gap-3 pt-2">
          <Button type="submit" loading={loading}>
            <UserPlus className="w-4 h-4 ml-1" />
            הוסף משתתף
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            סגור
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Task Title with optional typewriter animation ───────────────────────────
function TaskTitle({ title, animate }: { title: string; animate: boolean }) {
  const displayed = useTypewriter(animate ? title : "", 22);
  return <>{animate ? displayed || " " : title}</>;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  icon,
  iconBg,
  label,
  value,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string | number;
}) {
  return (
    <motion.div
      variants={fadeUp}
      className="glass-panel bg-white rounded-2xl border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-5 flex items-center gap-4 transition-all duration-200 hover:shadow-[0_6px_24px_rgba(0,0,0,0.09)] hover:-translate-y-0.5"
    >
      <div className={`w-11 h-11 rounded-2xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500 mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-gray-800 leading-none">{value}</p>
      </div>
    </motion.div>
  );
}

// ─── Pagination Bar ───────────────────────────────────────────────────────────
function PaginationBar({
  page,
  totalPages,
  onPrev,
  onNext,
  borderColor = "border-gray-100",
}: {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
  borderColor?: string;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className={`flex items-center justify-between px-5 py-3 border-t ${borderColor}`}>
      <span className="text-xs text-gray-400">{page + 1} / {totalPages}</span>
      <div className="flex gap-1">
        <button
          onClick={onPrev}
          disabled={page === 0}
          className="p-1.5 rounded-xl bg-white shadow-sm border border-gray-200 hover:border-gray-300 disabled:opacity-30 transition-all"
          aria-label="עמוד קודם"
        >
          <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
        </button>
        <button
          onClick={onNext}
          disabled={page >= totalPages - 1}
          className="p-1.5 rounded-xl bg-white shadow-sm border border-gray-200 hover:border-gray-300 disabled:opacity-30 transition-all"
          aria-label="עמוד הבא"
        >
          <ChevronLeft className="w-3.5 h-3.5 text-gray-500" />
        </button>
      </div>
    </div>
  );
}

// ─── Member Page ──────────────────────────────────────────────────────────────
export default function MemberPage() {
  const { supabase, session } = useSupabase();
  const { currentOrg, capacity, currentRole, loading: orgLoading } = useOrganization();
  const { subscribe } = useRealtime();
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();

  const [allSessions, setAllSessions] = useState<Session[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [taskCountTotal, setTaskCountTotal] = useState(0);
  const [taskCounts, setTaskCounts] = useState<Record<string, { total: number; done: number }>>({});
  const [projects, setProjects] = useState<Record<string, string>>({});

  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [confirmDeleteSession, setConfirmDeleteSession] = useState<Session | null>(null);
  const [deletingSession, setDeletingSession] = useState(false);
  const [deleteSessionError, setDeleteSessionError] = useState<string | null>(null);

  const [meetingSort, setMeetingSort] = useState<MeetingSort>("time");
  const [meetingPage, setMeetingPage] = useState(0);
  const [meetingProjectFilter, setMeetingProjectFilter] = useState<string>("");

  const [taskSort, setTaskSort] = useState<TaskSort>("time");
  const [taskPage, setTaskPage] = useState(0);
  const [taskProjectFilter, setTaskProjectFilter] = useState<string>("");

  // Typewriter: track which task IDs were seen on initial load vs. arrived via realtime
  const initialTaskIdsRef = useRef<Set<string> | null>(null);
  const [newTaskIds, setNewTaskIds] = useState<Set<string>>(new Set());

  const ITEMS_PER_PAGE = 5;

  useEffect(() => {
    if (orgLoading) return;
    if (currentRole === "participant") {
      router.replace("/dashboard/participant");
    }
  }, [orgLoading, currentRole, router]);

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

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    const unsub = subscribe("sessions", () => loadStats());
    return unsub;
  }, [subscribe, loadStats]);

  // Detect tasks that arrived after initial page load (for typewriter effect)
  useEffect(() => {
    if (allTasks.length === 0) return;
    if (initialTaskIdsRef.current === null) {
      // First load — record these IDs as "already seen"
      initialTaskIdsRef.current = new Set(allTasks.map((t) => t.id));
      return;
    }
    const fresh = allTasks
      .filter((t) => !initialTaskIdsRef.current!.has(t.id))
      .map((t) => t.id);
    if (fresh.length > 0) {
      const freshSet = new Set(fresh);
      fresh.forEach((id) => initialTaskIdsRef.current!.add(id));
      setNewTaskIds(freshSet);
      const timeout = setTimeout(() => setNewTaskIds(new Set()), fresh.length * 1200 + 3000);
      return () => clearTimeout(timeout);
    }
  }, [allTasks]);

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
      setDeleteSessionError(err instanceof Error ? err.message : "שגיאה במחיקת פגישה");
    } finally {
      setDeletingSession(false);
    }
  };

  const sortedMeetings = useMemo(() => {
    let copy = meetingProjectFilter
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
    let copy = taskProjectFilter
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

  if (orgLoading || currentRole === "participant") return null;

  const token = session?.access_token || "";
  const hasProjects = Object.keys(projects).length > 0;

  return (
    <div className="space-y-6" dir="rtl">

      {/* ── Welcome Header ─────────────────────────────────────────────────── */}
      <motion.div
        initial={shouldReduceMotion ? {} : { opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-end justify-between gap-4"
      >
        <div>
          <p className="text-xs font-medium text-gray-400 mb-1">
            {new Date().toLocaleDateString("he-IL", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
          <h1 className="text-2xl font-bold text-gray-800">{getGreeting()} 👋</h1>
          {currentOrg && (
            <p className="text-sm text-gray-500 mt-0.5">{currentOrg.name}</p>
          )}
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setShowAddParticipant(true)}
        >
          <UserPlus className="w-4 h-4 ml-1.5" />
          הוסף משתתף
        </Button>
      </motion.div>

      {/* ── Stats Row ──────────────────────────────────────────────────────── */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        <StatCard
          icon={<BarChart3 className="w-5 h-5 text-violet-600" />}
          iconBg="bg-violet-100"
          label="פגישות"
          value={allSessions.length}
        />
        <StatCard
          icon={<ListChecks className="w-5 h-5 text-sky-600" />}
          iconBg="bg-sky-100"
          label="סה״כ משימות"
          value={taskCountTotal}
        />
        <StatCard
          icon={<Clock className="w-5 h-5 text-amber-600" />}
          iconBg="bg-amber-100"
          label="דקות נותרות"
          value={capacity ? `${capacity.remaining_minutes} דק׳` : "—"}
        />
      </motion.div>

      {/* ── Recording Hub ──────────────────────────────────────────────────── */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="show"
        transition={{ delay: 0.2 }}
      >
        <RecordingHub />
      </motion.div>

      {/* ── Meetings Section ───────────────────────────────────────────────── */}
      {allSessions.length > 0 && (
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          transition={{ delay: 0.28 }}
          className="glass-panel bg-white rounded-2xl border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden"
        >
          {/* Section header */}
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-base font-bold text-gray-800">פגישות אחרונות</h2>
            <div className="flex items-center gap-2 flex-wrap">
              {hasProjects && (
                <select
                  value={meetingProjectFilter}
                  onChange={(e) => { setMeetingProjectFilter(e.target.value); setMeetingPage(0); }}
                  className="px-2.5 py-1.5 rounded-xl border border-gray-200 text-xs text-gray-600 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
                >
                  <option value="">כל הפרויקטים</option>
                  {Object.entries(projects).map(([id, name]) => (
                    <option key={id} value={id}>{name}</option>
                  ))}
                </select>
              )}
              <button
                onClick={() => setShowCalendar(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-xs text-gray-500 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-400"
                aria-label="פתח לוח שנה"
              >
                <CalendarDays className="w-3.5 h-3.5" />
                לוח שנה
              </button>
              <button
                onClick={() => { setMeetingSort(meetingSort === "time" ? "project" : "time"); setMeetingPage(0); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-xs text-gray-500 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-400"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                {meetingSort === "time" ? "לפי פרויקט" : "לפי זמן"}
              </button>
            </div>
          </div>

          {/* Rows */}
          <motion.div
            variants={listVariants}
            initial="hidden"
            animate="show"
            className="divide-y divide-gray-50"
          >
            {pagedMeetings.map((s) => {
              const tc = taskCounts[s.id];
              return (
                <motion.div
                  key={s.id}
                  variants={listItem}
                  onClick={() => setSelectedSession(s)}
                  className="px-5 py-3.5 flex items-center gap-3.5 hover:bg-violet-50/30 transition-colors cursor-pointer group"
                >
                  <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <span className="text-white font-bold text-xs">{(s.title || "פ")[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate group-hover:text-violet-600 transition-colors">
                      {s.title || "פגישה ללא שם"}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {s.project_id && projects[s.project_id] ? (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <FolderOpen className="w-3 h-3 text-gray-300" />
                          {projects[s.project_id]} · {new Date(s.created_at).toLocaleDateString("he-IL")}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">{new Date(s.created_at).toLocaleDateString("he-IL")}</span>
                      )}
                    </div>
                  </div>
                  {tc ? (
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                      tc.done === tc.total
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-sky-50 text-sky-700 border-sky-200"
                    }`}>
                      {tc.done}/{tc.total} ✓
                    </span>
                  ) : (
                    <span className="text-gray-300 text-xs">—</span>
                  )}
                </motion.div>
              );
            })}
          </motion.div>

          <PaginationBar
            page={meetingPage}
            totalPages={meetingTotalPages}
            onPrev={() => setMeetingPage((p) => Math.max(0, p - 1))}
            onNext={() => setMeetingPage((p) => Math.min(meetingTotalPages - 1, p + 1))}
          />
        </motion.div>
      )}

      {/* ── Tasks Section ──────────────────────────────────────────────────── */}
      {allTasks.length > 0 && (
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          transition={{ delay: 0.34 }}
          className="glass-panel bg-white rounded-2xl border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden"
        >
          {/* Section header */}
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-base font-bold text-gray-800">משימות אחרונות</h2>
            <div className="flex items-center gap-2 flex-wrap">
              {hasProjects && (
                <select
                  value={taskProjectFilter}
                  onChange={(e) => { setTaskProjectFilter(e.target.value); setTaskPage(0); }}
                  className="px-2.5 py-1.5 rounded-xl border border-gray-200 text-xs text-gray-600 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
                >
                  <option value="">כל הפרויקטים</option>
                  {Object.entries(projects).map(([id, name]) => (
                    <option key={id} value={id}>{name}</option>
                  ))}
                </select>
              )}
              <div className="flex items-center gap-1">
                {(["time", "project", "status", "urgency"] as TaskSort[]).map((s) => {
                  const labels: Record<TaskSort, string> = {
                    time: "זמן",
                    project: "פרויקט",
                    status: "סטטוס",
                    urgency: "דחיפות",
                  };
                  return (
                    <button
                      key={s}
                      onClick={() => { setTaskSort(s); setTaskPage(0); }}
                      className={`px-2.5 py-1 rounded-xl text-xs font-medium transition-all border focus:outline-none focus:ring-2 focus:ring-violet-400 ${
                        taskSort === s
                          ? "bg-gradient-to-br from-violet-500 to-pink-500 text-white border-transparent shadow-sm"
                          : "text-gray-500 border-gray-200 bg-gray-50 hover:bg-gray-100 hover:text-gray-700"
                      }`}
                    >
                      {labels[s]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Rows */}
          <motion.div
            variants={listVariants}
            initial="hidden"
            animate="show"
            className="divide-y divide-gray-50"
          >
            {pagedTasks.map((t) => (
              <motion.div
                key={t.id}
                variants={listItem}
                className="px-5 py-3.5 flex items-center gap-3.5 hover:bg-gray-50/60 transition-colors group"
              >
                {/* Status indicator */}
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  t.status === "done"
                    ? "bg-emerald-50 border border-emerald-200"
                    : t.status === "in_progress"
                      ? "bg-amber-50 border border-amber-200"
                      : "bg-gray-50 border border-gray-200"
                }`}>
                  {t.status === "done"
                    ? <span className="text-emerald-500 text-xs font-bold">✓</span>
                    : t.status === "in_progress"
                      ? <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                      : <span className="w-2.5 h-2.5 rounded-full border-2 border-gray-300" />
                  }
                </div>

                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate ${
                    t.status === "done" ? "line-through text-gray-300" : "text-gray-800"
                  }`}>
                    <TaskTitle title={t.title} animate={newTaskIds.has(t.id)} />
                  </p>
                  {t.project_id && projects[t.project_id] && (
                    <span className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                      <FolderOpen className="w-3 h-3 text-gray-300" />
                      {projects[t.project_id]}
                    </span>
                  )}
                </div>

                {/* Status badge */}
                <span className={`hidden sm:inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium border ${
                  t.status === "done"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : t.status === "in_progress"
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-gray-100 text-gray-500 border-gray-200"
                }`}>
                  {statusLabels[t.status] ?? t.status}
                </span>

                {/* Priority */}
                <Badge variant={priorityColors[t.priority]}>
                  {priorityLabels[t.priority] ?? t.priority}
                </Badge>
              </motion.div>
            ))}
          </motion.div>

          <PaginationBar
            page={taskPage}
            totalPages={taskTotalPages}
            onPrev={() => setTaskPage((p) => Math.max(0, p - 1))}
            onNext={() => setTaskPage((p) => Math.min(taskTotalPages - 1, p + 1))}
          />
        </motion.div>
      )}

      {/* ── Session Detail Modal ───────────────────────────────────────────── */}
      {selectedSession && (
        <SessionDetailModal
          session={selectedSession}
          token={token}
          onClose={() => setSelectedSession(null)}
          onRequestDelete={(s) => {
            setSelectedSession(null);
            setConfirmDeleteSession(s);
            setDeleteSessionError(null);
          }}
          onSessionUpdate={(updated) => {
            setAllSessions((prev) =>
              prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s))
            );
            setSelectedSession((prev) => prev ? { ...prev, ...updated } : prev);
          }}
        />
      )}

      {/* ── Confirm Delete Modal ───────────────────────────────────────────── */}
      {confirmDeleteSession && (
        <Modal
          open
          onClose={() => !deletingSession && setConfirmDeleteSession(null)}
          title="מחיקת פגישה"
        >
          <div className="space-y-4" dir="rtl">
            <div className="flex items-start gap-3 p-3 bg-red-50/60 border border-red-100 rounded-2xl">
              <Trash2 className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-700">
                <p className="font-semibold mb-1">
                  האם למחוק את הפגישה &quot;{confirmDeleteSession.title || "פגישה ללא שם"}&quot;?
                </p>
                <p>
                  פעולה זו תמחק לצמיתות את סיכום הפגישה ואת <strong>כל המשימות הקשורות</strong> אליה.
                  לא ניתן לבטל פעולה זו.
                </p>
              </div>
            </div>

            {deleteSessionError && (
              <Alert variant="error">{deleteSessionError}</Alert>
            )}

            <div className="flex gap-3 justify-start">
              <Button variant="danger" onClick={handleDeleteSession} loading={deletingSession}>
                <Trash2 className="w-4 h-4 ml-1" />
                מחק לצמיתות
              </Button>
              <Button variant="secondary" onClick={() => setConfirmDeleteSession(null)} disabled={deletingSession}>
                ביטול
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Calendar Modal ─────────────────────────────────────────────────── */}
      {showCalendar && (
        <CalendarModal
          sessions={allSessions}
          onClose={() => setShowCalendar(false)}
          onSelectSession={(s) => setSelectedSession(s)}
        />
      )}

      {/* ── Add Participant Modal ──────────────────────────────────────────── */}
      <AddParticipantModal
        open={showAddParticipant}
        onClose={() => setShowAddParticipant(false)}
      />
    </div>
  );
}
