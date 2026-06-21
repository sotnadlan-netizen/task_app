"use client";

import { Search, X } from "lucide-react";
import type { Session } from "@/types";
import { useLanguage } from "@/providers/language-provider";
import { activeFilterCount, type EntityFilters } from "@/lib/filters";

interface Props {
  filters: EntityFilters;
  sessions: Session[];
  onChange: (next: EntityFilters) => void;
}

/**
 * Always-visible filter bar above the calendar: free-text name search, a
 * by-meeting dropdown and a date range. Scoped to the calendar only — mirrors
 * the global search feature so a member can find missions fast. Stateless: reads
 * `filters` and emits changes via `onChange`.
 */
export function CalendarFilterBar({ filters, sessions, onChange }: Props) {
  const { t } = useLanguage();
  const count = activeFilterCount(filters);

  const inputCls =
    "px-2.5 py-1.5 rounded border border-[#dddbda] text-[12px] text-[#080707] bg-white focus:outline-none focus:ring-2 focus:ring-[#0070d2]/30 focus:border-transparent";

  return (
    <div className="rounded border border-[#dddbda] bg-white px-3 py-2.5 flex flex-wrap items-center gap-2">
      {/* Name search */}
      <div className="relative flex-1 min-w-[180px]">
        <Search className="w-3.5 h-3.5 absolute start-2.5 top-1/2 -translate-y-1/2 text-[#706e6b]" />
        <input
          value={filters.text}
          onChange={(e) => onChange({ ...filters, text: e.target.value })}
          placeholder={t("filters.searchPlaceholder")}
          aria-label={t("filters.searchByName")}
          className={`w-full ps-8 ${inputCls}`}
        />
      </div>

      {/* By meeting */}
      <select
        value={filters.sessionId}
        onChange={(e) => onChange({ ...filters, sessionId: e.target.value })}
        aria-label={t("filters.meeting")}
        className={`max-w-[200px] ${inputCls}`}
      >
        <option value="">{t("filters.allMeetings")}</option>
        {sessions.map((s) => (
          <option key={s.id} value={s.id}>{s.title || t("meetings.untitled")}</option>
        ))}
      </select>

      {/* Date range */}
      <div className="flex items-center gap-1.5">
        <input
          type="date"
          value={filters.dateFrom}
          onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })}
          aria-label={t("filters.dateFrom")}
          className={inputCls}
        />
        <span className="text-[11px] text-[#706e6b]">–</span>
        <input
          type="date"
          value={filters.dateTo}
          onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
          aria-label={t("filters.dateTo")}
          className={inputCls}
        />
      </div>

      {count > 0 && (
        <button
          type="button"
          onClick={() => onChange({ ...filters, text: "", sessionId: "", dateFrom: "", dateTo: "" })}
          className="flex items-center gap-1 px-2 py-1.5 rounded text-[12px] font-medium text-[#0070d2] hover:bg-[#ecf5fe] transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          {t("filters.clearAll")}
        </button>
      )}
    </div>
  );
}
