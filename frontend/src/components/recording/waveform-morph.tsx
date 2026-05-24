"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import gsap from "gsap";
import { useLanguage } from "@/providers/language-provider";

interface Props {
  shouldMorph: boolean;
  onMorphComplete: () => void;
}

const SVG_W = 800;
const SVG_H = 100;
const CY = SVG_H / 2;
const STEPS = 120;

function buildPath(phase: number, amplitude: number, frequency: number): string {
  let d = `M 0,${CY}`;
  for (let i = 1; i <= STEPS; i++) {
    const x = (i / STEPS) * SVG_W;
    const y = CY + amplitude * Math.sin(frequency * Math.PI * 2 * (i / STEPS) + phase);
    d += ` L ${x.toFixed(1)},${y.toFixed(1)}`;
  }
  return d;
}

export function WaveformMorph({ shouldMorph, onMorphComplete }: Props) {
  const { t } = useLanguage();
  const pathRef = useRef<SVGPathElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({ phase: 0, amplitude: 28, frequency: 2.2 });
  const morphedRef = useRef(false);

  // Continuous ticker animation
  useEffect(() => {
    const s = stateRef.current;
    const tick = () => {
      s.phase += 0.022;
      pathRef.current?.setAttribute("d", buildPath(s.phase, s.amplitude, s.frequency));
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);

  // Morph sequence
  useEffect(() => {
    if (!shouldMorph || morphedRef.current) return;
    if (!pathRef.current || !wrapRef.current) return;
    morphedRef.current = true;

    const s = stateRef.current;
    const tl = gsap.timeline({ onComplete: onMorphComplete });

    // Intensify — wave "senses" results are ready
    tl.to(s, { amplitude: 58, frequency: 4.5, duration: 0.42, ease: "power2.in" });

    // Brief flash — peak energy
    tl.to(pathRef.current, { strokeWidth: 3.5, duration: 0.12 }, "-=0.05");

    // Collapse inward — wave dies into silence
    tl.to(s, { amplitude: 0, duration: 0.32, ease: "power3.in" });
    tl.to(pathRef.current, { opacity: 0, duration: 0.28, ease: "power2.in" }, "-=0.22");

    // Entire processing view fades out
    tl.to(wrapRef.current, { opacity: 0, y: -18, duration: 0.28, ease: "power2.inOut" }, "+=0.06");
  }, [shouldMorph, onMorphComplete]);

  return (
    <motion.div
      ref={wrapRef}
      className="flex flex-col items-center w-full gap-10"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      {/* Status label */}
      <p
        className="font-mono text-[11px] tracking-[0.35em] uppercase select-none text-gray-400"
      >
        {t("results.analyzing")}
        <span className="cm-cursor ms-1.5" style={{ color: "#0070d2" }}>▊</span>
      </p>

      {/* SVG wave */}
      <div className="w-full max-w-2xl px-8">
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          preserveAspectRatio="none"
          className="w-full"
          style={{ height: 72, overflow: "visible" }}
        >
          <defs>
            <linearGradient id="cm-wave-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="rgba(0,112,210,1)" />
              <stop offset="50%"  stopColor="rgba(0,112,210,1)" />
              <stop offset="100%" stopColor="rgba(26,185,255,0.9)" />
            </linearGradient>
            <filter id="cm-glow-wave" x="-20%" y="-80%" width="140%" height="260%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path
            ref={pathRef}
            d={`M 0,${CY} L ${SVG_W},${CY}`}
            fill="none"
            stroke="url(#cm-wave-grad)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#cm-glow-wave)"
          />
        </svg>
      </div>

      {/* Pulsing dots */}
      <div className="flex gap-2.5" aria-hidden>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: i === 2 ? "#1ab9ff" : "#0070d2" }}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.28, ease: "easeInOut" }}
          />
        ))}
      </div>
    </motion.div>
  );
}
