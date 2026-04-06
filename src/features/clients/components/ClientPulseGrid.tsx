import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/core/utils/utils";
import { type Session } from "@/core/utils/storage";

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
  return <span className={`inline-block h-2 w-2 rounded-full shrink-0 ${colors[status]}`} aria-label={status} />;
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
  const { t } = useTranslation();
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
    { key: "all",    label: t("clients.all") },
    { key: "red",    label: t("clients.atRisk") },
    { key: "yellow", label: t("clients.neutral") },
    { key: "green",  label: t("clients.healthy") },
  ];

  return (
    <div className="mb-8">
      {/* Header + Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          {t("clients.clientPulse")}
          <span className="ms-2 text-xs font-normal text-slate-400">{t("clients.clientCount", { count: filtered.length })}</span>
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
            {t("clients.overdue")}
          </button>
        </div>
      </div>

      {/* Client Cards Grid — compact: more columns, less whitespace */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2.5">
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

  const { t } = useTranslation();
  const statusLabel = { green: t("clients.healthy"), yellow: t("clients.neutral"), red: t("clients.atRisk") }[client.status];

  return (
    <Card
      className={cn(
        "border transition-all",
        borderColor, bgColor,
        isAtRisk && "ring-2 ring-red-400/50",
        "shadow-sm"
      )}
    >
      <CardContent className="p-2.5 flex flex-col gap-2">
        {/* Header */}
        <div className="flex items-center gap-1.5">
          <TrafficDot status={client.status} />
          <span className="text-[11px] font-medium text-slate-700 dark:text-slate-200 truncate flex-1" title={client.clientEmail}>
            {client.clientEmail}
          </span>
          <Badge className={cn("text-[9px] px-1 py-0 rounded-full font-semibold shrink-0 border-0 leading-4", badgeClass)}>
            {statusLabel}
          </Badge>
        </div>

        {/* Pending count + completion % in one line */}
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
            {t("clients.pendingTasks", { count: pending })}
          </p>
          <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">{client.completionRate}%</span>
        </div>

        {/* Progress bar */}
        <div className="h-1 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              client.status === "green" ? "bg-emerald-500" : client.status === "yellow" ? "bg-amber-400" : "bg-red-500"
            )}
            style={{ width: `${client.completionRate}%` }}
          />
        </div>

        {/* Stats — 2-column micro grid */}
        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px]">
          <span className="text-slate-400 dark:text-slate-500">{t("dashboard.recentSessions")}</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200 text-end">{client.sessionCount}</span>

          <span className="text-slate-400 dark:text-slate-500">{t("board.tasks")}</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200 text-end" dir="ltr">
            {client.completedTasks}<span className="font-normal text-slate-400 dark:text-slate-500">/{client.totalTasks}</span>
          </span>

          <span className="text-slate-400 dark:text-slate-500">{t("clients.lastSessionLabel")}</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200 text-end">
            {new Date(client.lastSessionDate).toLocaleDateString(i18n.language === "he" ? "he-IL" : i18n.language === "ru" ? "ru-RU" : "en-US", { day: "2-digit", month: "short" })}
          </span>
        </div>

        {/* Expand / collapse sessions */}
        <button
          onClick={onToggle}
          className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors self-start no-min-height"
        >
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {expanded ? t("clients.hideSessions") : t("clients.showSessions", { count: sessions.length })}
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
                      {new Date(s.createdAt).toLocaleDateString(i18n.language === "he" ? "he-IL" : i18n.language === "ru" ? "ru-RU" : "en-US", { day: "2-digit", month: "short" })}
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
            className="h-6 px-2 text-[10px] text-red-600 hover:text-red-700 hover:bg-red-100 border border-red-200 self-start no-min-height"
            onClick={() => toast.success(t("clients.reminderSent", { email: client.clientEmail }))}
          >
            {t("clients.sendReminder")}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
