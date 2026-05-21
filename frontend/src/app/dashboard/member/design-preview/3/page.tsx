"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search, Bell, Settings, ChevronDown, ChevronLeft, ChevronRight, Star,
  Mic, MicOff, Plus, Download, RefreshCw, Filter, Columns3, MoreHorizontal,
  TrendingUp, TrendingDown, Users, Phone, ListChecks, BarChart3, FolderOpen,
  Home, Briefcase, ChevronsUpDown, CheckSquare, Square, Pencil, Trash2,
  ExternalLink, HelpCircle, Edit3,
} from "lucide-react";

// ── Mock data ─────────────────────────────────────────────────────────────────
const SESSIONS = [
  { id: "S-00471", title: "Sprint Planning Q2", project: "מוצר", date: "2026-05-04", tasks: 6, done: 4, owner: "שלו ק.", duration: "47 דק׳", sentiment: 0.84, stage: "פעיל" },
  { id: "S-00470", title: "סיכום לקוח — Acme", project: "מכירות", date: "2026-05-03", tasks: 3, done: 1, owner: "עומר ו.", duration: "32 דק׳", sentiment: 0.62, stage: "פעיל" },
  { id: "S-00469", title: "Design Review", project: "עיצוב", date: "2026-05-01", tasks: 5, done: 5, owner: "נועה ב.", duration: "58 דק׳", sentiment: 0.91, stage: "סגור" },
  { id: "S-00468", title: "Retrospective", project: "מוצר", date: "2026-04-28", tasks: 2, done: 0, owner: "שלו ק.", duration: "24 דק׳", sentiment: 0.41, stage: "פעיל" },
  { id: "S-00467", title: "Kick-off — Project Globex", project: "מכירות", date: "2026-04-25", tasks: 8, done: 3, owner: "עומר ו.", duration: "63 דק׳", sentiment: 0.78, stage: "פעיל" },
];

const TASKS = [
  { id: "T-1023", title: "עדכן את תיעוד ה-API", project: "מוצר", status: "in_progress", priority: "high", assignee: "שלו ק.", due: "2026-05-10" },
  { id: "T-1022", title: "שלח הצעת מחיר ל-Acme", project: "מכירות", status: "todo", priority: "critical", assignee: "עומר ו.", due: "2026-05-08" },
  { id: "T-1021", title: "בנה מסך אונבורדינג", project: "עיצוב", status: "done", priority: "medium", assignee: "נועה ב.", due: "2026-05-01" },
  { id: "T-1020", title: "תיקון באג בטעינת נתונים", project: "מוצר", status: "todo", priority: "high", assignee: "שלו ק.", due: "2026-05-12" },
];

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
const statusLabel: Record<string, string> = { todo: "Open", in_progress: "In Progress", done: "Closed" };
const priorityLabel: Record<string, string> = { low: "Low", medium: "Medium", high: "High", critical: "Critical" };

