"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Task } from "@/types";
import { api } from "@/lib/api";
import { useLanguage } from "@/providers/language-provider";

/**
 * Pointer-based drag-and-drop for scheduling missions on the calendar.
 *
 * The native HTML5 drag API does not fire on touchscreens, so phones could not
 * place missions at all. This provider uses Pointer Events (mouse + touch alike)
 * with a floating preview and `elementFromPoint` hit-testing, so the same drag
 * works everywhere.
 *
 * Drop targets opt in declaratively: any element with `data-cal-day="YYYY-MM-DD"`
 * (drop on a day → 09:00, or keep the mission's existing time) or
 * `data-cal-slot="YYYY-MM-DD-HH"` (drop on an hour). Drag sources call
 * `startDrag(task, e)` from `onPointerDown` and guard their tap handler with
 * `consumeClick()` so a finished drag does not also fire a click.
 */

const DRAG_THRESHOLD = 6; // px of movement before a press becomes a drag
const HIGHLIGHT_CLASS = "cal-drop-active";

interface DndContextValue {
  startDrag: (task: Task, e: React.PointerEvent) => void;
  /** Returns true (once) if the last pointer interaction was a drag, so the
   *  source can skip its tap/click handler. */
  consumeClick: () => boolean;
}

const CalendarDndContext = createContext<DndContextValue | null>(null);

export function useCalendarDnd(): DndContextValue {
  const ctx = useContext(CalendarDndContext);
  if (!ctx) throw new Error("useCalendarDnd must be used within CalendarDndProvider");
  return ctx;
}

/** Resolve a drop target's data attributes + the dragged task into a Date. */
function resolveTarget(task: Task, el: Element | null): Date | null {
  if (!el) return null;
  const slot = el.getAttribute("data-cal-slot");
  if (slot) {
    const cut = slot.lastIndexOf("-");
    const ymd = slot.slice(0, cut);
    const hour = Number(slot.slice(cut + 1));
    const d = new Date(`${ymd}T00:00:00`);
    d.setHours(hour, 0, 0, 0);
    return isNaN(d.getTime()) ? null : d;
  }
  const day = el.getAttribute("data-cal-day");
  if (day) {
    const d = new Date(`${day}T00:00:00`);
    if (task.scheduled_at) {
      const o = new Date(task.scheduled_at);
      d.setHours(o.getHours(), o.getMinutes(), 0, 0);
    } else {
      d.setHours(9, 0, 0, 0);
    }
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

interface ProviderProps {
  token: string;
  onTaskUpdate: (t: Task) => void;
  children: React.ReactNode;
}

export function CalendarDndProvider({ token, onTaskUpdate, children }: ProviderProps) {
  const { t } = useLanguage();
  const [ghost, setGhost] = useState<{ task: Task; x: number; y: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const drag = useRef<{ task: Task; startX: number; startY: number; active: boolean; el: Element | null } | null>(null);
  const suppressClick = useRef(false);
  const moveRef = useRef<(e: PointerEvent) => void>(() => {});
  const upRef = useRef<(e: PointerEvent) => void>(() => {});

  const clearHighlight = () => {
    if (drag.current?.el) drag.current.el.classList.remove(HIGHLIGHT_CLASS);
  };

  const schedule = useCallback(async (task: Task, target: Date) => {
    const iso = target.toISOString();
    onTaskUpdate({ ...task, scheduled_at: iso });
    try {
      const updated = (await api.updateTask(task.id, { scheduled_at: iso }, token)) as Task;
      onTaskUpdate({ ...task, ...updated, scheduled_at: iso });
    } catch (err) {
      onTaskUpdate({ ...task, scheduled_at: task.scheduled_at });
      setError(err instanceof Error ? err.message : t("schedule.errUpdate"));
      setTimeout(() => setError(null), 3500);
    }
  }, [onTaskUpdate, token, t]);

  const onMove = useCallback((e: PointerEvent) => {
    const s = drag.current;
    if (!s) return;
    const dx = e.clientX - s.startX;
    const dy = e.clientY - s.startY;
    if (!s.active && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    s.active = true;
    e.preventDefault(); // stop touch scrolling once we're dragging
    setGhost({ task: s.task, x: e.clientX, y: e.clientY });
    const hit = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-cal-day],[data-cal-slot]") ?? null;
    if (hit !== s.el) {
      clearHighlight();
      s.el = hit;
      if (hit) hit.classList.add(HIGHLIGHT_CLASS);
    }
  }, []);

  const onUp = useCallback(() => {
    const s = drag.current;
    window.removeEventListener("pointermove", moveRef.current);
    window.removeEventListener("pointerup", upRef.current);
    window.removeEventListener("pointercancel", upRef.current);
    setGhost(null);
    if (s) {
      const el = s.el;
      clearHighlight();
      if (s.active) {
        suppressClick.current = true;
        setTimeout(() => { suppressClick.current = false; }, 60);
        const target = resolveTarget(s.task, el);
        if (target) schedule(s.task, target);
      }
    }
    drag.current = null;
  }, [schedule]);

  // Keep latest handlers in refs so add/removeEventListener always match.
  useEffect(() => {
    moveRef.current = onMove;
    upRef.current = onUp;
  });

  const startDrag = useCallback((task: Task, e: React.PointerEvent) => {
    drag.current = { task, startX: e.clientX, startY: e.clientY, active: false, el: null };
    window.addEventListener("pointermove", moveRef.current, { passive: false });
    window.addEventListener("pointerup", upRef.current);
    window.addEventListener("pointercancel", upRef.current);
  }, []);

  const consumeClick = useCallback(() => {
    if (suppressClick.current) { suppressClick.current = false; return true; }
    return false;
  }, []);

  useEffect(() => () => {
    window.removeEventListener("pointermove", moveRef.current);
    window.removeEventListener("pointerup", upRef.current);
    window.removeEventListener("pointercancel", upRef.current);
  }, []);

  return (
    <CalendarDndContext.Provider value={{ startDrag, consumeClick }}>
      {children}
      {typeof document !== "undefined" && ghost && createPortal(
        <div
          style={{ position: "fixed", left: ghost.x, top: ghost.y, transform: "translate(-50%, -120%)", pointerEvents: "none", zIndex: 9999 }}
          className="max-w-[200px] truncate rounded-lg border border-[#0070d2] bg-white px-3 py-2 text-[12px] font-medium text-[#0070d2] shadow-lg"
        >
          ✓ {ghost.task.title}
        </div>,
        document.body
      )}
      {typeof document !== "undefined" && error && createPortal(
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] rounded-lg bg-[#c23934] px-4 py-2 text-[12px] font-medium text-white shadow-lg">
          {error}
        </div>,
        document.body
      )}
    </CalendarDndContext.Provider>
  );
}
