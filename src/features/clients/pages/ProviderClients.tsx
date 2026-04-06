import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X } from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Layout } from "@/shared/components/layout/Layout";
import { cn } from "@/core/utils/utils";
import { useRealtimeSessions } from "@/shared/hooks/useRealtimeSessions";
import { useAuth } from "@/core/state/AuthContext";
import { apiFetchSessions, type Session } from "@/core/utils/storage";
import { useLoadingDelay } from "@/shared/hooks/useLoadingDelay";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClientSummary {
  clientEmail: string;
  sessionCount: number;
  totalTasks: number;
  completedTasks: number;
  lastSessionAt: string;
  status: "green" | "yellow" | "red";
  completionRate: number;
  sentimentTrend: number[];
}

type StatusFilter = "all" | "green" | "yellow" | "red";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildClientSummaries(sessions: Session[]): ClientSummary[] {
  const map = new Map<string, { sessions: Session[]; totalTasks: number; completedTasks: number; lastDate: string }>();

  for (const s of sessions) {
    const key = s.clientEmail ?? "(no email)";
    const entry = map.get(key) ?? { sessions: [], totalTasks: 0, completedTasks: 0, lastDate: s.createdAt };
    entry.sessions.push(s);
    entry.totalTasks    += s.taskCount       ?? 0;
    entry.completedTasks += s.completedCount ?? 0;
    if (new Date(s.createdAt) > new Date(entry.lastDate)) entry.lastDate = s.createdAt;
    map.set(key, entry);
  }

  return Array.from(map.entries()).map(([email, entry]) => {
    const rate = entry.totalTasks > 0 ? Math.round((entry.completedTasks / entry.totalTasks) * 100) : 0;
    const status: ClientSummary["status"] =
      entry.totalTasks === 0 ? "red" : rate >= 80 ? "green" : rate >= 30 ? "yellow" : "red";

    const last5 = [...entry.sessions]
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .slice(-5)
      .map((s) => (s.taskCount ?? 0) > 0 ? Math.round(((s.completedCount ?? 0) / (s.taskCount ?? 1)) * 100) : 0);

    return {
      clientEmail:    email,
      sessionCount:   entry.sessions.length,
      totalTasks:     entry.totalTasks,
      completedTasks: entry.completedTasks,
      lastSessionAt:  entry.lastDate,
      status,
      completionRate: rate,
      sentimentTrend: last5,
    };
  });
}

function daysAgo(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
}

