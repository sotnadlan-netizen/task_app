import type { ReactNode } from "react";
import { ChevronLeft, ChevronsUpDown, TrendingUp, TrendingDown } from "lucide-react";

// ── Page header (breadcrumb + object icon + title + actions) ────────────────────
export function PageHeader({
  icon,
  iconBg = "bg-gradient-to-br from-[#1ab9ff] to-[#0070d2]",
  eyebrow,
  title,
  breadcrumb,
  actions,
}: {
  icon?: ReactNode;
  iconBg?: string;
  eyebrow?: string;
  title: string;
  breadcrumb?: string[];
  actions?: ReactNode;
}) {
  return (
    <div className="bg-white rounded border border-[#dddbda] shadow-[0_2px_2px_rgba(0,0,0,0.05)] px-5 pt-3 pb-3" dir="rtl">
      {breadcrumb && breadcrumb.length > 0 && (
        <div className="flex items-center gap-1.5 text-[11px] text-[#706e6b] mb-2">
          {breadcrumb.map((b, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <ChevronLeft className="w-3 h-3" />}
              <span className={i === breadcrumb.length - 1 ? "text-[#080707] font-semibold" : ""}>{b}</span>
            </span>
          ))}
        </div>
      )}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {icon && (
            <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}>
              {icon}
            </div>
          )}
          <div className="min-w-0">
            {eyebrow && <p className="text-[11px] uppercase tracking-wide text-[#706e6b] font-semibold">{eyebrow}</p>}
            <h1 className="text-[20px] font-bold text-[#080707] leading-tight truncate">{title}</h1>
          </div>
        </div>
        {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
      </div>
    </div>
  );
}

// ── KPI tile ────────────────────────────────────────────────────────────────────
export function KpiTile({
  label,
  value,
  suffix,
  trend,
  trendUp,
  icon,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  trend?: string;
  trendUp?: boolean;
  icon?: ReactNode;
}) {
  return (
    <div className="bg-white rounded border border-[#dddbda] shadow-[0_2px_2px_rgba(0,0,0,0.05)] p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] uppercase tracking-wide font-semibold text-[#706e6b]">{label}</p>
        {icon && <div className="w-8 h-8 rounded bg-[#ecf5fe] text-[#0070d2] flex items-center justify-center">{icon}</div>}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-[28px] font-bold text-[#080707] leading-none">{value}</span>
        {suffix && <span className="text-[12px] text-[#706e6b]">{suffix}</span>}
      </div>
      {trend && (
        <div className={`flex items-center gap-1 mt-2 text-[11px] font-semibold ${trendUp ? "text-[#04844b]" : "text-[#706e6b]"}`}>
          {trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          <span>{trend}</span>
        </div>
      )}
    </div>
  );
}

// ── Card + header ───────────────────────────────────────────────────────────────
export function SfCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded border border-[#dddbda] shadow-[0_2px_2px_rgba(0,0,0,0.05)] ${className}`}>
      {children}
    </div>
  );
}

export function SfCardHeader({
  icon,
  iconBg = "bg-[#0070d2]",
  title,
  sub,
  children,
}: {
  icon?: ReactNode;
  iconBg?: string;
  title: string;
  sub?: string;
  children?: ReactNode;
}) {
  return (
    <div className="border-b border-[#dddbda] px-4 py-2.5 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2.5 min-w-0">
        {icon && <div className={`w-7 h-7 rounded ${iconBg} flex items-center justify-center flex-shrink-0`}>{icon}</div>}
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-[#080707] truncate">{title}</p>
          {sub && <p className="text-[11px] text-[#706e6b] truncate">{sub}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

// ── List view table helpers ─────────────────────────────────────────────────────
export function Th({
  children,
  sortable,
  width,
  align = "right",
}: {
  children?: ReactNode;
  sortable?: boolean;
  width?: string;
  align?: "right" | "center" | "left";
}) {
  const justify = align === "center" ? "justify-center" : align === "left" ? "justify-start" : "justify-end";
  return (
    <th className={`px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-${align} ${width || ""}`}>
      <div className={`flex items-center gap-1 ${justify}`}>
        {children}
        {sortable && <ChevronsUpDown className="w-3 h-3 text-[#706e6b]" />}
      </div>
    </th>
  );
}

export function Td({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return <td className={`px-3 py-2.5 ${className}`}>{children}</td>;
}

// ── Status / priority pills ─────────────────────────────────────────────────────
const STATUS_PILL: Record<string, string> = {
  todo: "bg-[#dddbda] text-[#3e3e3c]",
  in_progress: "bg-[#0070d2] text-white",
  done: "bg-[#04844b] text-white",
};
const STATUS_LABEL: Record<string, string> = { todo: "לביצוע", in_progress: "בתהליך", done: "הושלם" };

export function StatusPill({ status }: { status: string }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${STATUS_PILL[status] ?? STATUS_PILL.todo}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

const PRIORITY_PILL: Record<string, string> = {
  critical: "bg-[#ba0517] text-white",
  high: "bg-[#ea001e] text-white",
  medium: "bg-[#fe9339] text-white",
  low: "bg-[#0070d2] text-white",
};
const PRIORITY_LABEL: Record<string, string> = { low: "נמוכה", medium: "בינונית", high: "גבוהה", critical: "קריטית" };

export function PriorityPill({ priority }: { priority: string }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${PRIORITY_PILL[priority] ?? PRIORITY_PILL.low}`}>
      {PRIORITY_LABEL[priority] ?? priority}
    </span>
  );
}

// ── Sentiment bar ───────────────────────────────────────────────────────────────
export function SentimentBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = value >= 0.7 ? "bg-[#04844b]" : value >= 0.5 ? "bg-[#fe9339]" : "bg-[#c23934]";
  return (
    <div className="inline-flex items-center gap-1.5">
      <div className="w-16 h-1.5 rounded-full bg-[#dddbda] overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-mono text-[#3e3e3c]">{value.toFixed(2)}</span>
    </div>
  );
}

// ── Lightning button (for use in pages outside the Button primitive) ────────────
export function SfButton({
  children,
  variant = "primary",
  small,
  className = "",
  ...props
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger";
  small?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const size = small ? "px-2 py-1 text-[11px]" : "px-3 py-1.5 text-[13px]";
  const styles =
    variant === "primary"
      ? "bg-[#0070d2] text-white border border-[#0070d2] hover:bg-[#005fb2]"
      : variant === "danger"
        ? "bg-[#c23934] text-white border border-[#c23934] hover:bg-[#a61a14]"
        : "bg-white text-[#0070d2] border border-[#dddbda] hover:bg-[#f4f6f9]";
  return (
    <button className={`rounded font-semibold transition-colors inline-flex items-center gap-1.5 ${size} ${styles} ${className}`} {...props}>
      {children}
    </button>
  );
}
