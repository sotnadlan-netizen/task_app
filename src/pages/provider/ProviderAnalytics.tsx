import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { Download, Loader2, TrendingUp, CheckCircle2, Layers, ListTodo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Layout } from "@/components/Layout";
import { apiFetchAnalyticsOverview, type AnalyticsOverview } from "@/lib/storage";
import { apiFetch } from "@/lib/apiClient";
import { toast } from "sonner";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

async function downloadCsvExport() {
  const { data } = await (await import("@/lib/supabaseClient")).supabase.auth.getSession();
  const token = data.session?.access_token;
  const res = await fetch(`${API_BASE}/api/analytics/sessions/export`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Export failed");
  const blob = await res.blob();
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `sessions-export-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ProviderAnalytics() {
  const { t } = useTranslation();
  const [data, setData]       = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    apiFetchAnalyticsOverview()
      .then(setData)
      .catch(() => toast.error("Failed to load analytics"))
      .finally(() => setLoading(false));
  }, []);

  async function handleExport() {
    setExporting(true);
    try {
      await downloadCsvExport();
      toast.success("Export downloaded");
    } catch {
      toast.error("Failed to export data");
    } finally {
      setExporting(false);
    }
  }

  const stats = data
    ? [
        { label: t("dashboard.totalSessions"),  value: data.totalSessions,        icon: Layers,      color: "text-indigo-600",  bg: "bg-indigo-50" },
        { label: t("dashboard.totalTasks"),     value: data.totalTasks,           icon: ListTodo,    color: "text-slate-600",   bg: "bg-slate-100" },
        { label: t("dashboard.completedTasks"), value: data.completedTasks,       icon: CheckCircle2,color: "text-emerald-600", bg: "bg-emerald-50" },
        { label: t("analytics.completionRate"), value: `${data.completionRate}%`, icon: TrendingUp,  color: "text-amber-600",   bg: "bg-amber-50" },
      ]
    : [];

  return (
    <Layout title={t("nav.analytics")} subtitle={t("analytics.subtitle")}>
      <div className="flex justify-end mb-6">
        <Button
          onClick={handleExport}
          disabled={exporting || loading}
          className="h-10 bg-indigo-600 hover:bg-indigo-700 gap-2"
        >
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {t("analytics.exportCsv")}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : !data ? null : (
        <div className="space-y-8">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {stats.map(({ label, value, icon: Icon, color, bg }) => (
              <Card key={label} className="border-slate-200 shadow-sm">
                <CardContent className="p-4 md:p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[10px] md:text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
                      <p className="text-2xl md:text-3xl font-bold text-slate-900 mt-1">{value}</p>
                    </div>
                    <div className={`rounded-lg ${bg} p-2 md:p-2.5`}>
                      <Icon className={`h-4 w-4 ${color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Talk-Time Distribution */}
          <div className="glass shadow-glass rounded-2xl p-5 mt-4">
            <h3 className="text-base font-semibold text-foreground mb-1">{t("analytics.talkTime")}</h3>
            <p className="text-sm text-muted-foreground mb-4">{t("analytics.talkTimeDesc")}</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={[
                { session: 'S1', advisor: 65, client: 35 },
                { session: 'S2', advisor: 45, client: 55 },
                { session: 'S3', advisor: 70, client: 30 },
                { session: 'S4', advisor: 50, client: 50 },
                { session: 'S5', advisor: 55, client: 45 },
              ]} barSize={18}>
                <XAxis dataKey="session" tick={{ fontSize: 12 }} />
                <YAxis unit="%" tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Legend />
                <Bar dataKey="advisor" name={t("analytics.advisor")} fill="oklch(0.65 0.10 145)" radius={[4,4,0,0]} />
                <Bar dataKey="client" name={t("analytics.client")} fill="oklch(0.55 0.08 255)" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Sessions per Month chart */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-semibold text-slate-800">{t("analytics.sessionsByMonth")}</CardTitle>
            </CardHeader>
            <CardContent>
              {data.sessionsByMonth.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-12">{t("analytics.noSessionData")}</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data.sessionsByMonth} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
                      cursor={{ fill: "#f1f5f9" }}
                    />
                    <Bar dataKey="count" name={t("dashboard.recentSessions")} fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Task completion rate bar */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-semibold text-slate-800">{t("analytics.overallCompletion")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                    style={{ width: `${data.completionRate}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-slate-700 shrink-0">
                  {data.completionRate}%
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                {t("analytics.tasksCompletedDesc", { completed: data.completedTasks, total: data.totalTasks })}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </Layout>
  );
}
