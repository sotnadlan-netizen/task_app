"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { useLanguage } from "@/providers/language-provider";

export function ThemeToggle() {
  const { t } = useLanguage();
  const [isDark, setIsDark] = useState(false);

  // Sync initial state from the class set by the inline script in layout
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);

    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? t("common.switchToLight") : t("common.switchToDark")}
      className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
      title={isDark ? t("common.lightMode") : t("common.darkMode")}
    >
      {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
}
