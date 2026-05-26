"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/providers/supabase-provider";
import { useOrganization } from "@/providers/organization-provider";
import { useRealtime } from "@/providers/realtime-provider";
import { useLanguage } from "@/providers/language-provider";
import { api } from "@/lib/api";
import { PageHeader, KpiTile } from "@/components/ui/lightning";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import type { Ticket, TicketStatus } from "@/types";
import { LifeBuoy, AlertTriangle, Inbox } from "lucide-react";

const PRIORITY_RANK: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const priorityVariant: Record<string, "default" | "info" | "warning" | "danger"> = {
  low: "default",
  medium: "info",
  high: "warning",
  critical: "danger",
};

const STATUSES: TicketStatus[] = ["open", "in_progress", "resolved"];

export default function AdminTicketsPage() {
  const { session } = useSupabase();
  const { currentOrg, currentRole, loading: orgLoading } = useOrganization();
  const { subscribe } = useRealtime();
  const { t, lang } = useLanguage();
  const router = useRouter();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [statusDraft, setStatusDraft] = useState<TicketStatus>("open");
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const token = session?.access_token || "";

  // ── Role guard: org admins only ──
  useEffect(() => {
    if (orgLoading) return;
    if (currentRole !== "admin") {
      router.replace("/dashboard/member");
    }
  }, [orgLoading, currentRole, router]);

  const priorityLabels: Record<string, string> = {
    low: t("tickets.priority_low"),
    medium: t("tickets.priority_medium"),
    high: t("tickets.priority_high"),
    critical: t("tickets.priority_critical"),
  };
  const statusLabels: Record<string, string> = {
    open: t("tickets.status_open"),
    in_progress: t("tickets.status_in_progress"),
    resolved: t("tickets.status_resolved"),
  };
  const typeLabels: Record<string, string> = {
    manual_complaint: t("tickets.type_manual_complaint"),
    system_error: t("tickets.type_system_error"),
  };

  const loadTickets = useCallback(async () => {
    if (!currentOrg || !token) return;
    try {
      const data = (await api.getTickets(currentOrg.id, token)) as Ticket[];
      setTickets(data || []);
    } catch {
      // silently fail — list stays as-is
    }
    setLoading(false);
  }, [currentOrg, token]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  // ── Realtime: new tickets/errors appear live with a notification banner ──
  useEffect(() => {
    const unsub = subscribe("tickets", (payload) => {
      loadTickets();
      if (payload.eventType === "INSERT") {
        const isError = (payload.new as { type?: string })?.type === "system_error";
        setBanner(isError ? t("tickets.newErrorToast") : t("tickets.newTicketToast"));
        if (bannerTimer.current) clearTimeout(bannerTimer.current);
        bannerTimer.current = setTimeout(() => setBanner(null), 6000);
      }
    });
    return () => {
      unsub();
      if (bannerTimer.current) clearTimeout(bannerTimer.current);
    };
  }, [subscribe, loadTickets, t]);

  const sorted = useMemo(() => {
    return [...tickets].sort((a, b) => {
      const dt = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (dt !== 0) return dt;
      return (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9);
    });
  }, [tickets]);

  const openCount = useMemo(() => tickets.filter((x) => x.status === "open").length, [tickets]);
  const criticalCount = useMemo(
    () => tickets.filter((x) => x.priority === "critical" && x.status !== "resolved").length,
    [tickets]
  );

  const openTicket = (ticket: Ticket) => {
    setSelected(ticket);
    setStatusDraft(ticket.status);
  };

  const handleSaveStatus = async () => {
    if (!selected || statusDraft === selected.status) return;
    setSaving(true);
    try {
      const updated = (await api.updateTicket(selected.id, { status: statusDraft }, token)) as Ticket;
      setTickets((prev) => prev.map((x) => (x.id === selected.id ? { ...x, ...updated } : x)));
      setSelected(null);
    } catch {
      // keep modal open on failure
    } finally {
      setSaving(false);
    }
  };

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleString(lang === "he" ? "he-IL" : "en-US");

  if (orgLoading || currentRole !== "admin") return null;

  return (
    <div className="space-y-5">
      <PageHeader
        icon={<LifeBuoy className="w-5 h-5 text-white" />}
        eyebrow={t("console.organization")}
        title={t("tickets.adminTitle")}
        breadcrumb={[t("nav.admin"), t("nav.tickets")]}
      />

      {banner && (
        <Alert variant="info" title={t("tickets.newActivityTitle")}>
          {banner}
        </Alert>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiTile
          label={t("tickets.kpiTotal")}
          value={tickets.length}
          icon={<Inbox className="w-4 h-4" />}
        />
        <KpiTile label={t("tickets.kpiOpen")} value={openCount} />
        <KpiTile
          label={t("tickets.kpiCritical")}
          value={criticalCount}
          icon={<AlertTriangle className="w-4 h-4" />}
        />
      </div>

      {loading ? (
        <Card>
          <div className="flex items-center justify-center py-12">
            <div className="animate-pulse text-sm text-gray-400">{t("common.loading")}</div>
          </div>
        </Card>
      ) : sorted.length === 0 ? (
        <Card>
          <p className="text-center text-sm text-[#706e6b] py-8">{t("tickets.empty")}</p>
        </Card>
      ) : (
        <Card padding={false}>
          <div className="divide-y divide-[#dddbda]">
            {sorted.map((ticket) => (
              <button
                key={ticket.id}
                onClick={() => openTicket(ticket)}
                className="w-full text-start px-6 py-4 hover:bg-[#fafaf9] transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Badge variant={priorityVariant[ticket.priority] ?? "default"}>
                      {priorityLabels[ticket.priority] ?? ticket.priority}
                    </Badge>
                    <Badge variant={ticket.status === "resolved" ? "success" : ticket.status === "in_progress" ? "warning" : "info"}>
                      {statusLabels[ticket.status] ?? ticket.status}
                    </Badge>
                    {ticket.type === "system_error" && (
                      <Badge variant="danger">{typeLabels.system_error}</Badge>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-[#080707] truncate">{ticket.title}</h4>
                    {ticket.description && (
                      <p className="text-sm text-[#3e3e3c] line-clamp-1">{ticket.description}</p>
                    )}
                  </div>
                  <span className="text-[11px] text-[#706e6b] flex-shrink-0 whitespace-nowrap">
                    {fmtDate(ticket.created_at)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}

      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected?.title || t("tickets.adminTitle")}
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant={priorityVariant[selected.priority] ?? "default"}>
                {priorityLabels[selected.priority] ?? selected.priority}
              </Badge>
              <Badge variant="default">{typeLabels[selected.type] ?? selected.type}</Badge>
              <span className="text-[11px] text-[#706e6b]">{fmtDate(selected.created_at)}</span>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#706e6b] mb-1">
                {t("tickets.descriptionLabel")}
              </p>
              <p className="text-sm text-[#3e3e3c] whitespace-pre-wrap">
                {selected.description || t("tickets.noDescription")}
              </p>
            </div>

            {selected.metadata && Object.keys(selected.metadata).length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#706e6b] mb-1">
                  {t("tickets.metadataLabel")}
                </p>
                <pre className="text-[11px] bg-[#fafaf9] border border-[#dddbda] rounded p-3 overflow-x-auto max-h-48 text-[#3e3e3c]">
                  {JSON.stringify(selected.metadata, null, 2)}
                </pre>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-[#706e6b] block mb-1">
                {t("tickets.statusLabel")}
              </label>
              <select
                value={statusDraft}
                onChange={(e) => setStatusDraft(e.target.value as TicketStatus)}
                className="w-full px-3 py-2 border border-[#dddbda] rounded text-sm focus:ring-2 focus:ring-[#0070d2]/30 focus:border-transparent bg-white"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {statusLabels[s]}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 justify-start pt-1">
              <Button
                onClick={handleSaveStatus}
                loading={saving}
                disabled={statusDraft === selected.status}
              >
                {t("common.saveChanges")}
              </Button>
              <Button variant="ghost" onClick={() => setSelected(null)}>
                {t("common.close")}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
