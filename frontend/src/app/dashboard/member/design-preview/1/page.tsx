"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BarChart3, Clock, ListChecks, Mic, MicOff, ChevronLeft, ChevronRight,
  Zap, Bell, Settings, FolderOpen, CheckCircle2, Circle, AlertCircle,
} from "lucide-react";

// ── Mock data ─────────────────────────────────────────────────────────────────
const SESSIONS = [
  { id: "1", title: "Sprint Planning Q2", project: "מוצר", date: "2026-05-04", tasks: 6, done: 4 },
  { id: "2", title: "סיכום לקוח — Acme", project: "מכירות", date: "2026-05-03", tasks: 3, done: 1 },
  { id: "3", title: "Design Review", project: "עיצוב", date: "2026-05-01", tasks: 5, done: 5 },
  { id: "4", title: "Retrospective", project: "מוצר", date: "2026-04-28", tasks: 2, done: 0 },
  { id: "5", title: "Kick-off — פרויקט חדש", project: "מכירות", date: "2026-04-25", tasks: 8, done: 3 },
];

const TASKS = [
  { id: "1", title: "עדכן את תיעוד ה-API", project: "מוצר", status: "in_progress", priority: "high" },
  { id: "2", title: "שלח הצעת מחיר ל-Acme", project: "מכירות", status: "todo", priority: "critical" },
  { id: "3", title: "בנה מסך אונבורדינג", project: "עיצוב", status: "done", priority: "medium" },
  { id: "4", title: "תיקון באג בטעינת נתונים", project: "מוצר", status: "todo", priority: "high" },
  { id: "5", title: "כתוב בדיקות integration", project: "מוצר", status: "in_progress", priority: "low" },
];

const statusColor: Record<string, string> = {
  todo: "bg-slate-700/60 text-slate-300 border border-slate-600",
  in_progress: "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30",
  done: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
};
const priorityColor: Record<string, string> = {
  low: "bg-slate-700/60 text-slate-400",
  medium: "bg-blue-500/20 text-blue-300",
  high: "bg-orange-500/20 text-orange-300",
  critical: "bg-red-500/20 text-red-300",
};
const statusLabel: Record<string, string> = { todo: "לביצוע", in_progress: "בתהליך", done: "הושלם" };
const priorityLabel: Record<string, string> = { low: "נמוכה", medium: "בינונית", high: "גבוהה", critical: "קריטית" };

// ── Glass Card ────────────────────────────────────────────────────────────────
function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.4)] ${className}`}
    >
      {children}
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, gradient }: {
  icon: React.ReactNode; label: string; value: string | number; gradient: string;
}) {
  return (
    <GlassCard className="p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${gradient} shadow-lg`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-slate-400 font-medium">{label}</p>
        <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
      </div>
    </GlassCard>
  );
}

