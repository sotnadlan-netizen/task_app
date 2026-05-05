"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BarChart3, Clock, ListChecks, Mic, MicOff, ChevronLeft, ChevronRight,
  FolderOpen, Heart, Smile, Star, CheckCircle,
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

const projectColors: Record<string, string> = {
  "מוצר": "from-violet-400 to-fuchsia-400",
  "מכירות": "from-rose-400 to-pink-400",
  "עיצוב": "from-sky-400 to-blue-400",
};

const statusPill: Record<string, { bg: string; text: string; label: string }> = {
  todo: { bg: "bg-slate-100", text: "text-slate-500", label: "לביצוע" },
  in_progress: { bg: "bg-amber-100", text: "text-amber-600", label: "בתהליך" },
  done: { bg: "bg-emerald-100", text: "text-emerald-600", label: "הושלם" },
};
const priorityPill: Record<string, { bg: string; text: string; label: string }> = {
  critical: { bg: "bg-red-100", text: "text-red-500", label: "קריטית" },
  high: { bg: "bg-orange-100", text: "text-orange-500", label: "גבוהה" },
  medium: { bg: "bg-blue-100", text: "text-blue-500", label: "בינונית" },
  low: { bg: "bg-gray-100", text: "text-gray-400", label: "נמוכה" },
};

function PastelCard({ children, gradient = "from-white to-white", className = "" }: {
  children: React.ReactNode; gradient?: string; className?: string;
}) {
  return (
    <div
      className={`rounded-3xl bg-gradient-to-br ${gradient} shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-white ${className}`}
    >
      {children}
    </div>
  );
}

