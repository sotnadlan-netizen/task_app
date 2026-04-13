"use client";

import { useState, useEffect, useCallback } from "react";
import { Accessibility, X } from "lucide-react";

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
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<AccessibilitySettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setSettings(JSON.parse(saved));
      }
    } catch {
      // localStorage unavailable
    }
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
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-indigo-600 text-white rounded-full
          shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-300
          flex items-center justify-center transition-all duration-200
          print:hidden"
        aria-label="Toggle accessibility settings"
        title="Accessibility settings (IS 5568)"
      >
        <Accessibility className="w-7 h-7" />
      </button>

      {/* Panel */}
      {open && (
        <div
          className="fixed bottom-24 right-6 z-50 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
          role="dialog"
          aria-label="Accessibility settings"
        >
          <div className="flex items-center justify-between px-4 py-3 bg-indigo-600 text-white">
            <h2 className="font-semibold text-sm">
              Accessibility — IS 5568
            </h2>
            <button
              onClick={() => setOpen(false)}
              className="p-1 hover:bg-indigo-700 rounded"
              aria-label="Close accessibility panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {/* Grayscale */}
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm font-medium text-gray-700">
                Grayscale Mode
              </span>
              <input
                type="checkbox"
                checked={settings.grayscale}
                onChange={(e) => updateSetting("grayscale", e.target.checked)}
                className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
              />
            </label>

            {/* Font Size */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Font Size
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
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors
                      ${settings.fontSize === value
                        ? "bg-indigo-600 text-white"
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
                RTL (Right-to-Left)
              </span>
              <input
                type="checkbox"
                checked={settings.rtl}
                onChange={(e) => updateSetting("rtl", e.target.checked)}
                className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
              />
            </label>

            {/* High Contrast */}
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm font-medium text-gray-700">
                High Contrast
              </span>
              <input
                type="checkbox"
                checked={settings.highContrast}
                onChange={(e) =>
                  updateSetting("highContrast", e.target.checked)
                }
                className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
              />
            </label>

            {/* Reset */}
            <button
              onClick={resetAll}
              className="w-full py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
            >
              Reset to defaults
            </button>
          </div>
        </div>
      )}
    </>
  );
}