// ─────────────────────────────────────────────────────────────────────────────
export default function SalesforceLightningPreview() {
  const [recording, setRecording] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <div className="min-h-screen bg-[#f3f3f3] text-[#080707]" dir="rtl" style={{ fontFamily: "'Salesforce Sans', 'Segoe UI', system-ui, sans-serif" }}>
      {/* ── Global header (Salesforce blue) ───────────────────────────────── */}
      <header className="bg-[#16325c] text-white">
        <div className="h-12 px-4 flex items-center gap-3">
          {/* App launcher + logo */}
          <button className="grid grid-cols-3 gap-0.5 p-2 rounded hover:bg-white/10">
            {[...Array(9)].map((_, i) => <span key={i} className="w-1 h-1 rounded-full bg-white/80" />)}
          </button>
          <span className="text-white/40">|</span>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-gradient-to-br from-[#1ab9ff] to-[#0070d2] flex items-center justify-center text-white text-xs font-black">T</div>
            <span className="font-semibold text-[15px]">TaskFlow</span>
            <span className="text-white/60 text-[13px]">— Member Console</span>
          </div>

          {/* Object tabs */}
          <nav className="hidden md:flex items-center mr-6 h-12">
            {[
              { label: "Home", icon: Home, active: true },
              { label: "Sessions", icon: Phone, count: 47 },
              { label: "Tasks", icon: ListChecks, count: 124 },
              { label: "Reports", icon: BarChart3 },
              { label: "Projects", icon: FolderOpen, count: 4 },
              { label: "Team", icon: Users },
            ].map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.label}
                  className={`h-12 px-4 flex items-center gap-1.5 text-[13px] transition-colors ${
                    t.active ? "bg-white text-[#080707] font-semibold" : "text-white/90 hover:bg-white/10"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {t.label}
                  {t.count !== undefined && (
                    <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded ${t.active ? "bg-[#0070d2] text-white" : "bg-white/15 text-white"}`}>
                      {t.count}
                    </span>
                  )}
                  <ChevronDown className="w-3 h-3" />
                </button>
              );
            })}
            <button className="h-12 px-3 flex items-center text-white/80 hover:bg-white/10">
              <Plus className="w-4 h-4" />
            </button>
          </nav>

          <div className="flex-1" />

          {/* Right utility */}
          <div className="flex items-center gap-1">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-[#16325c]" />
              <input
                placeholder="Search Salesforce"
                dir="ltr"
                className="w-64 pr-7 pl-3 py-1.5 text-[13px] bg-white text-[#080707] rounded placeholder-[#706e6b] focus:outline-none focus:ring-2 focus:ring-[#1589ee]"
              />
            </div>
            <Link href="/dashboard/member/design-preview" className="text-xs text-white/70 hover:text-white px-2 transition-colors">
              ← Styles
            </Link>
            <HeaderButton><Settings className="w-4 h-4" /></HeaderButton>
            <HeaderButton><HelpCircle className="w-4 h-4" /></HeaderButton>
            <HeaderButton badge={3}><Bell className="w-4 h-4" /></HeaderButton>
            <button className="ml-1 w-8 h-8 rounded-full bg-gradient-to-br from-[#1ab9ff] to-[#0070d2] flex items-center justify-center text-white text-xs font-bold">
              שק
            </button>
          </div>
        </div>
      </header>

      {/* ── Page header ────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-[#dddbda] px-6 pt-3 pb-2">
        <div className="flex items-center gap-1.5 text-[11px] text-[#706e6b] mb-2">
          <Home className="w-3 h-3" />
          <ChevronLeft className="w-3 h-3" />
          <span>Member Console</span>
          <ChevronLeft className="w-3 h-3" />
          <span className="text-[#080707] font-semibold">Home</span>
        </div>
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#1ab9ff] to-[#0070d2] flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-[#706e6b] font-semibold">Member Workspace</p>
              <h1 className="text-[20px] font-bold text-[#080707] leading-tight flex items-center gap-2">
                Home
                <Star className="w-4 h-4 text-[#dddbda] hover:text-amber-400 cursor-pointer" />
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Btn icon={<Plus className="w-3.5 h-3.5" />}>New Session</Btn>
            <Btn variant="secondary" icon={<Download className="w-3.5 h-3.5" />}>Export</Btn>
            <Btn variant="secondary" icon={<RefreshCw className="w-3.5 h-3.5" />}>Refresh</Btn>
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
          <KpiTile label="Sessions This Month" value="47" trend="+12%" trendUp icon={<Phone className="w-5 h-5" />} />
          <KpiTile label="Open Tasks" value="124" trend="+8%" trendUp icon={<ListChecks className="w-5 h-5" />} />
          <KpiTile label="Capacity Remaining" value="218" suffix="min" trend="72%" icon={<BarChart3 className="w-5 h-5" />} />
          <KpiTile label="Avg Sentiment" value="+0.74" trend="positive" trendUp icon={<TrendingUp className="w-5 h-5" />} />
        </section>

        {/* Two-column body: recording + list */}
        <section className="grid grid-cols-12 gap-5">
          {/* Quick Action card */}
          <div className="col-span-12 lg:col-span-4 space-y-3">
            <Card>
              <CardHeader icon={<Mic className="w-4 h-4 text-white" />} iconBg="bg-[#0070d2]" title="Quick Action" sub="Capture a new Session" />
              <div className="p-4 space-y-3">
                <p className="text-[12px] text-[#3e3e3c] leading-relaxed">
                  לחיצה על &quot;Start Recording&quot; תפתח רשומת Session חדשה. ה-AI יחלץ Tasks אוטומטית בסיום.
                </p>
                <button
                  onClick={() => setRecording((r) => !r)}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded font-semibold text-[14px] transition-colors ${
                    recording
                      ? "bg-[#c23934] text-white hover:bg-[#a61a14]"
                      : "bg-[#0070d2] text-white hover:bg-[#005fb2]"
                  }`}
                >
                  {recording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  {recording ? "Stop Recording" : "Start Recording"}
                </button>

                <div className="rounded border border-[#dddbda] p-3 space-y-1.5 bg-[#fafaf9]">
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-[#706e6b]">Capacity</span>
                    <span className="font-mono font-semibold text-[#080707]">218 / 300 min</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#dddbda] overflow-hidden">
                    <div className="h-full w-[72%] rounded-full bg-[#0070d2]" />
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <CardHeader icon={<Edit3 className="w-4 h-4 text-white" />} iconBg="bg-[#04844b]" title="Recent Tasks" sub="4 of 124" />
              <ul className="divide-y divide-[#dddbda]">
                {TASKS.map((t) => (
                  <li key={t.id} className="px-3 py-2.5 flex items-center gap-2 hover:bg-[#f3f3f3] cursor-pointer">
                    <span className="text-[11px] font-mono text-[#0070d2] hover:underline w-14">{t.id}</span>
                    <p className={`flex-1 text-[13px] truncate ${t.status === "done" ? "line-through text-[#706e6b]" : "text-[#080707]"}`}>{t.title}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${priorityColor[t.priority]}`}>
                      {priorityLabel[t.priority]}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="px-3 py-2 border-t border-[#dddbda] text-center">
                <button className="text-[12px] text-[#0070d2] hover:underline font-semibold">View All</button>
              </div>
            </Card>
          </div>

          {/* Sessions List View */}
          <div className="col-span-12 lg:col-span-8">
            <Card>
              <div className="border-b border-[#dddbda] px-4 py-2.5 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 text-[14px] font-semibold text-[#080707]">
                    <Phone className="w-4 h-4 text-[#0070d2]" />
                    Sessions
                    <span className="text-[#706e6b] font-normal text-[12px]">· Recently Viewed ▾</span>
                  </div>
                  <span className="text-[11px] text-[#706e6b]">5 items · Updated 2 min ago</span>
                </div>
                <div className="flex items-center gap-1">
                  <Btn variant="secondary" small><Filter className="w-3 h-3 ml-1" />Filter</Btn>
                  <Btn variant="secondary" small><Columns3 className="w-3 h-3 ml-1" />Columns</Btn>
                  <Btn variant="secondary" small>List View Settings</Btn>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead className="bg-[#fafaf9] text-[#3e3e3c]">
                    <tr className="border-b border-[#dddbda]">
                      <Th width="w-10">
                        <button onClick={() => setSelected(selected.length === SESSIONS.length ? [] : SESSIONS.map(s => s.id))}>
                          {selected.length === SESSIONS.length ? (
                            <CheckSquare className="w-4 h-4 text-[#0070d2]" />
                          ) : (
                            <Square className="w-4 h-4 text-[#706e6b]" />
                          )}
                        </button>
                      </Th>
                      <Th sortable>Session ID</Th>
                      <Th sortable>Title</Th>
                      <Th sortable>Project</Th>
                      <Th sortable>Owner</Th>
                      <Th sortable>Date</Th>
                      <Th sortable className="text-center">Tasks</Th>
                      <Th sortable className="text-center">Sentiment</Th>
                      <Th sortable>Stage</Th>
                      <Th width="w-10"></Th>
                    </tr>
                  </thead>
                  <tbody>
                    {SESSIONS.map((s) => {
                      const isSelected = selected.includes(s.id);
                      return (
                        <tr
                          key={s.id}
                          className={`border-b border-[#dddbda] cursor-pointer transition-colors ${
                            isSelected ? "bg-[#ecf5fe]" : "hover:bg-[#fafaf9]"
                          }`}
                        >
                          <Td>
                            <button onClick={() => toggle(s.id)}>
                              {isSelected ? <CheckSquare className="w-4 h-4 text-[#0070d2]" /> : <Square className="w-4 h-4 text-[#706e6b]" />}
                            </button>
                          </Td>
                          <Td><a className="text-[#0070d2] hover:underline font-mono text-[12px]">{s.id}</a></Td>
                          <Td className="font-semibold text-[#080707]">{s.title}</Td>
                          <Td>
                            <span className="inline-flex items-center gap-1 text-[12px] text-[#0070d2]">
                              <FolderOpen className="w-3 h-3" />
                              {s.project}
                            </span>
                          </Td>
                          <Td>
                            <div className="flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-full bg-gradient-to-br from-[#1ab9ff] to-[#0070d2] flex items-center justify-center text-white text-[9px] font-bold">{s.owner[0]}</span>
                              <span className="text-[12px]">{s.owner}</span>
                            </div>
                          </Td>
                          <Td className="text-[12px] text-[#3e3e3c]">{s.date}</Td>
                          <Td className="text-center">
                            <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                              s.done === s.tasks ? "bg-[#cfeac4] text-[#04844b]" : "bg-[#dceffb] text-[#0070d2]"
                            }`}>
                              {s.done}/{s.tasks}
                            </span>
                          </Td>
                          <Td className="text-center">
                            <SentimentBar value={s.sentiment} />
                          </Td>
                          <Td>
                            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                              s.stage === "פעיל" ? "text-[#04844b]" : "text-[#706e6b]"
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${s.stage === "פעיל" ? "bg-[#04844b]" : "bg-[#706e6b]"}`} />
                              {s.stage}
                            </span>
                          </Td>
                          <Td>
                            <button className="p-1 rounded hover:bg-[#dddbda]">
                              <ChevronDown className="w-3.5 h-3.5 text-[#706e6b]" />
                            </button>
                          </Td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="px-4 py-2.5 border-t border-[#dddbda] flex items-center justify-between text-[12px] text-[#706e6b]">
                <span>1 - 5 of 47</span>
                <div className="flex items-center gap-2">
                  <button disabled className="p-1.5 rounded border border-[#dddbda] disabled:opacity-40">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-semibold text-[#080707]">Page 1 of 10</span>
                  <button className="p-1.5 rounded border border-[#dddbda] hover:bg-[#f3f3f3]">
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </Card>

            {/* Related list — Tasks */}
            <Card className="mt-4">
              <CardHeader icon={<ListChecks className="w-4 h-4 text-white" />} iconBg="bg-[#fe9339]" title="Open Tasks" sub={`${TASKS.filter(t => t.status !== "done").length} items`}>
                <button className="text-[11px] text-[#0070d2] hover:underline font-semibold">View All</button>
              </CardHeader>
              <table className="w-full text-[13px]">
                <thead className="bg-[#fafaf9] text-[#3e3e3c]">
                  <tr className="border-b border-[#dddbda]">
                    <Th sortable>Task ID</Th>
                    <Th sortable>Subject</Th>
                    <Th sortable>Status</Th>
                    <Th sortable>Priority</Th>
                    <Th sortable>Assignee</Th>
                    <Th sortable>Due Date</Th>
                    <Th></Th>
                  </tr>
                </thead>
                <tbody>
                  {TASKS.map((t) => (
                    <tr key={t.id} className="border-b border-[#dddbda] hover:bg-[#fafaf9]">
                      <Td><a className="text-[#0070d2] hover:underline font-mono text-[12px]">{t.id}</a></Td>
                      <Td className={`font-semibold ${t.status === "done" ? "line-through text-[#706e6b]" : "text-[#080707]"}`}>{t.title}</Td>
                      <Td><span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${statusColor[t.status]}`}>{statusLabel[t.status]}</span></Td>
                      <Td><span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${priorityColor[t.priority]}`}>{priorityLabel[t.priority]}</span></Td>
                      <Td className="text-[12px]">{t.assignee}</Td>
                      <Td className="text-[12px] text-[#3e3e3c]">{t.due}</Td>
                      <Td>
                        <div className="flex gap-0.5">
                          <button className="p-1 rounded hover:bg-[#dddbda]"><Pencil className="w-3.5 h-3.5 text-[#706e6b]" /></button>
                          <button className="p-1 rounded hover:bg-[#dddbda]"><ExternalLink className="w-3.5 h-3.5 text-[#706e6b]" /></button>
                          <button className="p-1 rounded hover:bg-[#dddbda]"><Trash2 className="w-3.5 h-3.5 text-[#706e6b]" /></button>
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}

// ── Subcomponents ─────────────────────────────────────────────────────────────
function HeaderButton({ children, badge }: { children: React.ReactNode; badge?: number }) {
  return (
    <button className="relative w-8 h-8 rounded hover:bg-white/10 flex items-center justify-center text-white">
      {children}
      {badge && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#c23934] text-white text-[10px] font-bold flex items-center justify-center border border-[#16325c]">
          {badge}
        </span>
      )}
    </button>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded border border-[#dddbda] shadow-[0_2px_2px_rgba(0,0,0,0.05)] ${className}`}>
      {children}
    </div>
  );
}

function CardHeader({
  icon, iconBg, title, sub, children,
}: { icon: React.ReactNode; iconBg: string; title: string; sub?: string; children?: React.ReactNode }) {
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

function Btn({
  children, variant = "primary", icon, small,
}: { children: React.ReactNode; variant?: "primary" | "secondary"; icon?: React.ReactNode; small?: boolean }) {
  const base = "rounded font-semibold transition-colors inline-flex items-center";
  const size = small ? "px-2 py-1 text-[11px]" : "px-3 py-1.5 text-[13px]";
  const styles =
    variant === "primary"
      ? "bg-white text-[#0070d2] border border-[#dddbda] hover:bg-[#f4f6f9]"
      : "bg-white text-[#0070d2] border border-[#dddbda] hover:bg-[#f4f6f9]";
  return (
    <button className={`${base} ${size} ${styles}`}>
      {icon}
      {children}
    </button>
  );
}

function KpiTile({
  label, value, suffix, trend, trendUp, icon,
}: { label: string; value: string; suffix?: string; trend?: string; trendUp?: boolean; icon: React.ReactNode }) {
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
        <div className={`flex items-center gap-1 mt-2 text-[11px] font-semibold ${
          trendUp ? "text-[#04844b]" : "text-[#706e6b]"
        }`}>
          {trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          <span>{trend}</span>
          <span className="text-[#706e6b] font-normal">vs last week</span>
        </div>
      )}
    </Card>
  );
}

function SentimentBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = value >= 0.7 ? "bg-[#04844b]" : value >= 0.5 ? "bg-[#fe9339]" : "bg-[#c23934]";
  return (
    <div className="inline-flex items-center gap-1.5">
      <div className="w-16 h-1.5 rounded-full bg-[#dddbda] overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-mono text-[#3e3e3c]">{value.toFixed(2)}</span>
    </div>
  );
}
