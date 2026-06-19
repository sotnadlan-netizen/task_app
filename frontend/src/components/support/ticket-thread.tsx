"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useSupabase } from "@/providers/supabase-provider";
import { useLanguage } from "@/providers/language-provider";
import type { TicketMessage } from "@/types";
import { Send } from "lucide-react";

/**
 * Per-ticket chat thread. Loads messages, lets the viewer post, and subscribes
 * to live inserts for this ticket. Works for both the client support page and
 * the platform dashboard — it keys realtime on ticket_id, not org_id, so it
 * doesn't depend on the org-scoped RealtimeProvider.
 */
export function TicketThread({ ticketId }: { ticketId: string }) {
  const { supabase, session, user } = useSupabase();
  const { t, lang } = useLanguage();

  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const token = session?.access_token || "";

  const loadMessages = useCallback(async () => {
    if (!token) return;
    try {
      const data = (await api.getTicketMessages(ticketId, token)) as TicketMessage[];
      setMessages(data || []);
    } catch {
      // keep whatever we have
    }
    setLoading(false);
  }, [ticketId, token]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Live updates for this specific ticket (org-agnostic).
  useEffect(() => {
    const channel = supabase
      .channel(`ticket-messages:${ticketId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ticket_messages",
          filter: `ticket_id=eq.${ticketId}`,
        },
        () => loadMessages()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, ticketId, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    setSending(true);
    try {
      await api.postTicketMessage(ticketId, draft.trim(), token);
      setDraft("");
      await loadMessages();
    } catch {
      // leave the draft so the user can retry
    } finally {
      setSending(false);
    }
  };

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleString(lang === "he" ? "he-IL" : "en-US");

  return (
    <div className="flex flex-col">
      <div className="max-h-72 overflow-y-auto space-y-2 p-3 bg-[#fafaf9] border border-[#dddbda] rounded">
        {loading ? (
          <p className="text-sm text-gray-400 text-center py-6">{t("common.loading")}</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-[#706e6b] text-center py-6">{t("tickets.threadEmpty")}</p>
        ) : (
          messages.map((m) => {
            const mine = m.user_id === user?.id;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 ${
                    mine
                      ? "bg-[#0070d2] text-white"
                      : "bg-white border border-[#dddbda] text-[#080707]"
                  }`}
                >
                  <p dir="auto" className={`bidi-auto text-[11px] mb-0.5 ${mine ? "text-white/80" : "text-[#706e6b]"}`}>
                    {m.author?.full_name || m.author?.email || t("tickets.unknownUser")}
                    {" · "}
                    {fmtTime(m.created_at)}
                  </p>
                  <p dir="auto" className="bidi-auto text-sm whitespace-pre-wrap break-words">{m.body}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="mt-3 flex items-center gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t("tickets.threadPlaceholder")}
          className="flex-1 px-3 py-2 border border-[#dddbda] rounded text-sm focus:ring-2 focus:ring-[#0070d2]/30 focus:border-transparent bg-white"
        />
        <Button type="submit" size="sm" loading={sending} disabled={!draft.trim()}>
          <Send className="w-4 h-4 me-1" />
          {t("tickets.threadSend")}
        </Button>
      </form>
    </div>
  );
}
