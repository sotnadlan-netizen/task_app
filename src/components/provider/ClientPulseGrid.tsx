import { useMemo, useState } from "react";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { type Session } from "@/lib/storage";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClientPulse {
  clientEmail: string;
  sessionCount: number;
  totalTasks: number;
  completedTasks: number;
  lastSessionDate: string;
  completionRate: number;
  status: "green" | "yellow" | "red";
}

type SentimentFilter = "all" | "green" | "yellow" | "red";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function deriveStatus(rate: number, totalTasks: number): ClientPulse["status"] {
  if (totalTasks === 0) return "red";
  if (rate >= 80) return "green";
  if (rate >= 30) return "yellow";
  return "red";
}

function isOverdue(p: ClientPulse): boolean {
  const daysSince = (Date.now() - new Date(p.lastSessionDate).getTime()) / 86_400_000;
  return daysSince >= 7 && p.completionRate < 100;
}

function TrafficDot({ status }: { status: ClientPulse["status"] }) {
  const colors = { green: "bg-emerald-500", yellow: "bg-amber-400", red: "bg-red-500" };
  return <span className={`inline-block h-3 w-3 rounded-full shrink-0 ${colors[status]}`} aria-label={status} />;
}

function SentimentIcon({ completionRate }: { completionRate: number }) {
  if (completionRate >= 80) return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
  if (completionRate >= 30) return <Clock className="h-3.5 w-3.5 text-amber-400" />;
  return <AlertCircle className="h-3.5 w-3.5 text-red-500" />;
}

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  sessions: Session[];
}