export default function Design5() {
  const [recording, setRecording] = useState(false);
  const [taskPage, setTaskPage] = useState(0);
  const [meetPage, setMeetPage] = useState(0);
  const PER = 3;
  const pagedTasks = TASKS.slice(taskPage * PER, (taskPage + 1) * PER);
  const pagedSessions = SESSIONS.slice(meetPage * PER, (meetPage + 1) * PER);

  return (
    <div
      className="min-h-screen"
      style={{
        background: "linear-gradient(160deg, #fdf4ff 0%, #f0f9ff 40%, #fdf2f8 70%, #fff7ed 100%)",
      }}
      dir="rtl"
    >
      {/* Header */}
      <header className="sticky top-0 z-20 px-6 py-4 flex items-center justify-between"
        style={{ background: "rgba(255,255,255,0.7)", backdropFilter: "blur(20px)" }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-400 to-pink-400 flex items-center justify-center">
            <Heart className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-800 tracking-tight">TaskFlow</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/member/design-preview"
            className="text-xs text-gray-400 hover:text-gray-700 transition-colors px-3 py-1.5 rounded-full bg-white/60 border border-gray-100">
            ← סגנונות
          </Link>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-300 to-pink-300 flex items-center justify-center text-white text-sm font-semibold">
            ש
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-5">
        {/* Greeting */}
        <PastelCard gradient="from-violet-50 to-fuchsia-50" className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Smile className="w-5 h-5 text-violet-400" />
                <span className="text-xs font-semibold text-violet-400 uppercase tracking-widest">ברוך הבא</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-800">שלום, שלו</h1>
              <p className="text-sm text-gray-400">יום שלישי טוב, 5 במאי 2026</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: <BarChart3 className="w-4 h-4 text-violet-400" />, label: "פגישות", value: SESSIONS.length, bg: "bg-violet-100" },
                { icon: <ListChecks className="w-4 h-4 text-pink-400" />, label: "משימות", value: TASKS.length, bg: "bg-pink-100" },
                { icon: <Clock className="w-4 h-4 text-sky-400" />, label: "דק׳", value: 218, bg: "bg-sky-100" },
              ].map((s) => (
                <div key={s.label} className={`${s.bg} rounded-2xl p-3 text-center min-w-[64px]`}>
                  <div className="flex justify-center mb-1">{s.icon}</div>
                  <p className="text-lg font-bold text-gray-800">{s.value}</p>
                  <p className="text-xs text-gray-400">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </PastelCard>

        {/* Recording */}
        <PastelCard gradient="from-pink-50 to-rose-50" className="p-6">
          <div className="flex items-center gap-5">
            <button
              onClick={() => setRecording((r) => !r)}
              className={`relative w-20 h-20 rounded-[28px] flex items-center justify-center transition-all duration-300 flex-shrink-0
                shadow-[0_8px_24px_rgba(0,0,0,0.12)] hover:scale-105 active:scale-95
                ${recording
                  ? "bg-gradient-to-br from-red-400 to-pink-500"
                  : "bg-gradient-to-br from-violet-400 to-pink-400"
                }`}
            >
              {recording ? <MicOff className="w-9 h-9 text-white" /> : <Mic className="w-9 h-9 text-white" />}
              {recording && (
                <span className="absolute top-1 right-1 w-3 h-3 rounded-full bg-white/80 animate-ping" />
              )}
            </button>
            <div className="flex-1 space-y-3">
              <div>
                <h2 className="font-bold text-gray-800 text-base">
                  {recording ? "מקליט פגישה..." : "הקלטת פגישה"}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {recording ? "לחץ עצור כשתסיים — AI יחלץ משימות" : "לחץ להתחיל. AI יתמלל ויחלץ משימות."}
                </p>
              </div>

              {recording && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-100 w-fit">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                  <span className="text-xs font-medium text-red-500 font-mono">00:02:34</span>
                </div>
              )}

              <div className="space-y-1">
                <div className="h-2 rounded-full overflow-hidden bg-white/60">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-400 to-pink-400"
                    style={{ width: "75%" }}
                  />
                </div>
                <p className="text-xs text-gray-400">218 / 290 דק׳ נותרו</p>
              </div>
            </div>
          </div>
        </PastelCard>

        {/* Meetings */}
        <PastelCard gradient="from-sky-50 to-blue-50" className="overflow-hidden">
          <div className="px-6 py-4 flex items-center justify-between border-b border-sky-100">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-sky-400" />
              <h2 className="font-bold text-gray-800">פגישות אחרונות</h2>
            </div>
            <span className="text-xs text-sky-400 bg-sky-100 px-2.5 py-0.5 rounded-full font-medium">
              {SESSIONS.length}
            </span>
          </div>
          <div className="divide-y divide-sky-50">
            {pagedSessions.map((s) => {
              const gradKey = s.project in projectColors ? s.project : "מוצר";
              return (
                <div key={s.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-white/50 transition-colors cursor-pointer group">
                  <div className={`w-9 h-9 rounded-2xl bg-gradient-to-br ${projectColors[gradKey]} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                    <span className="text-white font-bold text-xs">{s.title[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate group-hover:text-violet-600 transition-colors">
                      {s.title}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <FolderOpen className="w-3 h-3 text-gray-300" />
                      <span className="text-xs text-gray-400">{s.project} · {s.date}</span>
                    </div>
                  </div>
                  <div className={`px-2.5 py-1 rounded-full text-xs font-semibold
                    ${s.done === s.tasks
                      ? "bg-emerald-100 text-emerald-600"
                      : "bg-white text-gray-400 border border-gray-100"
                    }`}>
                    {s.done}/{s.tasks}
                  </div>
                </div>
              );
            })}
          </div>
          {SESSIONS.length > PER && (
            <div className="px-5 py-3 border-t border-sky-50 flex items-center justify-end gap-2">
              <span className="text-xs text-gray-400">{meetPage + 1} / {Math.ceil(SESSIONS.length / PER)}</span>
              <button onClick={() => setMeetPage((p) => Math.max(0, p - 1))} disabled={meetPage === 0}
                className="p-1.5 rounded-xl bg-white shadow-sm border border-sky-100 hover:border-sky-200 disabled:opacity-30 transition-all">
                <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
              </button>
              <button onClick={() => setMeetPage((p) => Math.min(Math.ceil(SESSIONS.length / PER) - 1, p + 1))}
                disabled={meetPage >= Math.ceil(SESSIONS.length / PER) - 1}
                className="p-1.5 rounded-xl bg-white shadow-sm border border-sky-100 hover:border-sky-200 disabled:opacity-30 transition-all">
                <ChevronLeft className="w-3.5 h-3.5 text-gray-500" />
              </button>
            </div>
          )}
        </PastelCard>

        {/* Tasks */}
        <PastelCard gradient="from-amber-50 to-orange-50" className="overflow-hidden">
          <div className="px-6 py-4 flex items-center justify-between border-b border-amber-100">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-amber-400" />
              <h2 className="font-bold text-gray-800">משימות</h2>
            </div>
            <div className="flex gap-1.5">
              {["זמן", "דחיפות", "סטטוס"].map((l) => (
                <button key={l}
                  className="px-2.5 py-1 rounded-full text-xs font-medium bg-white/80 text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors border border-amber-100">
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div className="divide-y divide-amber-50">
            {pagedTasks.map((t) => {
              const s = statusPill[t.status];
              const p = priorityPill[t.priority];
              return (
                <div key={t.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-white/50 transition-colors cursor-pointer group">
                  <div className={`w-8 h-8 rounded-2xl flex items-center justify-center flex-shrink-0
                    ${t.status === "done" ? "bg-emerald-100" : t.status === "in_progress" ? "bg-amber-100" : "bg-gray-100"}`}>
                    {t.status === "done"
                      ? <CheckCircle className="w-4 h-4 text-emerald-500" />
                      : t.status === "in_progress"
                        ? <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                        : <span className="w-2.5 h-2.5 rounded-full border-2 border-gray-300" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${t.status === "done" ? "line-through text-gray-300" : "text-gray-800"}`}>
                      {t.title}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <FolderOpen className="w-3 h-3 text-gray-300" />
                      <span className="text-xs text-gray-400">{t.project}</span>
                    </div>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>{s.label}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${p.bg} ${p.text}`}>{p.label}</span>
                </div>
              );
            })}
          </div>
          {TASKS.length > PER && (
            <div className="px-5 py-3 border-t border-amber-50 flex items-center justify-end gap-2">
              <span className="text-xs text-gray-400">{taskPage + 1} / {Math.ceil(TASKS.length / PER)}</span>
              <button onClick={() => setTaskPage((p) => Math.max(0, p - 1))} disabled={taskPage === 0}
                className="p-1.5 rounded-xl bg-white shadow-sm border border-amber-100 hover:border-amber-200 disabled:opacity-30 transition-all">
                <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
              </button>
              <button onClick={() => setTaskPage((p) => Math.min(Math.ceil(TASKS.length / PER) - 1, p + 1))}
                disabled={taskPage >= Math.ceil(TASKS.length / PER) - 1}
                className="p-1.5 rounded-xl bg-white shadow-sm border border-amber-100 hover:border-amber-200 disabled:opacity-30 transition-all">
                <ChevronLeft className="w-3.5 h-3.5 text-gray-500" />
              </button>
            </div>
          )}
        </PastelCard>
      </main>
    </div>
  );
}
