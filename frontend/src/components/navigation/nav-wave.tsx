"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

const SVG_W = 96;
const SVG_H = 22;
const CY = SVG_H / 2;
const STEPS = 48;

function buildPath(phase: number, amplitude: number, frequency: number): string {
  let d = `M 0,${CY}`;
  for (let i = 1; i <= STEPS; i++) {
    const x = (i / STEPS) * SVG_W;
    const y = CY + amplitude * Math.sin(frequency * Math.PI * 2 * (i / STEPS) + phase);
    d += ` L ${x.toFixed(1)},${y.toFixed(1)}`;
  }
  return d;
}

export function NavWave() {
  const pathRef = useRef<SVGPathElement>(null);
  const stateRef = useRef({ phase: 0, amplitude: 3.5, frequency: 2.2 });

  useEffect(() => {
    const s = stateRef.current;
    const tick = () => {
      s.phase += 0.018;
      pathRef.current?.setAttribute("d", buildPath(s.phase, s.amplitude, s.frequency));
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      preserveAspectRatio="none"
      style={{ width: 72, height: 18, overflow: "visible", flexShrink: 0, opacity: 0.55 }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="nav-wave-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(139,92,246,1)" />
          <stop offset="100%" stopColor="rgba(6,182,212,0.85)" />
        </linearGradient>
        <filter id="nav-wave-glow" x="-20%" y="-100%" width="140%" height="300%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
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
        stroke="url(#nav-wave-grad)"
        strokeWidth="1.5"
        strokeLinecap="round"
        filter="url(#nav-wave-glow)"
      />
    </svg>
  );
}