export function ClientPulseGrid({ sessions }: Props) {
  const [sentimentFilter, setSentimentFilter] = useState<SentimentFilter>("all");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [expandedClient, setExpandedClient] = useState<string | null>(null);

  const pulseData = useMemo<ClientPulse[]>(() => {
    const map = new Map<string, ClientPulse>();

    for (const session of sessions) {
      const email = session.clientEmail ?? "(no email)";
      const existing = map.get(email);
      const tasks = session.taskCount ?? 0;
      const completed = session.completedCount ?? 0;
      const date = session.createdAt;

      if (!existing) {
        map.set(email, {
          clientEmail: email,
          sessionCount: 1,
          totalTasks: tasks,
          completedTasks: completed,
          lastSessionDate: date,
          completionRate: 0,
          status: "red",
        });
      } else {
        existing.sessionCount += 1;
        existing.totalTasks += tasks;
        existing.completedTasks += completed;
        if (new Date(date) > new Date(existing.lastSessionDate)) {
          existing.lastSessionDate = date;
        }
      }
    }

    return Array.from(map.values()).map((p) => {
      const rate = p.totalTasks > 0 ? Math.round((p.completedTasks / p.totalTasks) * 100) : 0;
      return { ...p, completionRate: rate, status: deriveStatus(rate, p.totalTasks) };
    });
  }, [sessions]);

  const filtered = pulseData.filter((p) => {
    if (sentimentFilter !== "all" && p.status !== sentimentFilter) return false;
    if (overdueOnly && !isOverdue(p)) return false;
    return true;
  });

  if (pulseData.length === 0) return null;

  const FILTER_PILLS: { key: SentimentFilter; label: string }[] = [
    { key: "all",    label: "הכל" },
    { key: "red",    label: "בסיכון" },
    { key: "yellow", label: "ניטרלי" },
    { key: "green",  label: "חיובי" },
  ];

  return (
    <div className="mb-8">
      {/* Header + Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          Client Pulse
          <span className="ms-2 text-xs font-normal text-slate-400">{filtered.length} לקוחות</span>
        </p>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Sentiment pills */}
          {FILTER_PILLS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSentimentFilter(key)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                sentimentFilter === key
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300"
              )}
            >
              {label}
            </button>
          ))}

          {/* Overdue toggle */}
          <button
            onClick={() => setOverdueOnly((v) => !v)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
              overdueOnly
                ? "bg-amber-500 text-white border-amber-500"
                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-300"
            )}
          >
            עם פיגורים
          </button>
        </div>
      </div>

      {/* Client Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((client) => (
          <ClientPulseCard
            key={client.clientEmail}
            client={client}
            sessions={sessions.filter((s) => (s.clientEmail ?? "(no email)") === client.clientEmail)}
            expanded={expandedClient === client.clientEmail}
            onToggle={() =>
              setExpandedClient((prev) =>
                prev === client.clientEmail ? null : client.clientEmail
              )
            }
          />
        ))}
      </div>
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

interface CardProps {
  client: ClientPulse;
  sessions: Session[];
  expanded: boolean;
  onToggle: () => void;
}

function ClientPulseCard({ client, sessions, expanded, onToggle }: CardProps) {
  const isAtRisk = client.status === "red";
  const pending = client.totalTasks - client.completedTasks;

  const borderColor = { green: "border-emerald-200", yellow: "border-amber-200", red: "border-red-300" }[client.status];
  const bgColor    = { green: "bg-emerald-50/40",    yellow: "bg-amber-50/40",   red: "bg-red-50/40"   }[client.status];

  const badgeClass = {
    green:  "bg-emerald-100 text-emerald-700",
    yellow: "bg-amber-100 text-amber-700",
    red:    "bg-red-100 text-red-700",
  }[client.status];

  const statusLabel = { green: "חיובי", yellow: "ניטרלי", red: "בסיכון" }[client.status];

  const sparkData = useMemo(() => {
    const last5 = [...sessions]
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .slice(-5);
    return last5.map((s) => {
      const total = s.taskCount ?? 0;
      const done  = s.completedCount ?? 0;
      return { v: total > 0 ? done / total : 0 };
    });
  }, [sessions]);

  return (
    <Card
      className={cn(
        "border transition-all",
        borderColor, bgColor,
        isAtRisk && "ring-2 ring-red-400/60 animate-pulse shadow-red-100",
        "shadow-sm"
      )}
    >
      <CardContent className="p-4 flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-center gap-2">
          <TrafficDot status={client.status} />
          <span className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate flex-1" title={client.clientEmail}>
            {client.clientEmail}
          </span>
          <Badge className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-semibold shrink-0 border-0", badgeClass)}>
            {statusLabel}
          </Badge>
        </div>

        {/* Pending tasks — Hebrew label */}
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
          <span dir="ltr" className="inline-block text-indigo-600 font-bold">{pending}</span>
          {" "}משימות פתוחות
        </p>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-y-1.5 text-xs text-slate-600 dark:text-slate-400">
          <span className="text-slate-400">פגישות</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200 text-end">{client.sessionCount}</span>

          <span className="text-slate-400">משימות</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200 text-end" dir="ltr">
            {client.completedTasks}<span className="font-normal text-slate-400">/{client.totalTasks}</span>
          </span>

          <span className="text-slate-400">השלמה</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200 text-end">{client.completionRate}%</span>

          <span className="text-slate-400">פגישה אחרונה</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200 text-end">
            {new Date(client.lastSessionDate).toLocaleDateString("he-IL", { day: "2-digit", month: "short" })}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              client.status === "green" ? "bg-emerald-500" : client.status === "yellow" ? "bg-amber-400" : "bg-red-500"
            )}
            style={{ width: `${client.completionRate}%` }}
          />
        </div>

        {/* Sentiment sparkline */}
        <div className="pt-2 border-t border-border/40">
          <p className="text-[11px] text-muted-foreground mb-1">מגמת סנטימנט</p>
          <ResponsiveContainer width="100%" height={36}>
            <LineChart data={sparkData.length >= 2 ? sparkData : [{ v: 0.5 }, { v: 0.5 }, { v: 0.5 }, { v: 0.5 }, { v: 0.5 }]}>
              <Line type="monotone" dataKey="v" stroke="oklch(0.65 0.10 145)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Expand / collapse sessions */}
        <button
          onClick={onToggle}
          className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-700 transition-colors self-start"
        >
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {expanded ? "הסתר פגישות" : `הצג ${sessions.length} פגישות`}
        </button>

        {/* Expandable session list */}
        {expanded && sessions.length > 0 && (
          <ul className="flex flex-col gap-1.5 pt-1 border-t border-border/40">
            {[...sessions]
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map((s) => {
                const rate = (s.taskCount ?? 0) > 0
                  ? Math.round(((s.completedCount ?? 0) / (s.taskCount ?? 1)) * 100)
                  : 0;
                return (
                  <li key={s.id} className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                    <SentimentIcon completionRate={rate} />
                    <span className="flex-1 truncate" title={s.title ?? s.filename}>
                      {new Date(s.createdAt).toLocaleDateString("he-IL", { day: "2-digit", month: "short" })}
                      {" — "}
                      <span className="text-slate-700 dark:text-slate-300">{s.title ?? s.filename}</span>
                    </span>
                    <span dir="ltr" className="shrink-0 font-semibold text-slate-700 dark:text-slate-300">
                      {s.completedCount ?? 0}<span className="font-normal text-slate-400">/{s.taskCount ?? 0}</span>
                    </span>
                  </li>
                );
              })}
          </ul>
        )}

        {/* Reminder button — only on at-risk cards */}
        {isAtRisk && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-100 border border-red-200 self-start"
            onClick={() => toast.success(`תזכורת נשלחה ל-${client.clientEmail}`)}
          >
            שלח תזכורת
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
