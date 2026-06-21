import type { Session, Task } from "@/types";

/**
 * Shared filter state for meetings (sessions) and tasks, used by the side
 * FiltersPanel and applied across the meetings list, task list and calendar.
 *
 * - `text`       "" = no free-text filter; matches name/body (see matchers below)
 * - `sessionId`  "" = any meeting; otherwise the task's / the meeting's id must match
 * - `projectId`  "" = all projects
 * - `personIds`  empty = anyone; for sessions matches participants, for tasks the assignee
 * - `status`     "" = any (task status only — todo | in_progress | done)
 * - `dateFrom` / `dateTo`  "" = open-ended (inclusive, YYYY-MM-DD, compared on the date portion)
 */
export interface EntityFilters {
  text: string;
  sessionId: string;
  projectId: string;
  personIds: string[];
  status: string;
  dateFrom: string;
  dateTo: string;
}

export function emptyFilters(): EntityFilters {
  return { text: "", sessionId: "", projectId: "", personIds: [], status: "", dateFrom: "", dateTo: "" };
}

/** Number of active filter dimensions — drives the "Filters (n)" badge. */
export function activeFilterCount(f: EntityFilters): number {
  let n = 0;
  if (f.text.trim()) n++;
  if (f.sessionId) n++;
  if (f.projectId) n++;
  if (f.personIds.length) n++;
  if (f.status) n++;
  if (f.dateFrom || f.dateTo) n++;
  return n;
}

/** Case-insensitive substring match of every search term against a haystack. */
function matchesText(haystack: string, query: string): boolean {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const hay = haystack.toLowerCase();
  return terms.every((term) => hay.includes(term));
}

/** Local YYYY-MM-DD for an ISO timestamp (matches calendar's local-day logic). */
function isoToLocalDay(iso: string): string {
  return new Date(iso).toLocaleDateString("sv-SE");
}

function inDateRange(iso: string | null | undefined, from: string, to: string): boolean {
  if (!from && !to) return true;
  if (!iso) return false;
  const day = isoToLocalDay(iso);
  if (from && day < from) return false;
  if (to && day > to) return false;
  return true;
}

export function sessionMatchesFilters(s: Session, f: EntityFilters): boolean {
  // By-meeting: keep the chosen meeting itself visible.
  if (f.sessionId && s.id !== f.sessionId) return false;
  if (f.text.trim() && !matchesText(`${s.title || ""} ${s.summary || ""}`, f.text)) return false;
  if (f.projectId && s.project_id !== f.projectId) return false;
  if (f.personIds.length) {
    const parts = s.participant_ids || [];
    if (!parts.some((id) => f.personIds.includes(id))) return false;
  }
  if (!inDateRange(s.created_at, f.dateFrom, f.dateTo)) return false;
  return true; // status does not apply to meetings
}

export function taskMatchesFilters(t: Task, f: EntityFilters): boolean {
  if (f.sessionId && t.session_id !== f.sessionId) return false;
  if (f.text.trim() && !matchesText(`${t.title || ""} ${t.description || ""} ${t.assignee?.full_name || ""}`, f.text)) return false;
  if (f.projectId && t.project_id !== f.projectId) return false;
  if (f.personIds.length && !(t.assignee_id && f.personIds.includes(t.assignee_id))) return false;
  if (f.status && t.status !== f.status) return false;
  // Tasks are placed on the calendar by scheduled_at; fall back to created_at.
  if (!inDateRange(t.scheduled_at || t.created_at, f.dateFrom, f.dateTo)) return false;
  return true;
}
