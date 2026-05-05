"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BarChart3, Clock, ListChecks, Mic, MicOff, ChevronLeft, ChevronRight,
  FolderOpen, Square, CheckSquare,
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

const ACCENT = "#FAFF00"; // neon yellow

const statusStyle: Record<string, { bg: string; border: string; text: string; label: string }> = {
  todo: { bg: "bg-white", border: "border-black", text: "text-black", label: "לביצוע" },
  in_progress: { bg: "bg-[#FAFF00]", border: "border-black", text: "text-black", label: "בתהליך" },
  done: { bg: "bg-black", border: "border-black", text: "text-white", label: "הושלם" },
};
const priorityStyle: Record<string, { bg: string; text: string; label: string }> = {
  critical: { bg: "bg-red-500", text: "text-white", label: "קריטית" },
  high: { bg: "bg-orange-400", text: "text-black", label: "גבוהה" },
  medium: { bg: "bg-[#FAFF00]", text: "text-black", label: "בינונית" },
  low: { bg: "bg-white", text: "text-black", label: "נמוכה" },
};

function BrutoCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`border-4 border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] ${className}`}>
      {children}
    </div>
  );
}

function BrutoBtn({ children, onClick, active = false, className = "" }: {
  children: React.ReactNode; onClick?: () => void; active?: boolean; className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`border-3 border-black px-4 py-2 font-black text-sm uppercase tracking-wider
        transition-all duration-100 active:translate-x-1 active:translate-y-1
        ${active
          ? "bg-[#FAFF00] text-black shadow-[3px_3px_0px_0px_black]"
          : "bg-white text-black shadow-[3px_3px_0px_0px_black] hover:shadow-[2px_2px_0px_0px_black] hover:translate-x-0.5 hover:translate-y-0.5"
        } ${className}`}
      style={{ borderWidth: 3 }}
    >
      {children}
    </button>
  );
}

