"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { useLanguage } from "@/providers/language-provider";
import { Button } from "@/components/ui/button";
import { activeFilterCount, type EntityFilters } from "@/lib/filters";

export interface FilterPerson {
  id: string;
  name: string;
}

/** Trigger button that shows the active-filter count and opens the panel. */
export function FiltersButton({
  filters,
  onClick,
}: {
  filters: EntityFilters;
  onClick: () => void;
}) {
  const { t } = useLanguage();
  const count = activeFilterCount(filters);
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#dddbda] hover:bg-[#fafaf9] text-xs text-[#3e3e3c] transition-colors"
    >
      <SlidersHorizontal className="w-3.5 h-3.5" />
      {t("filters.button")}
      {count > 0 && (
        <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-[#0070d2] text-white text-[10px] font-bold">
          {count}
        </span>
      )}
    </button>
  );
}

interface FiltersPanelProps {
  open: boolean;
  onClose: () => void;
  filters: EntityFilters;
  onChange: (next: EntityFilters) => void;
  /** id -> name. Omit or empty to hide the project filter. */
  projects?: Record<string, string>;
  /** People to filter by. Omit or empty to hide the people filter. */
  people?: FilterPerson[];
  /** Heading for the people section (e.g. Participants vs Assignee). */
  peopleLabel?: string;
  /** Show the task status filter (todo / in_progress / done). */
  showStatus?: boolean;
  /** Show the date-range filter. Defaults to true. */
  showDate?: boolean;
}

/**
 * Reusable slide-in side panel for filtering meetings and tasks. Sits on the
 * trailing edge of the page (right in LTR, left in RTL) over a dimmed backdrop.
 * Stateless — it reads `filters` and emits changes via `onChange`.
 */
export function FiltersPanel({
  open,
  onClose,
  filters,
  onChange,
  projects,
  people,
  peopleLabel,
  showStatus = false,
  showDate = true,
}: FiltersPanelProps) {
  const { t } = useLanguage();

  if (!open) return null;

  const hasProjects = projects && Object.keys(projects).length > 0;
  const hasPeople = people && people.length > 0;

  const togglePerson = (id: string) => {
    const set = filters.personIds.includes(id)
      ? filters.personIds.filter((p) => p !== id)
      : [...filters.personIds, id];
    onChange({ ...filters, personIds: set });
  };

  const statusOptions = [
    { value: "todo", label: t("tasks.statusTodo") },
    { value: "in_progress", label: t("tasks.statusInProgress") },
    { value: "done", label: t("tasks.statusDone") },
  ];

  const selectCls =
    "w-full px-3 py-2 rounded border border-[#dddbda] text-sm text-[#080707] bg-white focus:outline-none focus:ring-2 focus:ring-[#0070d2]/30 focus:border-transparent";
  const sectionLabel =
    "block text-[11px] font-semibold text-[#706e6b] mb-1.5 uppercase tracking-wide";

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} aria-hidden="true" />

      {/* Drawer — trailing side */}
      <aside
        className="absolute top-0 bottom-0 end-0 w-80 max-w-[90vw] bg-white shadow-[0_8px_32px_rgba(0,0,0,0.18)] border-s border-[#dddbda] flex flex-col"
        role="dialog"
        aria-label={t("filters.title")}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#dddbda]">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-[#0070d2]" />
            <h2 className="text-sm font-bold text-[#080707]">{t("filters.title")}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-[#f3f3f3] transition-colors"
            aria-label={t("filters.done")}
          >
            <X className="w-4 h-4 text-[#706e6b]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Project */}
          {hasProjects && (
            <div>
              <label className={sectionLabel}>{t("filters.project")}</label>
              <select
                value={filters.projectId}
                onChange={(e) => onChange({ ...filters, projectId: e.target.value })}
                className={selectCls}
              >
                <option value="">{t("filters.allProjects")}</option>
                {Object.entries(projects!).map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
            </div>
          )}

          {/* People */}
          {hasPeople && (
            <div>
              <label className={sectionLabel}>{peopleLabel || t("filters.participants")}</label>
              <div className="flex flex-wrap gap-2">
                {people!.map((p) => {
                  const isSel = filters.personIds.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => togglePerson(p.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[12px] font-medium border transition-colors ${
                        isSel
                          ? "bg-[#0070d2] text-white border-[#0070d2]"
                          : "bg-white text-[#3e3e3c] border-[#dddbda] hover:border-[#0070d2] hover:text-[#0070d2]"
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded-full flex items-center justify-center font-bold text-[9px] ${
                          isSel ? "bg-white/25 text-white" : "bg-[#ecf5fe] text-[#0070d2]"
                        }`}
                      >
                        {p.name.charAt(0).toUpperCase()}
                      </span>
                      {p.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Status */}
          {showStatus && (
            <div>
              <label className={sectionLabel}>{t("filters.status")}</label>
              <select
                value={filters.status}
                onChange={(e) => onChange({ ...filters, status: e.target.value })}
                className={selectCls}
              >
                <option value="">{t("filters.anyStatus")}</option>
                {statusOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Date range */}
          {showDate && (
            <div>
              <label className={sectionLabel}>{t("filters.dateRange")}</label>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <span className="block text-[10px] text-[#706e6b] mb-1">{t("filters.dateFrom")}</span>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })}
                    className={selectCls}
                  />
                </div>
                <div className="flex-1">
                  <span className="block text-[10px] text-[#706e6b] mb-1">{t("filters.dateTo")}</span>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
                    className={selectCls}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-[#dddbda]">
          <button
            onClick={() => onChange({ projectId: "", personIds: [], status: "", dateFrom: "", dateTo: "" })}
            className="text-xs font-medium text-[#0070d2] hover:underline"
          >
            {t("filters.clearAll")}
          </button>
          <Button size="sm" onClick={onClose}>{t("filters.done")}</Button>
        </div>
      </aside>
    </div>
  );
}
