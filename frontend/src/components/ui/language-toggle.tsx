"use client";

import { useLanguage } from "@/providers/language-provider";
import type { Lang } from "@/lib/i18n";

/**
 * Compact EN / עב segmented switch. Pure UI: it only flips the active language
 * (which persists to localStorage via the provider). Per-user persistence to the
 * profile is handled separately by <LanguageSync/>, so this works on logged-out
 * pages (landing) too.
 */
export function LanguageToggle({
  className = "",
  variant = "dark",
}: {
  className?: string;
  /** "dark" = white-on-navy (top nav); "light" = on a light surface (landing). */
  variant?: "dark" | "light";
}) {
  const { lang, setLang, t } = useLanguage();

  const options: { value: Lang; label: string }[] = [
    { value: "en", label: "EN" },
    { value: "he", label: "עב" },
  ];

  const activeClass =
    variant === "dark" ? "bg-white text-[#16325c]" : "bg-[#0070d2] text-white";
  const inactiveClass =
    variant === "dark"
      ? "text-white/80 hover:text-white"
      : "text-[#3e3e3c] hover:text-[#0070d2]";
  const wrapperBg = variant === "dark" ? "bg-white/10" : "bg-[#f3f3f3] border border-[#dddbda]";

  return (
    <div
      role="group"
      aria-label={t("language.label")}
      className={`inline-flex items-center rounded p-0.5 gap-0.5 ${wrapperBg} ${className}`}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => setLang(opt.value)}
          aria-pressed={lang === opt.value}
          aria-label={opt.value === "en" ? t("language.switchToEnglish") : t("language.switchToHebrew")}
          className={`px-2 py-1 text-[11px] font-semibold rounded transition-colors ${
            lang === opt.value ? activeClass : inactiveClass
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