function initials(email: string): string {
  return email.slice(0, 2).toUpperCase();
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

function ClientCardSkeleton() {
  return (
    <Card className="border-slate-200">
      <CardContent className="p-4 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
        <Skeleton className="h-8 w-24" />
      </CardContent>
    </Card>
  );
}

const ClientCard = memo(function ClientCard({ client, onClick }: { client: ClientSummary; onClick: () => void }) {
  const { t } = useTranslation();
  const isAtRisk = client.status === "red";
  const pending  = client.totalTasks - client.completedTasks;
  const days     = daysAgo(client.lastSessionAt);

  const borderColor = { green: "border-emerald-200", yellow: "border-amber-200", red: "border-red-300" }[client.status];
  const badgeClass  = { green: "bg-emerald-100 text-emerald-700", yellow: "bg-amber-100 text-amber-700", red: "bg-red-100 text-red-700" }[client.status];
  const statusLabel = { green: t("clients.healthy"), yellow: t("clients.neutral"), red: t("clients.atRisk") }[client.status];
  const avatarBg    = { green: "bg-emerald-100 text-emerald-700", yellow: "bg-amber-100 text-amber-700", red: "bg-red-100 text-red-700" }[client.status];

  const sparkData = client.sentimentTrend.map((v) => ({ v }));

  return (
    <motion.button
      layout
      whileHover={{ y: -2, boxShadow: "0 8px 24px rgba(0,0,0,0.09)" }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      onClick={onClick}
      className={cn(
        "w-full text-start rounded-xl border bg-white dark:bg-slate-800 shadow-sm transition-colors",
        borderColor,
        isAtRisk && "ring-2 ring-red-400/50"
      )}
    >
      <div className="p-4 flex flex-col gap-3">
        {/* Header row */}
        <div className="flex items-center gap-3">
          <div className={cn("h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0", avatarBg)}>
            {initials(client.clientEmail)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{client.clientEmail}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {t("clients.sessions", { count: client.sessionCount })} · {t("tasks.daysOld", { count: days })}
            </p>
          </div>
          <Badge className={cn("text-[10px] px-1.5 py-0.5 rounded-full border-0 shrink-0", badgeClass)}>
            {statusLabel}
          </Badge>
        </div>

        {/* Pending tasks */}
        <p className="text-xs text-slate-600 dark:text-slate-300">
          {t("clients.pendingTasks", { count: pending })}
        </p>

        {/* Progress bar */}
        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", {
              "bg-emerald-500": client.status === "green",
              "bg-amber-400":   client.status === "yellow",
              "bg-red-500":     client.status === "red",
            })}
            style={{ width: `${client.completionRate}%` }}
          />
        </div>

        {/* Sparkline */}
        {sparkData.length >= 2 && (
          <div>
            <p className="text-[10px] text-muted-foreground mb-1">{t("clients.sentimentTrend")}</p>
            <ResponsiveContainer width="100%" height={28}>
              <LineChart data={sparkData}>
                <Line type="monotone" dataKey="v" stroke="oklch(0.65 0.10 145)" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Declining trend warning */}
        {sparkData.length >= 2 && sparkData[sparkData.length - 1].v < sparkData[0].v && (
          <p className="text-[10px] text-amber-600 font-medium">{t("clients.warningDecline")}</p>
        )}
      </div>
    </motion.button>
  );
});

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProviderClients() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const showSkeleton = useLoadingDelay(loading);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  useRealtimeSessions(setSessions, user?.id ?? null);

  const loadSessions = useCallback(() => {
    setLoading(true);
    apiFetchSessions()
      .then(setSessions)
      .catch(() => toast.error("Failed to load clients"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  // Debounce search input — 250ms delay prevents filtering on every keystroke
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  const clients = useMemo(() => buildClientSummaries(sessions), [sessions]);

  const filtered = useMemo(() =>
    clients.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (debouncedSearch.trim()) {
        const q = debouncedSearch.toLowerCase();
        if (!c.clientEmail.toLowerCase().includes(q)) return false;
      }
      return true;
    }), [clients, statusFilter, debouncedSearch]);

  const PILLS: { key: StatusFilter; label: string }[] = [
    { key: "all",    label: t("clients.all") },
    { key: "red",    label: t("clients.atRisk") },
    { key: "yellow", label: t("clients.neutral") },
    { key: "green",  label: t("clients.healthy") },
  ];

  return (
    <Layout title={t("clients.title")} subtitle={t("clients.subtitle")}>
      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("clients.searchPlaceholder")}
            className="ps-9 h-10 text-sm border-slate-200"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {PILLS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={cn(
                "min-h-[40px] px-4 rounded-full text-sm font-medium border transition-colors",
                statusFilter === key
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 hover:border-indigo-300"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Count */}
      <p className="text-xs text-slate-400 mb-4">
        {clients.length !== filtered.length
          ? t("clients.clientCountFiltered", { shown: filtered.length, total: clients.length })
          : t("clients.clientCount", { count: filtered.length })}
      </p>

      {/* Grid */}
      {showSkeleton ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <ClientCardSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
          <p className="text-sm font-medium text-slate-500">{t("clients.noClients")}</p>
          {search && (
            <button onClick={() => setSearch("")} className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
              <X className="h-3 w-3" /> {t("clients.clearSearch")}
            </button>
          )}
        </div>
      ) : (
        <motion.div
          layout
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          <AnimatePresence mode="popLayout">
            {filtered.map((client) => (
              <ClientCard
                key={client.clientEmail}
                client={client}
                onClick={() => navigate(`/provider/clients/${encodeURIComponent(client.clientEmail)}`)}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

    </Layout>
  );
}
