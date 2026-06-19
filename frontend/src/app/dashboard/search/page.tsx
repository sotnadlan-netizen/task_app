"use client";

/**
 * Global search results — Atlassian-style free-text search across the console.
 *
 * The nav search box routes here with ?q=<terms>. We load the current org's
 * sessions ("meetings") and tasks ("missions") and rank them by keyword match
 * (title weighted above body), highlight the matched terms, and let the user
 * open any result. Clicking a task opens its parent meeting. All reads are
 * scoped to the current org and enforced by Supabase RLS.
 */

import { Fragment, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search as SearchIcon,
  Phone,
  ListChecks,
  FolderOpen,
  CalendarDays,
  Trash2,
} from "lucide-react";
import { useSupabase } from "@/providers/supabase-provider";
import { useOrganization } from "@/providers/organization-provider";
import { useLanguage } from "@/providers/language-provider";
import type { Lang } from "@/lib/i18n";
import { PageHeader } from "@/components/ui/lightning";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { SessionDetailModal } from "@/components/meetings/session-detail-modal";
import { api } from "@/lib/api";
import type { Session, Task } from "@/types";

const localeOf = (lang: Lang) => (lang === "he" ? "he-IL" : "en-US");

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

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Wrap any matched search term in <mark>. */
function Highlight({ text, terms }: { text: string; terms: string[] }) {
  if (!text) return null;
  if (terms.length === 0) return <>{text}</>;
  const re = new RegExp(`(${terms.map(escapeRegExp).join("|")})`, "ig");
  const parts = text.split(re);
  return (
    <>
      {parts.map((part, i) =>
        terms.some((tm) => tm.toLowerCase() === part.toLowerCase()) ? (
          <mark key={i} className="bg-amber-200 text-inherit rounded px-0.5">{part}</mark>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        )
      )}
    </>
  );
}

