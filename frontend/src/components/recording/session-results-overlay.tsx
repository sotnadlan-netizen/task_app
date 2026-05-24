"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { WaveformMorph } from "./waveform-morph";
import { BentoGrid } from "./bento-grid";
import { useLanguage } from "@/providers/language-provider";
import type { Session, Task } from "@/types";

type Phase = "processing" | "morphing" | "revealed";

interface Props {
  /** While null, the overlay stays in "processing" state */
  session: Session | null;
  tasks: Task[];
  onClose: () => void;
}

export function SessionResultsOverlay({ session, tasks, onClose }: Props) {
  const { t } = useLanguage();
  const [phase, setPhase] = useState<Phase>("processing");
  const prevSessionRef = useRef<string | null>(null);

  useEffect(() => {
    if (!session) return;
    if (prevSessionRef.current === session.id) return;
    prevSessionRef.current = session.id;
    setPhase("morphing");
  }, [session]);

  const handleMorphComplete = useCallback(() => {
    setPhase("revealed");
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        key="overlay"
        className="fixed inset-0 z-[200] flex flex-col"
        style={{ background: "var(--background)", color: "var(--foreground)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35 }}
        role="dialog"
        aria-modal="true"
        aria-label={t("results.dialogLabel")}
      >
        {/* ── Top bar ── */}
        <div className="flex items-center justify-between px-10 py-4 border-b border-[#dddbda] flex-shrink-0">
          {/* Close — right side in RTL */}
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-sm text-gray-400 transition-opacity hover:opacity-70 focus:outline-none focus:ring-1 focus:ring-[#0070d2] focus:ring-offset-2"
            aria-label={t("results.closeEsc")}
          >
            <X className="w-4 h-4" />
            <span className="font-mono text-[10px] tracking-wider">ESC</span>
          </button>

          {/* Session title */}
          <AnimatePresence>
            {session && (
              <motion.p
                key="session-title"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
                className="font-sans text-sm font-medium truncate max-w-[40vw] text-center text-gray-700"
              >
                {session.title}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Logo mark — left side in RTL */}
          <div className="flex items-center gap-3">
            <span className="font-sans text-[11px] font-medium text-gray-400">
              {t("results.analysis")}
            </span>
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: "#0070d2", boxShadow: "0 0 10px rgba(0,112,210,0.5)" }}
            />
          </div>
        </div>

        {/* ── Main content area ── */}
        <div className="flex-1 flex flex-col items-center justify-center overflow-hidden px-10 py-6">

          {/* Processing / Morphing phase */}
          <AnimatePresence>
            {(phase === "processing" || phase === "morphing") && (
              <motion.div
                key="processing"
                className="w-full"
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <WaveformMorph
                  shouldMorph={phase === "morphing"}
                  onMorphComplete={handleMorphComplete}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Revealed phase — Professional Grid */}
          <AnimatePresence>
            {phase === "revealed" && session && (
              <motion.div
                key="bento"
                className="w-full max-w-3xl overflow-y-auto"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                style={{ maxHeight: "calc(100vh - 140px)" }}
              >
                <BentoGrid session={session} tasks={tasks} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Bottom status bar ── */}
        <div className="flex items-center justify-between px-10 py-3 border-t border-[#dddbda] flex-shrink-0">
          <AnimatePresence>
            {session && phase === "revealed" && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                className="font-mono text-[10px] tracking-wider text-gray-400"
              >
                {session.id.slice(0, 8).toUpperCase()}
              </motion.span>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {phase !== "revealed" ? (
              <motion.span
                key="proc-status"
                className="font-sans text-xs font-medium text-gray-400"
                exit={{ opacity: 0 }}
              >
                {t("results.processing")}
              </motion.span>
            ) : (
              <motion.span
                key="done-status"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-sans text-xs font-medium"
                style={{ color: "#0070d2" }}
              >
                {t("results.done")}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
