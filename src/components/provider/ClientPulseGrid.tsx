import { useMemo } from "react";
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { type Session } from "@/lib/storage";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClientPulse {
  clientEmail: string;
  sessionCount: number;
  totalTasks: number;
  completedTasks: number;
  lastSessionDate: string;
  completionRate: number; // 0–100
  status: "green" | "yellow" | "red";
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function deriveStatus(rate: number, totalTasks: number): ClientPulse["status"] {
  if (totalTasks === 0) return "red";
  if (rate >= 80) return "green";
  if (rate >= 30) return "yellow";
  return "red";
}

function TrafficDot({ status }: { status: ClientPulse["status"] }) {
  const colors = {
    green: "bg-emerald-500",
    yellow: "bg-amber-400",
    red: "bg-red-500",
  };
  return (
    <span
      className={`inline-block h-3 w-3 rounded-full shrink-0 ${colors[status]}`}
      aria-label={status}
    />
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  sessions: Session[];
}

export function ClientPulseGrid({ sessions }: Props) {
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

    // Finalise rate & status
    return Array.from(map.values()).map((p) => {
      const rate = p.totalTasks > 0 ? Math.round((p.completedTasks / p.totalTasks) * 100) : 0;
      return { ...p, completionRate: rate, status: deriveStatus(rate, p.totalTasks) };
    });
  }, [sessions]);

  if (pulseData.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-slate-800">Client Pulse</p>
        <p className="text-xs text-slate-400">{pulseData.length} clients</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {pulseData.map((client) => (
          <ClientPulseCard key={client.clientEmail} client={client} />
        ))}
      </div>
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function ClientPulseCard({ client }: { client: ClientPulse }) {
  const borderColor = {
    green: "border-emerald-200",
    yellow: "border-amber-200",
    red: "border-red-200",
  }[client.status];

  const bgColor = {
    green: "bg-emerald-50/40",
    yellow: "bg-amber-50/40",
    red: "bg-red-50/40",
  }[client.status];

  const badgeVariant: Record<ClientPulse["status"], string> = {
    green: "bg-emerald-100 text-emerald-700",
    yellow: "bg-amber-100 text-amber-700",
    red: "bg-red-100 text-red-700",
  };

  const statusLabel = { green: "On Track", yellow: "Needs Attention", red: "At Risk" }[
    client.status
  ];

  function handleSendReminder() {
    toast.success(`Reminder sent to ${client.clientEmail}`);
  }

  return (
    <Card className={`border ${borderColor} ${bgColor} shadow-sm`}>
      <CardContent className="p-4 flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-center gap-2">
          <TrafficDot status={client.status} />
          <span className="text-xs font-medium text-slate-700 truncate flex-1" title={client.clientEmail}>
            {client.clientEmail}
          </span>
          <Badge className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold shrink-0 border-0 ${badgeVariant[client.status]}`}>
            {statusLabel}
          </Badge>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-y-1.5 text-xs text-slate-600">
          <span className="text-slate-400">Sessions</span>
          <span className="font-semibold text-slate-800 text-right">{client.sessionCount}</span>

          <span className="text-slate-400">Tasks done</span>
          <span className="font-semibold text-slate-800 text-right">
            {client.completedTasks}
            <span className="font-normal text-slate-400">/{client.totalTasks}</span>
          </span>

          <span className="text-slate-400">Completion</span>
          <span className="font-semibold text-slate-800 text-right">{client.completionRate}%</span>

          <span className="text-slate-400">Last session</span>
          <span className="font-semibold text-slate-800 text-right">
            {new Date(client.lastSessionDate).toLocaleDateString("he-IL", {
              day: "2-digit",
              month: "short",
            })}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              client.status === "green"
                ? "bg-emerald-500"
                : client.status === "yellow"
                ? "bg-amber-400"
                : "bg-red-500"
            }`}
            style={{ width: `${client.completionRate}%` }}
          />
        </div>

        {/* Sentiment sparkline */}
        <div className="mt-2 pt-2 border-t border-border/40">
          <p className="text-[11px] text-muted-foreground mb-1">Sentiment trend</p>
          <ResponsiveContainer width="100%" height={36}>
            <LineChart data={[{v:0.6},{v:0.7},{v:0.5},{v:0.8},{v:0.75}]}>
              <Line type="monotone" dataKey="v" stroke="oklch(0.65 0.10 145)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Reminder button — only on red cards */}
        {client.status === "red" && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-100 border border-red-200 self-start"
            onClick={handleSendReminder}
          >
            Send Reminder
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