// ── Record Button ─────────────────────────────────────────────────────────────
function RecordButton() {
  const [recording, setRecording] = useState(false);
  return (
    <GlassCard className="p-6 flex flex-col items-center gap-5">
      <div className="text-center space-y-1">
        <h2 className="text-lg font-semibold text-white">הקלטת פגישה</h2>
        <p className="text-xs text-slate-400">לחץ להתחיל הקלטה — AI יתמלל ויחלץ משימות</p>
      </div>

      <button
        onClick={() => setRecording((r) => !r)}
        className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl
          ${recording
            ? "bg-red-500 shadow-red-500/40 animate-pulse"
            : "bg-gradient-to-br from-violet-500 to-cyan-500 shadow-violet-500/40 hover:scale-105"
          }`}
      >
        {recording ? (
          <MicOff className="w-10 h-10 text-white" />
        ) : (
          <Mic className="w-10 h-10 text-white" />
        )}
        {recording && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-400 border-2 border-[#0f0c29] animate-ping" />
        )}
      </button>

      {recording && (
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/20 border border-red-500/30">
          <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
          <span className="text-red-300 text-xs font-mono">00:02:34 — מקליט...</span>
        </div>
      )}

      <div className="w-full bg-white/5 rounded-xl p-3 flex items-center justify-between">
        <span className="text-xs text-slate-400">קיבולת שנותרה</span>
        <div className="flex items-center gap-2">
          <div className="w-32 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" />
          </div>
          <span className="text-xs font-medium text-cyan-300">218 דק׳</span>
        </div>
      </div>
    </GlassCard>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function Design1() {
  const [taskPage, setTaskPage] = useState(0);
  const [meetPage, setMeetPage] = useState(0);
  const PER = 3;
  const pagedTasks = TASKS.slice(taskPage * PER, (taskPage + 1) * PER);
  const pagedSessions = SESSIONS.slice(meetPage * PER, (meetPage + 1) * PER);

  return (
    <div
      className="min-h-screen text-white"
      style={{ background: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)" }}
      dir="rtl"
    >
      {/* Floating orbs */}
      <div className="fixed top-20 right-20 w-64 h-64 rounded-full bg-violet-600/20 blur-3xl pointer-events-none" />
      <div className="fixed bottom-32 left-16 w-48 h-48 rounded-full bg-cyan-500/15 blur-3xl pointer-events-none" />

      {/* Top bar */}
      <header className="sticky top-0 z-20 flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/30 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white tracking-wide">TaskFlow AI</span>
        </div>
        <div className="flex items-center gap-3">
          <button className="p-2 rounded-xl border border-white/10 hover:bg-white/10 transition-colors">
            <Bell className="w-4 h-4 text-slate-300" />
          </button>
          <button className="p-2 rounded-xl border border-white/10 hover:bg-white/10 transition-colors">
            <Settings className="w-4 h-4 text-slate-300" />
          </button>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-cyan-400 flex items-center justify-center text-xs font-bold">
            ש
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Page title */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">דף הבית</h1>
            <p className="text-sm text-slate-400 mt-0.5">ברוך הבא, שלו ✦</p>
          </div>
          <Link href="/dashboard/member/design-preview" className="text-xs text-slate-400 hover:text-white transition-colors border border-white/10 px-3 py-1.5 rounded-lg">
            ← חזרה לסגנונות
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            icon={<BarChart3 className="w-6 h-6 text-white" />}
            label="פגישות"
            value={SESSIONS.length}
            gradient="bg-gradient-to-br from-violet-600 to-violet-400"
          />
          <StatCard
            icon={<ListChecks className="w-6 h-6 text-white" />}
            label="משימות"
            value={TASKS.length}
            gradient="bg-gradient-to-br from-cyan-600 to-cyan-400"
          />
          <StatCard
            icon={<Clock className="w-6 h-6 text-white" />}
            label="נותר"
            value="218 דק׳"
            gradient="bg-gradient-to-br from-emerald-600 to-emerald-400"
          />
        </div>

        {/* Record */}
        <RecordButton />

        {/* Meetings */}
        <GlassCard>
          <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
            <h2 className="font-semibold text-white">פגישות אחרונות</h2>
            <span className="text-xs text-slate-400">{SESSIONS.length} סה״כ</span>
          </div>
          <div className="divide-y divide-white/5">
            {pagedSessions.map((s) => (
              <div key={s.id} className="px-6 py-3 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer group">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-white group-hover:text-cyan-300 transition-colors">{s.title}</p>
                  <div className="flex items-center gap-2">
                    <FolderOpen className="w-3 h-3 text-violet-400" />
                    <span className="text-xs text-slate-400">{s.project}</span>
                    <span className="text-xs text-slate-600">•</span>
                    <span className="text-xs text-slate-500">{s.date}</span>
                  </div>
                </div>
                <div className={`px-2.5 py-1 rounded-full text-xs font-medium border
                  ${s.done === s.tasks
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                    : "bg-slate-700/60 text-slate-300 border-slate-600"
                  }`}>
                  {s.done}/{s.tasks} ✓
                </div>
              </div>
            ))}
          </div>
          {SESSIONS.length > PER && (
            <div className="px-6 py-3 border-t border-white/5 flex items-center justify-between">
              <span className="text-xs text-slate-500">{meetPage + 1} / {Math.ceil(SESSIONS.length / PER)}</span>
              <div className="flex gap-1">
                <button onClick={() => setMeetPage((p) => Math.max(0, p - 1))} disabled={meetPage === 0}
                  className="p-1.5 rounded-lg border border-white/10 hover:bg-white/10 disabled:opacity-30 transition-colors">
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setMeetPage((p) => Math.min(Math.ceil(SESSIONS.length / PER) - 1, p + 1))}
                  disabled={meetPage >= Math.ceil(SESSIONS.length / PER) - 1}
                  className="p-1.5 rounded-lg border border-white/10 hover:bg-white/10 disabled:opacity-30 transition-colors">
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </GlassCard>

        {/* Tasks */}
        <GlassCard>
          <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
            <h2 className="font-semibold text-white">משימות אחרונות</h2>
            <div className="flex gap-1.5">
              {["זמן", "דחיפות", "סטטוס"].map((l) => (
                <button key={l} className="px-2.5 py-1 rounded-lg text-xs text-slate-400 border border-white/10 hover:bg-white/10 transition-colors">
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div className="divide-y divide-white/5">
            {pagedTasks.map((t) => (
              <div key={t.id} className="px-6 py-3 flex items-center gap-4 hover:bg-white/5 transition-colors">
                <div className="flex-shrink-0">
                  {t.status === "done"
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    : t.status === "in_progress"
                      ? <AlertCircle className="w-4 h-4 text-cyan-400" />
                      : <Circle className="w-4 h-4 text-slate-500" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${t.status === "done" ? "line-through text-slate-500" : "text-white"}`}>
                    {t.title}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <FolderOpen className="w-3 h-3 text-violet-400" />
                    <span className="text-xs text-slate-400">{t.project}</span>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs ${statusColor[t.status]}`}>
                  {statusLabel[t.status]}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs ${priorityColor[t.priority]}`}>
                  {priorityLabel[t.priority]}
                </span>
              </div>
            ))}
          </div>
          {TASKS.length > PER && (
            <div className="px-6 py-3 border-t border-white/5 flex items-center justify-between">
              <span className="text-xs text-slate-500">{taskPage + 1} / {Math.ceil(TASKS.length / PER)}</span>
              <div className="flex gap-1">
                <button onClick={() => setTaskPage((p) => Math.max(0, p - 1))} disabled={taskPage === 0}
                  className="p-1.5 rounded-lg border border-white/10 hover:bg-white/10 disabled:opacity-30 transition-colors">
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setTaskPage((p) => Math.min(Math.ceil(TASKS.length / PER) - 1, p + 1))}
                  disabled={taskPage >= Math.ceil(TASKS.length / PER) - 1}
                  className="p-1.5 rounded-lg border border-white/10 hover:bg-white/10 disabled:opacity-30 transition-colors">
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </GlassCard>
      </main>
    </div>
  );
}