function SearchView() {
  const { supabase, session } = useSupabase();
  const { currentOrg } = useOrganization();
  const { t, lang } = useLanguage();
  const loc = localeOf(lang);
  const router = useRouter();
  const params = useSearchParams();

  const [query, setQuery] = useState(params.get("q") || "");
  const [allSessions, setAllSessions] = useState<Session[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Session | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const token = session?.access_token || "";

  // ── Load the org's meetings + tasks once (filtered client-side as you type). ──
  const load = useCallback(async () => {
    if (!currentOrg) return;
    setLoading(true);
    const [sRes, tRes, pRes] = await Promise.all([
      supabase.from("sessions").select("*").eq("org_id", currentOrg.id).order("created_at", { ascending: false }).limit(300),
      supabase.from("tasks").select("*, assignee:profiles!tasks_assignee_id_fkey(*)").eq("org_id", currentOrg.id).order("created_at", { ascending: false }).limit(500),
      supabase.from("projects").select("id, name").eq("org_id", currentOrg.id),
    ]);
    if (sRes.data) setAllSessions(sRes.data as Session[]);
    if (tRes.data) setAllTasks(tRes.data as Task[]);
    if (pRes.data) {
      const map: Record<string, string> = {};
      (pRes.data as { id: string; name: string }[]).forEach((p) => { map[p.id] = p.name; });
      setProjects(map);
    }
    setLoading(false);
  }, [supabase, currentOrg]);

  useEffect(() => { load(); }, [load]);

  // Keep the URL's ?q= in sync with the live input (debounced, shareable link).
  useEffect(() => {
    const handle = setTimeout(() => {
      const current = params.get("q") || "";
      const next = query.trim();
      if (next !== current) {
        router.replace(`/dashboard/search${next ? `?q=${encodeURIComponent(next)}` : ""}`);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [query, params, router]);

  const terms = useMemo(() => query.toLowerCase().split(/\s+/).filter(Boolean), [query]);

  const score = useCallback(
    (title: string, body: string) => {
      if (terms.length === 0) return 0;
      const tt = (title || "").toLowerCase();
      const bb = (body || "").toLowerCase();
      let s = 0;
      for (const term of terms) {
        if (tt.includes(term)) s += 2;
        else if (bb.includes(term)) s += 1;
      }
      return s;
    },
    [terms]
  );

  const matchedSessions = useMemo(
    () =>
      allSessions
        .map((s) => ({ s, sc: score(s.title, s.summary) }))
        .filter((x) => x.sc > 0)
        .sort((a, b) => b.sc - a.sc || +new Date(b.s.created_at) - +new Date(a.s.created_at))
        .map((x) => x.s),
    [allSessions, score]
  );

  const matchedTasks = useMemo(
    () =>
      allTasks
        .map((tk) => ({ tk, sc: score(tk.title, `${tk.description || ""} ${tk.assignee?.full_name || ""}`) }))
        .filter((x) => x.sc > 0)
        .sort((a, b) => b.sc - a.sc || +new Date(b.tk.created_at) - +new Date(a.tk.created_at))
        .map((x) => x.tk),
    [allTasks, score]
  );

  const hasQuery = terms.length > 0;
  const totalCount = matchedSessions.length + matchedTasks.length;

  const openTaskSession = (tk: Task) => {
    const owning = allSessions.find((s) => s.id === tk.session_id);
    if (owning) setSelectedSession(owning);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.deleteSession(confirmDelete.id, token);
      setAllSessions((prev) => prev.filter((s) => s.id !== confirmDelete.id));
      if (selectedSession?.id === confirmDelete.id) setSelectedSession(null);
      setConfirmDelete(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : t("meetings.errDelete"));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        icon={<SearchIcon className="w-5 h-5 text-white" />}
        eyebrow={currentOrg?.name}
        title={hasQuery ? t("search.resultsFor", { q: query.trim() }) : t("search.title")}
        breadcrumb={[t("nav.home"), t("search.title")]}
      />

      {/* Big search input — refines results live */}
      <div className="relative">
        <SearchIcon className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-[#706e6b]" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("search.placeholder")}
          aria-label={t("search.title")}
          className="w-full ps-9 pe-3 py-2.5 text-[14px] bg-white border border-[#dddbda] rounded shadow-[0_2px_2px_rgba(0,0,0,0.05)] text-[#080707] placeholder-[#706e6b] focus:outline-none focus:ring-2 focus:ring-[#1ab9ff]"
        />
      </div>

      {loading ? (
        <div className="bg-white rounded border border-[#dddbda] py-12 text-center text-sm text-[#706e6b]">
          {t("search.searching")}
        </div>
      ) : !hasQuery ? (
        <div className="bg-white rounded border border-[#dddbda] py-12 text-center text-sm text-[#706e6b]">
          {t("search.prompt")}
        </div>
      ) : totalCount === 0 ? (
        <div className="bg-white rounded border border-[#dddbda] py-12 text-center text-sm text-[#706e6b]">
          {t("search.empty", { q: query.trim() })}
        </div>
      ) : (
        <>
          <p className="text-[12px] text-[#706e6b]">{t("search.totalResults", { count: totalCount })}</p>

          {/* Meetings */}
          {matchedSessions.length > 0 && (
            <section className="bg-white rounded border border-[#dddbda] shadow-[0_2px_2px_rgba(0,0,0,0.05)]">
              <div className="border-b border-[#dddbda] px-4 py-2.5 flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#0070d2]" />
                <span className="text-[14px] font-semibold text-[#080707]">{t("search.meetings")}</span>
                <span className="text-[11px] text-[#706e6b]">{t("search.meetingsCount", { count: matchedSessions.length })}</span>
              </div>
              <ul className="divide-y divide-[#dddbda]">
                {matchedSessions.map((s) => {
                  const projectName = s.project_id ? projects[s.project_id] : null;
                  return (
                    <li
                      key={s.id}
                      onClick={() => setSelectedSession(s)}
                      className="px-4 py-3 hover:bg-[#fafaf9] cursor-pointer"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[11px] text-[#0070d2]">{s.id.slice(0, 8)}</span>
                        <span className="font-semibold text-[14px] text-[#080707]">
                          <Highlight text={s.title || t("search.noTitle")} terms={terms} />
                        </span>
                        {projectName && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-[#0070d2]"><FolderOpen className="w-3 h-3" />{projectName}</span>
                        )}
                        <span className="ms-auto inline-flex items-center gap-1 text-[11px] text-[#706e6b]">
                          <CalendarDays className="w-3 h-3" />{new Date(s.created_at).toLocaleDateString(loc)}
                        </span>
                      </div>
                      {s.summary && (
                        <p className="mt-1 text-[12px] text-[#3e3e3c] line-clamp-2" dir="auto">
                          <Highlight text={s.summary} terms={terms} />
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* Tasks / missions */}
          {matchedTasks.length > 0 && (
            <section className="bg-white rounded border border-[#dddbda] shadow-[0_2px_2px_rgba(0,0,0,0.05)]">
              <div className="border-b border-[#dddbda] px-4 py-2.5 flex items-center gap-2">
                <ListChecks className="w-4 h-4 text-[#fe9339]" />
                <span className="text-[14px] font-semibold text-[#080707]">{t("search.tasks")}</span>
                <span className="text-[11px] text-[#706e6b]">{t("search.tasksCount", { count: matchedTasks.length })}</span>
              </div>
              <ul className="divide-y divide-[#dddbda]">
                {matchedTasks.map((tk) => (
                  <li
                    key={tk.id}
                    onClick={() => openTaskSession(tk)}
                    className="px-4 py-3 hover:bg-[#fafaf9] cursor-pointer"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-semibold text-[14px] ${tk.status === "done" ? "line-through text-[#706e6b]" : "text-[#080707]"}`}>
                        <Highlight text={tk.title} terms={terms} />
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${statusColor[tk.status]}`}>{t(`tasks.status${tk.status === "in_progress" ? "InProgress" : tk.status === "done" ? "Done" : "Todo"}`)}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${priorityColor[tk.priority]}`}>{t(`tasks.priority${tk.priority.charAt(0).toUpperCase() + tk.priority.slice(1)}`)}</span>
                      {tk.assignee?.full_name && (
                        <span className="ms-auto text-[11px] text-[#706e6b]">{tk.assignee.full_name}</span>
                      )}
                    </div>
                    {tk.description && (
                      <p className="mt-1 text-[12px] text-[#3e3e3c] line-clamp-2" dir="auto">
                        <Highlight text={tk.description} terms={terms} />
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {/* Meeting detail modal (view tasks, edit, request delete) */}
      {selectedSession && (
        <SessionDetailModal
          session={selectedSession}
          token={token}
          onClose={() => setSelectedSession(null)}
          onRequestDelete={(s) => { setSelectedSession(null); setConfirmDelete(s); setDeleteError(null); }}
          onSessionUpdate={(updated) => {
            setAllSessions((prev) => prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)));
            setSelectedSession((prev) => (prev ? { ...prev, ...updated } : prev));
          }}
        />
      )}

      {/* Confirm delete */}
      {confirmDelete && (
        <Modal open onClose={() => !deleting && setConfirmDelete(null)} title={t("meetings.deleteTitle")}>
          <div className="space-y-4">
            <Alert variant="warning">
              {t("meetings.confirmDeleteBody", { title: confirmDelete.title || t("meetings.untitled") })}
            </Alert>
            {deleteError && <Alert variant="error">{deleteError}</Alert>}
            <div className="flex gap-3">
              <Button variant="danger" onClick={handleDelete} loading={deleting}>
                <Trash2 className="w-4 h-4 me-1" />
                {t("common.delete")}
              </Button>
              <Button variant="secondary" onClick={() => setConfirmDelete(null)} disabled={deleting}>
                {t("common.cancel")}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchView />
    </Suspense>
  );
}
