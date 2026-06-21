"use client";

import { useEffect, useState } from "react";

const QUERY = "(min-width: 1024px)"; // Tailwind `lg`

/**
 * True on `lg`+ viewports. SSR-safe: the server and the first client render both
 * assume desktop (so hydration matches), then an effect corrects to the real
 * viewport on mount and keeps it in sync on resize.
 */
export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const onChange = () => setIsDesktop(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return isDesktop;
}
