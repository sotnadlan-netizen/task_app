"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BarChart3, Clock, ListChecks, Mic, MicOff, ChevronLeft, ChevronRight,
  Sparkles, TrendingUp, CheckCheck, FolderOpen,
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

const statusBadge: Record<string, { bg: string; text: string; label: string }> = {
  todo: { bg: "bg-slate-100", text: "text-slate-600", label: "לביצוע" },
  in_progress: { bg: "bg-amber-100", text: "text-amber-700", label: "בתהליך" },
  done: { bg: "bg-emerald-100", text: "text-emerald-700", label: "הושלם" },
};
const priorityBadge: Record<string, { bg: string; text: string; label: string }> = {
  critical: { bg: "bg-red-500", text: "text-white", label: "קריטית" },
  high: { bg: "bg-orange-400", text: "text-white", label: "גבוהה" },
  medium: { bg: "bg-blue-400", text: "text-white", label: "בינונית" },
  low: { bg: "bg-slate-200", text: "text-slate-600", label: "נמוכה" },
};

function GradientBadge({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${className}`}>
      {children}
    </span>
  );
}

export default function Design3() {
  const [recording, setRecording] = useState(false);
  const [taskPage, setTaskPage] = useState(0);
  const [meetPage, setMeetPage] = useState(0);
  const PER = 3;
  const pagedTasks = TASKS.slice(taskPage * PER, (taskPage + 1) * PER);
  const pagedSessions = SESSIONS.slice(meetPage * PER, (meetPage + 1) * PER);

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Hero gradient header */}
      <div
        className="relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #f43f5e 0%, #f97316 50%, #eab308 100%)" }}
      >
        {/* Decorative circles */}
        <div className="absolute top-0 left-0 w-64 h-64 rounded-full bg-white/10 -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-48 h-48 rounded-full bg-white/10 translate-x-1/4 translate-y-1/4" />

        <div className="relative max-w-5xl mx-auto px-6 py-8">
          {/* Nav */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-white" />
              <span className="font-black text-white text-lg tracking-tight">TaskFlow</span>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/dashboard/member/design-preview" className="text-xs text-white/70 hover:text-white transition-colors border border-white/30 px-3 py-1.5 rounded-full">
                ← סגנונות
              </Link>
              <div className="w-8 h-8 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center text-white font-bold text-sm">
                ש
              </div>
            </div>
          </div>

          {/* Title area */}
          <div className="mb-8">
            <h1 className="text-4xl font-black text-white leading-tight">
              שלום, שלו! 👋
            </h1>
            <p className="text-white/70 mt-1 text-sm">5 פגישות, 5 משימות פתוחות</p>
          </div>

          {/* Stats in the hero */}
          <div className="grid grid-cols-3 gap-4 pb-8">
            {[
              { icon: <BarChart3 className="w-5 h-5 text-rose-500" />, label: "פגישות", value: SESSIONS.length, bg: "bg-white" },
              { icon: <ListChecks className="w-5 h-5 text-orange-400" />, label: "משימות", value: TASKS.length, bg: "bg-white" },
              { icon: <Clock className="w-5 h-5 text-yellow-500" />, label: "נותר", value: "218 דק׳", bg: "bg-white" },
            ].map((s) => (
              <div key={s.label} className={`${s.bg} rounded-2xl p-4 shadow-lg`}>
                <div className="flex items-center gap-2 mb-1">
                  {s.icon}
                  <span className="text-xs text-gray-500 font-medium">{s.label}</span>
                </div>
                <p className="text-2xl font-black text-gray-900 tabular-nums">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 -mt-2 py-6 space-y-6">
        {/* Recording card */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 flex items-center gap-6">
            <button
              onClick={() => setRecording((r) => !r)}
              className={`relative flex-shrink-0 w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300
                ${recording
                  ? "bg-red-500 shadow-red-200 scale-95"
                  : "shadow-rose-200 hover:scale-105"
                }`}
              style={!recording ? { background: "linear-gradient(135deg, #f43f5e, #f97316)" } : {}}
            >
              {recording ? <MicOff className="w-9 h-9 text-white" /> : <Mic className="w-9 h-9 text-white" />}
              {recording && (
                <span className="absolute top-1 right-1 w-3 h-3 rounded-full bg-white border border-red-300 animate-ping" />
              )}
            </button>
            <div className="flex-1 space-y-2">
              <div>
                <h2 className="font-black text-gray-900 text-lg">
                  {recording ? "מקליט..." : "הקלטת פגישה"}
                </h2>
                <p className="text-sm text-gray-400">
                  {recording ? "לחץ עצור בסיום — AI יחלץ משימות אוטומטית" : "לחץ להתחיל. AI יתמלל ויחלץ משימות."}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: "75%",
                      background: "linear-gradient(90deg, #f43f5e, #f97316)",
                    }}
                  />
                </div>
                <span className="text-xs font-bold text-gray-500">218 / 290 דק׳</span>
              </div>
            </div>
          </div>
        </div>

        {/* Meetings */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100">
          <div className="px-6 py-5 flex items-center justify-between border-b border-gray-50">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-rose-500" />
              <h2 className="font-black text-gray-900">פגישות אחרונות</h2>
            </div>
            <GradientBadge className="bg-rose-100 text-rose-600">{SESSIONS.length}</GradientBadge>
          </div>
          <div className="divide-y divide-gray-50">
            {pagedSessions.map((s, idx) => (
              <div key={s.id} className="px-6 py-4 flex items-center gap-4 hover:bg-orange-50/40 cursor-pointer transition-colors group">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black text-sm flex-shrink-0"
                  style={{ background: `linear-gradient(135deg, ${["#f43f5e","#f97316","#eab308","#22c55e","#3b82f6"][idx % 5]}, ${["#f97316","#eab308","#22c55e","#3b82f6","#8b5cf6"][idx % 5]})` }}
                >
                  {s.title[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 truncate group-hover:text-rose-600 transition-colors">{s.title}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <FolderOpen className="w-3 h-3 text-gray-300" />
                    <span className="text-xs text-gray-400">{s.project} · {s.date}</span>
                  </div>
                </div>
                <GradientBadge
                  className={s.done === s.tasks ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-gray-500"}
                >
                  {s.done}/{s.tasks} ✓
                </GradientBadge>
              </div>
            ))}
          </div>
          {SESSIONS.length > PER && (
            <div className="px-6 py-3 border-t border-gray-50 flex items-center justify-between">
              <span className="text-xs text-gray-400">{meetPage + 1} / {Math.ceil(SESSIONS.length / PER)}</span>
              <div className="flex gap-1">
                <button onClick={() => setMeetPage((p) => Math.max(0, p - 1))} disabled={meetPage === 0}
                  className="p-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 disabled:opacity-30 transition-colors">
                  <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
                </button>
                <button onClick={() => setMeetPage((p) => Math.min(Math.ceil(SESSIONS.length / PER) - 1, p + 1))}
                  disabled={meetPage >= Math.ceil(SESSIONS.length / PER) - 1}
                  className="p-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 disabled:opacity-30 transition-colors">
                  <ChevronLeft className="w-3.5 h-3.5 text-gray-600" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Tasks */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100">
          <div className="px-6 py-5 flex items-center justify-between border-b border-gray-50">
            <div className="flex items-center gap-2">
              <CheckCheck className="w-5 h-5 text-orange-500" />
              <h2 className="font-black text-gray-900">משימות</h2>
            </div>
            <div className="flex gap-2">
              {["זמן", "דחיפות", "סטטוס"].map((l) => (
                <button key={l}
                  className="px-3 py-1 rounded-full text-xs font-bold border border-gray-100 text-gray-400 hover:text-gray-700 hover:border-gray-300 transition-colors">
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div className="divide-y divide-gray-50">
            {pagedTasks.map((t) => {
              const s = statusBadge[t.status];
              const p = priorityBadge[t.priority];
              return (
                <div key={t.id} className="px-6 py-4 flex items-center gap-3 hover:bg-orange-50/30 transition-colors cursor-pointer">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${p.bg}`}>
                    <span className={`text-xs font-black ${p.text}`}>{p.label[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold truncate ${t.status === "done" ? "line-through text-gray-300" : "text-gray-900"}`}>
                      {t.title}
                    </p>
                    <span className="text-xs text-gray-400">{t.project}</span>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${s.bg} ${s.text}`}>{s.label}</span>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${p.bg} ${p.text}`}>{p.label}</span>
                </div>
              );
            })}
          </div>
          {TASKS.length > PER && (
            <div className="px-6 py-3 border-t border-gray-50 flex items-center justify-between">
              <span className="text-xs text-gray-400">{taskPage + 1} / {Math.ceil(TASKS.length / PER)}</span>
              <div className="flex gap-1">
                <button onClick={() => setTaskPage((p) => Math.max(0, p - 1))} disabled={taskPage === 0}
                  className="p-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 disabled:opacity-30 transition-colors">
                  <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
                </button>
                <button onClick={() => setTaskPage((p) => Math.min(Math.ceil(TASKS.length / PER) - 1, p + 1))}
                  disabled={taskPage >= Math.ceil(TASKS.length / PER) - 1}
                  className="p-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 disabled:opacity-30 transition-colors">
                  <ChevronLeft className="w-3.5 h-3.5 text-gray-600" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
