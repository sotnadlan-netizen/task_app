"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BarChart3, Clock, ListChecks, Mic, MicOff, ChevronLeft, ChevronRight,
  FolderOpen, Check, ArrowRight, CircleDashed, Loader2,
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

const priorityDot: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-orange-400",
  medium: "bg-blue-400",
  low: "bg-gray-300",
};
const priorityLabel: Record<string, string> = { low: "נמוכה", medium: "בינונית", high: "גבוהה", critical: "קריטית" };
const statusLabel: Record<string, string> = { todo: "לביצוע", in_progress: "בתהליך", done: "הושלם" };

export default function Design2() {
  const [recording, setRecording] = useState(false);
  const [taskPage, setTaskPage] = useState(0);
  const [meetPage, setMeetPage] = useState(0);
  const PER = 4;
  const pagedTasks = TASKS.slice(taskPage * PER, (taskPage + 1) * PER);
  const pagedSessions = SESSIONS.slice(meetPage * PER, (meetPage + 1) * PER);

  return (
    <div className="min-h-screen bg-white" dir="rtl">
      {/* Sidebar strip */}
      <div className="fixed right-0 top-0 h-full w-1 bg-indigo-600" />

      {/* Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="text-sm font-semibold tracking-widest text-gray-900 uppercase">TaskFlow</span>
          <nav className="hidden sm:flex gap-5 text-sm text-gray-400">
            {["דף הבית", "פגישות", "משימות", "אנליטיקס"].map((n) => (
              <span key={n} className={`cursor-pointer hover:text-gray-900 transition-colors ${n === "דף הבית" ? "text-gray-900 font-medium" : ""}`}>
                {n}
              </span>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/dashboard/member/design-preview" className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
            ← סגנונות
          </Link>
          <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-medium">
            ש
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-8 py-10 space-y-10">
        {/* Title */}
        <div className="border-b border-gray-100 pb-6">
          <p className="text-xs font-medium text-indigo-600 uppercase tracking-widest mb-1">Member Dashboard</p>
          <h1 className="text-3xl font-light text-gray-900 tracking-tight">דף הבית</h1>
        </div>

        {/* Stats — minimal horizontal */}
        <div className="grid grid-cols-3 gap-px bg-gray-100 rounded-xl overflow-hidden">
          {[
            { label: "פגישות", value: SESSIONS.length, icon: <BarChart3 className="w-4 h-4" /> },
            { label: "משימות", value: TASKS.length, icon: <ListChecks className="w-4 h-4" /> },
            { label: "נותר", value: "218 דק׳", icon: <Clock className="w-4 h-4" /> },
          ].map((s) => (
            <div key={s.label} className="bg-white px-6 py-5">
              <div className="flex items-center gap-1.5 text-gray-400 mb-2">
                {s.icon}
                <span className="text-xs">{s.label}</span>
              </div>
              <p className="text-2xl font-semibold text-gray-900 tabular-nums">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Recording — ultra minimal */}
        <div className="border border-gray-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">הקלטת פגישה</h2>
              <p className="text-xs text-gray-400 mt-0.5">AI יתמלל ויחלץ משימות אוטומטית</p>
            </div>
            <button
              onClick={() => setRecording((r) => !r)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                ${recording
                  ? "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                  : "bg-indigo-600 text-white hover:bg-indigo-700"
                }`}
            >
              {recording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              {recording ? "עצור" : "התחל הקלטה"}
            </button>
          </div>

          {recording && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-100">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs text-red-600 font-mono">00:02:34 — מקליט...</span>
              <div className="flex-1" />
              <span className="text-xs text-red-400">לחץ עצור בסיום הפגישה</span>
            </div>
          )}

          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-400">
              <span>קיבולת</span>
              <span className="font-medium text-gray-700">218 / 290 דק׳</span>
            </div>
            <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-600 rounded-full" style={{ width: "75%" }} />
            </div>
          </div>
        </div>

        {/* Meetings */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">פגישות אחרונות</h2>
            <button className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
              הכל <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="border border-gray-100 rounded-xl divide-y divide-gray-50 overflow-hidden">
            {pagedSessions.map((s) => (
              <div key={s.id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors cursor-pointer group">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                  <BarChart3 className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 font-medium truncate group-hover:text-indigo-700 transition-colors">
                    {s.title}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <FolderOpen className="w-3 h-3 text-gray-300" />
                    <span className="text-xs text-gray-400">{s.project}</span>
                    <span className="text-gray-200 text-xs">·</span>
                    <span className="text-xs text-gray-400">{s.date}</span>
                  </div>
                </div>
                <div className={`text-xs px-2.5 py-0.5 rounded-full ${
                  s.done === s.tasks
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-gray-50 text-gray-500"
                }`}>
                  {s.done}/{s.tasks}
                </div>
              </div>
            ))}
          </div>

          {SESSIONS.length > PER && (
            <div className="flex items-center justify-end gap-1">
              <button onClick={() => setMeetPage((p) => Math.max(0, p - 1))} disabled={meetPage === 0}
                className="p-1.5 rounded-lg border border-gray-100 hover:bg-gray-50 disabled:opacity-30 transition-colors text-gray-500">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs text-gray-400 px-1">{meetPage + 1} / {Math.ceil(SESSIONS.length / PER)}</span>
              <button onClick={() => setMeetPage((p) => Math.min(Math.ceil(SESSIONS.length / PER) - 1, p + 1))}
                disabled={meetPage >= Math.ceil(SESSIONS.length / PER) - 1}
                className="p-1.5 rounded-lg border border-gray-100 hover:bg-gray-50 disabled:opacity-30 transition-colors text-gray-500">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Tasks */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">משימות</h2>
            <button className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
              הכל <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-1">
            {pagedTasks.map((t) => (
              <div key={t.id} className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors group cursor-pointer">
                <div className="flex-shrink-0">
                  {t.status === "done"
                    ? <div className="w-4 h-4 rounded-full bg-indigo-600 flex items-center justify-center"><Check className="w-2.5 h-2.5 text-white" /></div>
                    : t.status === "in_progress"
                      ? <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                      : <CircleDashed className="w-4 h-4 text-gray-300" />
                  }
                </div>
                <p className={`flex-1 text-sm truncate ${t.status === "done" ? "line-through text-gray-300" : "text-gray-800"}`}>
                  {t.title}
                </p>
                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs text-gray-400">{t.project}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${priorityDot[t.priority]}`} />
                  <span className="text-xs text-gray-400">{priorityLabel[t.priority]}</span>
                </div>
              </div>
            ))}
          </div>

          {TASKS.length > PER && (
            <div className="flex items-center justify-end gap-1">
              <button onClick={() => setTaskPage((p) => Math.max(0, p - 1))} disabled={taskPage === 0}
                className="p-1.5 rounded-lg border border-gray-100 hover:bg-gray-50 disabled:opacity-30 transition-colors text-gray-500">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs text-gray-400 px-1">{taskPage + 1} / {Math.ceil(TASKS.length / PER)}</span>
              <button onClick={() => setTaskPage((p) => Math.min(Math.ceil(TASKS.length / PER) - 1, p + 1))}
                disabled={taskPage >= Math.ceil(TASKS.length / PER) - 1}
                className="p-1.5 rounded-lg border border-gray-100 hover:bg-gray-50 disabled:opacity-30 transition-colors text-gray-500">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
