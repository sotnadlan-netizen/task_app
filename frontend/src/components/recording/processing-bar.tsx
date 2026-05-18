"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import gsap from "gsap";

const SVG_W = 180;
const SVG_H = 36;
const CY = SVG_H / 2;
const STEPS = 60;

function buildPath(phase: number, amplitude: number, frequency: number): string {
  let d = `M 0,${CY}`;
  for (let i = 1; i <= STEPS; i++) {
    const x = (i / STEPS) * SVG_W;
    const y = CY + amplitude * Math.sin(frequency * Math.PI * 2 * (i / STEPS) + phase);
    d += ` L ${x.toFixed(1)},${y.toFixed(1)}`;
  }
  return d;
}

export function ProcessingBar() {
  const pathRef = useRef<SVGPathElement>(null);
  const stateRef = useRef({ phase: 0, amplitude: 9, frequency: 2.4 });

  useEffect(() => {
    const s = stateRef.current;
    const tick = () => {
      s.phase += 0.025;
      pathRef.current?.setAttribute("d", buildPath(s.phase, s.amplitude, s.frequency));
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);

  return (
    <motion.div
      className="fixed bottom-6 left-6 z-[150] bg-white border border-violet-200/60 rounded-2xl shadow-xl flex items-center gap-4 px-5 py-3"
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      dir="rtl"
    >
      {/* Mini wave */}
      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        preserveAspectRatio="none"
        style={{ width: 110, height: 26, overflow: "visible", flexShrink: 0 }}
      >
        <defs>
          <linearGradient id="pb-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(139,92,246,1)" />
            <stop offset="100%" stopColor="rgba(6,182,212,0.9)" />
          </linearGradient>
          <filter id="pb-glow" x="-20%" y="-100%" width="140%" height="300%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
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
          stroke="url(#pb-grad)"
          strokeWidth="2"
          strokeLinecap="round"
          filter="url(#pb-glow)"
        />
      </svg>

      {/* Text */}
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-semibold text-gray-700">מנתח שיחה</span>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-gray-400">AI מעבד</span>
          <div className="flex gap-0.5">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="w-1 h-1 rounded-full"
                style={{ backgroundColor: i === 2 ? "#06B6D4" : "#8B5CF6" }}
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.2, ease: "easeInOut" }}
              />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
