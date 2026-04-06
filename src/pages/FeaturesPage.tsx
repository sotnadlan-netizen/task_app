import {
  Activity,
  Accessibility,
  BarChart2,
  Bell,
  Bot,
  CalendarDays,
  Command,
  Download,
  Globe,
  HelpCircle,
  Layers,
  ListChecks,
  ListTodo,
  MessageSquare,
  Mic,
  Moon,
  Play,
  ShieldCheck,
  Sparkles,
  UserCircle,
  Users,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Layout } from "@/shared/components/layout/Layout";
import { cn } from "@/core/utils/utils";
import {
  FEATURES_REGISTRY,
  type FeatureEntry,
  type FeatureStatus,
} from "@/config/features_registry";

// ── Icon map ────────────────────────────────────────────────────────────────
const ICON_MAP: Record<string, LucideIcon> = {
  Activity,
  Accessibility,
  BarChart2,
  Bell,
  Bot,
  CalendarDays,
  Command,
  Download,
  Globe,
  HelpCircle,
  Layers,
  ListChecks,
  ListTodo,
  MessageSquare,
  Mic,
  Moon,
  Play,
  ShieldCheck,
  Sparkles,
  UserCircle,
  Users,
  Zap,
};

// ── Status badge config ─────────────────────────────────────────────────────
const STATUS_CONFIG: Record<
  FeatureStatus,
  { labelKey: string; className: string }
> = {
  active: {
    labelKey: "features.status.active",
    className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  },
  new: {
    labelKey: "features.status.new",
    className: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
  },
  beta: {
    labelKey: "features.status.beta",
    className: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  },
  "coming-soon": {
    labelKey: "features.status.comingSoon",
    className: "bg-slate-700/60 text-slate-400 border-slate-600/40",
  },
};

// ── Bento size → grid span classes ─────────────────────────────────────────
const SIZE_CLASS = {
  lg: "col-span-2 row-span-2",
  md: "col-span-2 sm:col-span-1 row-span-1",
  sm: "col-span-1 row-span-1",
};

// ── Feature Card ────────────────────────────────────────────────────────────
function FeatureCard({ feature }: { feature: FeatureEntry }) {
  const { t } = useTranslation();
  const Icon = ICON_MAP[feature.icon] ?? Sparkles;
  const status = STATUS_CONFIG[feature.status];

  return (
    <div
      className={cn(
        "relative flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-5",
        "hover:border-slate-700 hover:bg-slate-800/80 transition-colors duration-200",
        SIZE_CLASS[feature.size]
      )}
    >
      {/* Icon */}
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/20 border border-indigo-600/30">
        <Icon className="h-5 w-5 text-indigo-400" />
      </div>

      {/* Badge */}
      <span
        className={cn(
          "absolute top-4 end-4 inline-flex items-center rounded-full border px-2 py-0.5",
          "text-[10px] font-semibold uppercase tracking-wide",
          status.className
        )}
      >
        {t(status.labelKey)}
      </span>

      {/* Text */}
      <div className="flex-1 space-y-1">
        <h3
          className={cn(
            "text-sm font-semibold text-white leading-snug",
            feature.size === "lg" && "text-base font-bold"
          )}
        >
          {t(feature.titleKey)}
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed font-medium">
          {t(feature.descKey)}
        </p>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function FeaturesPage() {
  const { t } = useTranslation();

  return (
    <Layout
      title={t("features.pageTitle")}
      subtitle={t("features.pageSubtitle")}
    >
      <div className="min-h-[calc(100dvh-8rem)] space-y-8">
        {/* Header */}
        <div className="space-y-1">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-widest">
            {t("features.totalCount", { count: FEATURES_REGISTRY.length })}
          </p>
        </div>

        {/* Bento Grid */}
        <div
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 auto-rows-[minmax(8rem,auto)]"
          aria-label={t("features.pageTitle")}
        >
          {FEATURES_REGISTRY.map((feature) => (
            <FeatureCard key={feature.id} feature={feature} />
          ))}
        </div>
      </div>
    </Layout>
  );
}
