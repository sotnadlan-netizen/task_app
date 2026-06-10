"use client";

import { useCallback, useEffect, useState } from "react";
import { SupportTicketForm } from "@/components/support/support-ticket-form";
import { TicketThread } from "@/components/support/ticket-thread";
import { PageHeader } from "@/components/ui/lightning";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { api } from "@/lib/api";
import { useSupabase } from "@/providers/supabase-provider";
import { useOrganization } from "@/providers/organization-provider";
import { useRealtime } from "@/providers/realtime-provider";
import { useLanguage } from "@/providers/language-provider";
import type { Ticket } from "@/types";
import { LifeBuoy } from "lucide-react";

const priorityVariant: Record<string, "default" | "info" | "warning" | "danger"> = {
  low: "default",
  medium: "info",
  high: "warning",
  critical: "danger",
};

export default function SupportPage() {
  const { session } = useSupabase();
  const { currentOrg } = useOrganization();
  const { subscribe } = useRealtime();
  const { t, lang } = useLanguage();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Ticket | null>(null);

  const token = session?.access_token || "";

  const loadTickets = useCallback(async () => {
    if (!currentOrg || !token) return;
    try {
      const data = (await api.getTickets(currentOrg.id, token)) as Ticket[];
      setTickets(data || []);
    } catch {
      // keep current list
    }
    setLoading(false);
  }, [currentOrg, token]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    const unsub = subscribe("tickets", () => loadTickets());
    return unsub;
  }, [subscribe, loadTickets]);

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

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleString(lang === "he" ? "he-IL" : "en-US");

  return (
    <div className="space-y-5 max-w-2xl">
      <PageHeader
        icon={<LifeBuoy className="w-5 h-5 text-white" />}
        eyebrow={t("tickets.supportEyebrow")}
        title={t("tickets.supportTitle")}
        breadcrumb={[t("nav.support")]}
      />

      {/* Top: submission form */}
      <section>
        <p className="text-sm text-[#706e6b] mb-3">{t("tickets.supportIntro")}</p>
        <SupportTicketForm onSubmitted={loadTickets} />
      </section>

      {/* Bottom: my tickets + error tickets */}
      <section>
        <h2 className="text-sm font-semibold text-[#080707] mb-2">
          {t("tickets.myTicketsTitle")}
        </h2>
        {loading ? (
          <Card>
            <p className="text-center text-sm text-gray-400 py-8">{t("common.loading")}</p>
          </Card>
        ) : tickets.length === 0 ? (
          <Card>
            <p className="text-center text-sm text-[#706e6b] py-8">{t("tickets.myTicketsEmpty")}</p>
          </Card>
        ) : (
          <Card padding={false}>
            <div className="divide-y divide-[#dddbda]">
              {tickets.map((ticket) => (
                <button
                  key={ticket.id}
                  onClick={() => setSelected(ticket)}
                  className="w-full text-start px-5 py-3.5 hover:bg-[#fafaf9] transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Badge variant={priorityVariant[ticket.priority] ?? "default"}>
                        {priorityLabels[ticket.priority] ?? ticket.priority}
                      </Badge>
                      <Badge
                        variant={
                          ticket.status === "resolved"
                            ? "success"
                            : ticket.status === "in_progress"
                              ? "warning"
                              : "info"
                        }
                      >
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
      </section>

      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected?.title || t("tickets.supportTitle")}
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant={priorityVariant[selected.priority] ?? "default"}>
                {priorityLabels[selected.priority] ?? selected.priority}
              </Badge>
              <Badge
                variant={
                  selected.status === "resolved"
                    ? "success"
                    : selected.status === "in_progress"
                      ? "warning"
                      : "info"
                }
              >
                {statusLabels[selected.status] ?? selected.status}
              </Badge>
              <Badge variant="default">{typeLabels[selected.type] ?? selected.type}</Badge>
              <span className="text-[11px] text-[#706e6b]">{fmtDate(selected.created_at)}</span>
            </div>

            {selected.description && (
              <p className="text-sm text-[#3e3e3c] whitespace-pre-wrap">{selected.description}</p>
            )}

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#706e6b] mb-2">
                {t("tickets.threadTitle")}
              </p>
              <TicketThread ticketId={selected.id} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
