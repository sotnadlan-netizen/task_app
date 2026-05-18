"use client";

import { useState, useEffect } from "react";
import { useSupabase } from "@/providers/supabase-provider";
import { useOrganization } from "@/providers/organization-provider";
import { SessionResultsOverlay } from "@/components/recording/session-results-overlay";
import { BentoGrid } from "@/components/recording/bento-grid";
import { WaveformMorph } from "@/components/recording/waveform-morph";
import type { Session, Task } from "@/types";

// ── Section wrapper ────────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-5">
      <div className="flex items-center gap-4">
        <span className="font-sans text-xs font-medium text-gray-400">{title}</span>
        <div className="flex-1 h-px bg-violet-200/40" />
      </div>
      {children}
    </section>
  );
}

// ── WaveformMorph demo ─────────────────────────────────────────────────────────
function WaveDemo() {
  const [morphed, setMorphed] = useState(false);
  const [key, setKey] = useState(0);

  const reset = () => {
    setMorphed(false);
    setKey((k) => k + 1);
  };

  return (
    <div className="bg-white border border-violet-200/50 rounded-xl p-8 space-y-8 shadow-sm">
      <div key={key}>
        <WaveformMorph shouldMorph={morphed} onMorphComplete={() => {}} />
      </div>
      <div className="flex gap-3 justify-center">
        <button
          onClick={() => setMorphed(true)}
          disabled={morphed}
          className="font-sans text-sm px-5 py-2.5 rounded-lg transition-all disabled:opacity-30"
          style={{
            border: "1px solid rgba(139,92,246,0.5)",
            color: "#8B5CF6",
            backgroundColor: "rgba(139,92,246,0.08)",
          }}
        >
          הפעל אנימציה
        </button>
        <button
          onClick={reset}
          className="font-sans text-sm px-5 py-2.5 rounded-lg transition-all"
          style={{ border: "1px solid rgba(107,114,128,0.3)", color: "#6b7280" }}
        >
          אפס
        </button>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function DesignPreview6() {
  const { supabase, session: authSession } = useSupabase();
  const { currentOrg } = useOrganization();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [gridSession, setGridSession] = useState<Session | null>(null);
  const [gridTasks, setGridTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);

  const [overlayOpen, setOverlayOpen] = useState(false);
  const [overlaySession, setOverlaySession] = useState<Session | null>(null);
  const [overlayTasks, setOverlayTasks] = useState<Task[]>([]);

  // Fetch session list for the org
  useEffect(() => {
    if (!currentOrg) return;
    supabase
      .from("sessions")
      .select("id, title, created_at, summary, sentiment, duration_seconds, ai_prompt_version, org_id, created_by")
      .eq("org_id", currentOrg.id)
      .order("created_at", { ascending: false })
      .limit(30)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setSessions(data as Session[]);
          setSelectedSessionId(data[0].id);
        }
      });
  }, [supabase, currentOrg]);

  // Fetch tasks whenever the selected session changes
  useEffect(() => {
    if (!selectedSessionId) return;
    const sess = sessions.find((s) => s.id === selectedSessionId);
    if (!sess) return;

    setLoading(true);
    setGridSession(null);
    setGridTasks([]);

    supabase
      .from("tasks")
      .select("*")
      .eq("session_id", selectedSessionId)
      .order("created_at")
      .then(({ data }) => {
        setGridSession(sess);
        setGridTasks((data as Task[]) ?? []);
        setLoading(false);
      });
  }, [selectedSessionId, sessions, supabase]);

  const launchOverlay = () => {
    if (!gridSession) return;
    setOverlaySession(null);
    setOverlayTasks([]);
    setOverlayOpen(true);
    // Small delay to show the processing phase before revealing data
    setTimeout(() => {
      setOverlaySession(gridSession);
      setOverlayTasks(gridTasks);
    }, 1800);
  };

  const noSessions = !loading && sessions.length === 0;

  if (!authSession) return null;

  return (
    <div className="min-h-screen px-8 py-12 space-y-16" dir="rtl">
      {/* Page header */}
      <header className="space-y-2">
        <p className="font-mono text-[10px] tracking-widest uppercase text-gray-400">
          תצוגה מקדימה :: 06
        </p>
        <h1 className="font-sans text-2xl font-black" style={{ color: "#8B5CF6" }}>
          תוצאות שיחה — הדגמת רכיבים
        </h1>
        <p className="text-sm text-gray-500">
          מחובר לנתונים אמיתיים מהמאגר. בחר פגישה להצגה.
        </p>
      </header>

      {/* ── Session selector ── */}
      <Section title="בחירת פגישה">
        <div className="bg-white border border-violet-200/50 rounded-xl p-5 shadow-sm space-y-3">
          {noSessions ? (
            <p className="text-sm text-gray-400 text-center py-4">
              אין פגישות קיימות בארגון זה. הקלט פגישה ראשונה כדי להתחיל.
            </p>
          ) : (
            <>
              <label className="block text-sm font-medium text-gray-700">פגישה</label>
              <select
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
                dir="rtl"
              >
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title || "פגישה ללא שם"} — {new Date(s.created_at).toLocaleDateString("he-IL")}
                  </option>
                ))}
              </select>
              {gridSession && (
                <div className="pt-2 space-y-1">
                  <p className="text-xs text-gray-400">
                    {gridTasks.length} משימות · {gridSession.duration_seconds
                      ? `${Math.floor(gridSession.duration_seconds / 60)} דקות`
                      : "משך לא ידוע"}
                  </p>
                  {gridSession.sentiment && (
                    <p className="text-xs text-gray-500 line-clamp-1">{gridSession.sentiment}</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </Section>

      {/* ── Section 1 — WaveformMorph ── */}
      <Section title="01 :: אנימציית גל">
        <WaveDemo />
      </Section>

      {/* ── Section 2 — BentoGrid ── */}
      <Section title="02 :: רשת משימות (לחץ על כרטיס)">
        <div
          className="bg-white border border-violet-200/50 rounded-xl p-6 shadow-sm"
          style={{ minHeight: 420 }}
        >
          {loading && (
            <div className="flex items-center justify-center h-48 text-sm text-gray-400">
              טוען...
            </div>
          )}
          {!loading && gridSession && (
            <BentoGrid session={gridSession} tasks={gridTasks} />
          )}
          {!loading && !gridSession && !noSessions && (
            <div className="flex items-center justify-center h-48 text-sm text-gray-400">
              בחר פגישה למעלה
            </div>
          )}
        </div>
      </Section>

      {/* ── Section 3 — Full Overlay ── */}
      <Section title="03 :: חלון תוצאות מלא">
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={launchOverlay}
            disabled={!gridSession}
            className="font-sans text-sm px-8 py-3 rounded-lg transition-all disabled:opacity-40"
            style={{
              border: "1px solid rgba(139,92,246,0.5)",
              color: "#8B5CF6",
              backgroundColor: "rgba(139,92,246,0.08)",
            }}
          >
            פתח חלון תוצאות ←
          </button>
          <p className="text-xs text-gray-400">
            מציג אנימציית עיבוד לשנייה וחצי, לאחר מכן רשת משימות אמיתית.
          </p>
        </div>
      </Section>

      {/* ── Overlay ── */}
      {overlayOpen && (
        <SessionResultsOverlay
          session={overlaySession}
          tasks={overlayTasks}
          onClose={() => {
            setOverlayOpen(false);
            setOverlaySession(null);
            setOverlayTasks([]);
          }}
        />
      )}
    </div>
  );
}
