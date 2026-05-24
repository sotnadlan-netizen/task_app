"use client";

import { useState, useEffect, useCallback } from "react";
import { Accessibility, X } from "lucide-react";
import { useLanguage } from "@/providers/language-provider";

interface AccessibilitySettings {
  grayscale: boolean;
  fontSize: number; // multiplier: 1, 1.25, 1.5
  rtl: boolean;
  highContrast: boolean;
}

const DEFAULT_SETTINGS: AccessibilitySettings = {
  grayscale: false,
  fontSize: 1,
  rtl: false,
  highContrast: false,
};

const STORAGE_KEY = "a11y-settings";

export function AccessibilityWidget() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<AccessibilitySettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    // Direction is owned by the language toggle; seed the RTL control from the
    // live document direction so a previously-saved value can't override the
    // user's chosen language on load. The checkbox still works as a manual override.
    const liveRtl = document.documentElement.dir === "rtl";
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setSettings({ ...JSON.parse(saved), rtl: liveRtl });
        return;
      }
    } catch {
      // localStorage unavailable
    }
    setSettings((prev) => ({ ...prev, rtl: liveRtl }));
  }, []);

  const applySettings = useCallback((s: AccessibilitySettings) => {
    const root = document.documentElement;

    root.style.filter = s.grayscale ? "grayscale(100%)" : "";
    root.style.fontSize = `${s.fontSize * 100}%`;
    root.dir = s.rtl ? "rtl" : "ltr";

    if (s.highContrast) {
      root.classList.add("high-contrast");
    } else {
      root.classList.remove("high-contrast");
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch {
      // localStorage unavailable
    }
  }, []);

  useEffect(() => {
    applySettings(settings);
  }, [settings, applySettings]);

  const updateSetting = <K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const resetAll = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  return (
    <>
      {/* Floating Trigger — IS 5568 compliant: high-visibility, persistent */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 end-6 z-50 w-14 h-14 bg-[#0070d2] text-white rounded-full
          shadow-lg hover:bg-[#005fb2] focus:outline-none focus:ring-4 focus:ring-[#1ab9ff]
          flex items-center justify-center transition-all duration-200
          print:hidden"
        aria-label={t("accessibility.toggle")}
        title={t("accessibility.settings")}
      >
        <Accessibility className="w-7 h-7" />
      </button>

      {/* Panel */}
      {open && (
        <div
          className="fixed bottom-24 end-6 z-50 w-80 bg-white rounded-lg shadow-2xl border border-[#dddbda] overflow-hidden"
          role="dialog"
          aria-label={t("accessibility.settings")}
        >
          <div className="flex items-center justify-between px-4 py-3 bg-[#16325c] text-white">
            <h2 className="font-semibold text-sm">
              {t("accessibility.title")}
            </h2>
            <button
              onClick={() => setOpen(false)}
              className="p-1 hover:bg-white/10 rounded"
              aria-label={t("accessibility.closePanel")}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {/* Grayscale */}
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm font-medium text-gray-700">
                {t("accessibility.grayscale")}
              </span>
              <input
                type="checkbox"
                checked={settings.grayscale}
                onChange={(e) => updateSetting("grayscale", e.target.checked)}
                className="w-5 h-5 text-[#0070d2] rounded focus:ring-[#0070d2]"
              />
            </label>

            {/* Font Size */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                {t("accessibility.fontSize")}
              </label>
              <div className="flex gap-2">
                {[
                  { label: "A", value: 1 },
                  { label: "A+", value: 1.25 },
                  { label: "A++", value: 1.5 },
                ].map(({ label, value }) => (
                  <button
                    key={value}
                    onClick={() => updateSetting("fontSize", value)}
                    className={`flex-1 py-2 rounded text-sm font-semibold transition-colors
                      ${settings.fontSize === value
                        ? "bg-[#0070d2] text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    aria-pressed={settings.fontSize === value}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* RTL */}
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm font-medium text-gray-700">
                {t("accessibility.rtl")}
              </span>
              <input
                type="checkbox"
                checked={settings.rtl}
                onChange={(e) => updateSetting("rtl", e.target.checked)}
                className="w-5 h-5 text-[#0070d2] rounded focus:ring-[#0070d2]"
              />
            </label>

            {/* High Contrast */}
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm font-medium text-gray-700">
                {t("accessibility.highContrast")}
              </span>
              <input
                type="checkbox"
                checked={settings.highContrast}
                onChange={(e) =>
                  updateSetting("highContrast", e.target.checked)
                }
                className="w-5 h-5 text-[#0070d2] rounded focus:ring-[#0070d2]"
              />
            </label>

            {/* Reset */}
            <button
              onClick={resetAll}
              className="w-full py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
            >
              {t("accessibility.reset")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