export default function Design4() {
  const [recording, setRecording] = useState(false);
  const [taskPage, setTaskPage] = useState(0);
  const [meetPage, setMeetPage] = useState(0);
  const PER = 3;
  const pagedTasks = TASKS.slice(taskPage * PER, (taskPage + 1) * PER);
  const pagedSessions = SESSIONS.slice(meetPage * PER, (meetPage + 1) * PER);

  return (
    <div className="min-h-screen bg-[#F5F5F0]" dir="rtl">
      {/* Top bar */}
      <header className="bg-black text-white px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <span className="font-black text-xl tracking-tighter uppercase text-[#FAFF00]">
            TASK<span className="text-white">FLOW</span>
          </span>
          <span className="text-xs text-gray-400 font-mono hidden sm:block">v2.0</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/member/design-preview"
            className="text-xs text-gray-400 hover:text-white transition-colors border border-gray-600 px-3 py-1.5 font-mono uppercase tracking-wider">
            ← styles
          </Link>
          <div className="w-8 h-8 bg-[#FAFF00] flex items-center justify-center text-black font-black text-sm">
            ש
          </div>
        </div>
      </header>

      {/* Yellow accent stripe */}
      <div className="h-2 bg-[#FAFF00]" />

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Page title */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-mono text-gray-500 uppercase tracking-widest">MEMBER / HOME</p>
            <h1 className="text-5xl font-black text-black uppercase tracking-tighter leading-none mt-1">
              דף הבית
            </h1>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-xs font-mono text-gray-400">2026-05-05</p>
            <p className="text-xs font-mono text-gray-400">שלו פנקר</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: <BarChart3 className="w-6 h-6" />, label: "MEETINGS", value: SESSIONS.length, color: "bg-[#FAFF00]" },
            { icon: <ListChecks className="w-6 h-6" />, label: "TASKS", value: TASKS.length, color: "bg-black text-white" },
            { icon: <Clock className="w-6 h-6" />, label: "REMAINING", value: "218m", color: "bg-white" },
          ].map((s) => (
            <BrutoCard key={s.label} className={`p-5 ${s.color}`}>
              <div className="flex items-start justify-between">
                {s.icon}
                <span className="text-xs font-mono font-bold uppercase tracking-widest opacity-60">{s.label}</span>
              </div>
              <p className="text-4xl font-black mt-3 tabular-nums">{s.value}</p>
            </BrutoCard>
          ))}
        </div>

        {/* Recording */}
        <BrutoCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black uppercase tracking-tight">הקלטת פגישה</h2>
            {recording && (
              <div className="flex items-center gap-2 bg-red-500 px-3 py-1 border-2 border-black">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span className="text-xs font-black text-white font-mono">REC 02:34</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setRecording((r) => !r)}
              className={`w-20 h-20 border-4 border-black flex items-center justify-center transition-all duration-100
                shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
                hover:translate-x-0.5 hover:translate-y-0.5 active:shadow-none active:translate-x-1.5 active:translate-y-1.5
                ${recording ? "bg-red-500" : "bg-[#FAFF00]"}`}
            >
              {recording
                ? <MicOff className="w-9 h-9 text-white" />
                : <Mic className="w-9 h-9 text-black" />
              }
            </button>
            <div className="flex-1 space-y-2">
              <p className="text-sm font-bold text-gray-600">
                {recording ? "לחץ עצור בסיום — AI יחלץ משימות" : "לחץ להתחיל הקלטה"}
              </p>
              <div className="space-y-1">
                <div className="h-4 bg-white border-2 border-black overflow-hidden">
                  <div className="h-full bg-black" style={{ width: "75%" }} />
                </div>
                <div className="flex justify-between text-xs font-mono font-bold">
                  <span>218 MIN</span>
                  <span>290 MAX</span>
                </div>
              </div>
            </div>
          </div>
        </BrutoCard>

        {/* Meetings */}
        <BrutoCard>
          <div className="border-b-4 border-black px-6 py-4 flex items-center justify-between bg-black text-white">
            <h2 className="font-black uppercase tracking-tight text-lg">MEETINGS</h2>
            <span className="font-mono font-bold text-[#FAFF00]">{SESSIONS.length} TOTAL</span>
          </div>
          <div className="divide-y-4 divide-black">
            {pagedSessions.map((s) => (
              <div key={s.id} className="px-6 py-4 flex items-center gap-4 hover:bg-[#FAFF00]/20 transition-colors cursor-pointer group">
                <div className="flex-1 min-w-0">
                  <p className="font-black text-black truncate uppercase">{s.title}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <FolderOpen className="w-3 h-3" />
                    <span className="text-xs font-mono text-gray-600">{s.project} / {s.date}</span>
                  </div>
                </div>
                <div className={`border-3 border-black px-3 py-1 font-black text-xs
                  ${s.done === s.tasks ? "bg-[#FAFF00]" : "bg-white"}`}
                  style={{ borderWidth: 3 }}>
                  {s.done}/{s.tasks} ✓
                </div>
              </div>
            ))}
          </div>
          {SESSIONS.length > PER && (
            <div className="border-t-4 border-black px-6 py-3 flex items-center justify-between bg-gray-50">
              <span className="text-xs font-mono font-bold">{meetPage + 1}/{Math.ceil(SESSIONS.length / PER)}</span>
              <div className="flex gap-2">
                <BrutoBtn onClick={() => setMeetPage((p) => Math.max(0, p - 1))}>←</BrutoBtn>
                <BrutoBtn onClick={() => setMeetPage((p) => Math.min(Math.ceil(SESSIONS.length / PER) - 1, p + 1))}>→</BrutoBtn>
              </div>
            </div>
          )}
        </BrutoCard>

        {/* Tasks */}
        <BrutoCard>
          <div className="border-b-4 border-black px-6 py-4 flex items-center justify-between bg-[#FAFF00]">
            <h2 className="font-black uppercase tracking-tight text-lg text-black">TASKS</h2>
            <div className="flex gap-2">
              {["TIME", "PRIORITY", "STATUS"].map((l) => (
                <BrutoBtn key={l} className="py-1 px-2 text-xs">{l}</BrutoBtn>
              ))}
            </div>
          </div>
          <div className="divide-y-4 divide-black">
            {pagedTasks.map((t) => {
              const s = statusStyle[t.status];
              const p = priorityStyle[t.priority];
              return (
                <div key={t.id} className="px-6 py-4 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                  <div className="flex-shrink-0">
                    {t.status === "done"
                      ? <CheckSquare className="w-5 h-5 text-black" />
                      : <Square className="w-5 h-5 text-black" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-black text-sm truncate uppercase ${t.status === "done" ? "line-through text-gray-400" : "text-black"}`}>
                      {t.title}
                    </p>
                    <span className="text-xs font-mono text-gray-500">{t.project}</span>
                  </div>
                  <span className={`px-2.5 py-1 border-2 border-black text-xs font-black ${s.bg} ${s.text}`}>
                    {s.label}
                  </span>
                  <span className={`px-2.5 py-1 border-2 border-black text-xs font-black ${p.bg} ${p.text}`}>
                    {p.label}
                  </span>
                </div>
              );
            })}
          </div>
          {TASKS.length > PER && (
            <div className="border-t-4 border-black px-6 py-3 flex items-center justify-between bg-gray-50">
              <span className="text-xs font-mono font-bold">{taskPage + 1}/{Math.ceil(TASKS.length / PER)}</span>
              <div className="flex gap-2">
                <BrutoBtn onClick={() => setTaskPage((p) => Math.max(0, p - 1))}>←</BrutoBtn>
                <BrutoBtn onClick={() => setTaskPage((p) => Math.min(Math.ceil(TASKS.length / PER) - 1, p + 1))}>→</BrutoBtn>
              </div>
            </div>
          )}
        </BrutoCard>
      </main>
    </div>
  );
}
